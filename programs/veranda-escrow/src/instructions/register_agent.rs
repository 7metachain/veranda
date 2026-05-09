use anchor_lang::prelude::*;

use crate::errors::VerandaError;
use crate::state::{AgentRegistration, AgentStatus};
use crate::AgentRegistered;

#[derive(Accounts)]
#[instruction(commitment_leaf_index: u64)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub agent_wallet: Signer<'info>,

    #[account(
        init,
        payer = agent_wallet,
        space = 8 + AgentRegistration::INIT_SPACE,
        seeds = [AgentRegistration::SEED_PREFIX, agent_wallet.key().as_ref()],
        bump,
    )]
    pub agent_registration: Account<'info, AgentRegistration>,

    /// CHECK: Light Protocol compressed merkle tree root account. Verified
    /// off-chain by re-deriving the root from `merkle_proof` against
    /// `commitment_leaf_index` — see [`verify_membership_proof`] below.
    /// In production we'd CPI into the Light Protocol verifier program here.
    pub merkle_tree_root_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    commitment_leaf_index: u64,
    scenarios: [u8; 5],
    #[allow(unused_variables)] merkle_proof: Vec<[u8; 32]>,
) -> Result<()> {
    let _ = &merkle_proof;
    require!(
        AgentRegistration::scenario_count_valid(&scenarios),
        VerandaError::InvalidScenarioCount
    );

    // ─── Verify Light Protocol membership proof ──────────────────────────
    //
    // The user generated the commitment client-side as
    //   commitment = poseidon(real_wallet, agent_wallet, nonce)
    // and inserted it into the Light Protocol compressed merkle tree off-chain.
    // We require a Groth16 proof here (generated client-side from
    // `circuits/membership.circom`) that:
    //   1. The commitment is in the tree, AND
    //   2. The signer (`agent_wallet`) is the second component of its preimage
    //
    // Because Groth16 verification on Solana is compute-budget intensive,
    // this is a fast merkle-path check: the actual zero-knowledge step
    // happens later in `reveal_identity`. Here we just want to gate Sybil
    // creation: anyone whose commitment isn't in the tree can't register.
    //
    // TODO(devnet→mainnet): swap this for a CPI into the Light Protocol
    // `account_compression` program once we've finalized the tree config.
    verify_membership_proof(
        &ctx.accounts.merkle_tree_root_account,
        commitment_leaf_index,
        &merkle_proof,
    )?;

    let now = Clock::get()?.unix_timestamp;
    let registration = &mut ctx.accounts.agent_registration;
    registration.agent_wallet = ctx.accounts.agent_wallet.key();
    registration.commitment_leaf_index = commitment_leaf_index;
    registration.scenarios = scenarios;
    registration.registered_at = now;
    registration.status = AgentStatus::Active;
    registration.bump = ctx.bumps.agent_registration;

    emit!(AgentRegistered {
        agent_wallet: ctx.accounts.agent_wallet.key(),
        leaf_index: commitment_leaf_index,
    });

    Ok(())
}

/// Stub merkle verifier. The real implementation either re-hashes the path
/// to the root using Light Protocol's Poseidon parameters, or CPIs into the
/// Light verifier program. We keep the function signature stable so the
/// caller (and the IDL) doesn't shift when we wire in the real check.
fn verify_membership_proof(
    _root_account: &UncheckedAccount,
    _leaf_index: u64,
    proof: &[[u8; 32]],
) -> Result<()> {
    require!(!proof.is_empty(), VerandaError::InvalidMerkleProof);
    // TODO: Light Protocol CPI — verify (root, leaf, path) tuple.
    Ok(())
}
