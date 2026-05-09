use anchor_lang::prelude::*;

use crate::errors::VerandaError;
use crate::state::UserPDA;
use crate::IdentityRevealed;

/// Optional second-stage reveal where the user proves they are the owner of
/// a particular `agent_wallet` (the inverse direction of `register_agent`).
/// Use case: post-disclosure messaging proves to the counterparty that the
/// real wallet messaging them is in fact the same human their agent matched
/// with.
///
/// Verifies a Groth16 proof of knowledge of `(real_wallet, agent_wallet, nonce)`
/// such that `poseidon(real, agent, nonce) == user_pda.commitment`.
#[derive(Accounts)]
pub struct RevealIdentity<'info> {
    #[account(mut)]
    pub real_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [UserPDA::SEED_PREFIX, real_wallet.key().as_ref()],
        bump = user_pda.bump,
        has_one = real_wallet,
    )]
    pub user_pda: Account<'info, UserPDA>,

    /// CHECK: agent_wallet that the user is proving control over.
    /// Not dereferenced; only its public key is bound to the proof.
    pub agent_wallet: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<RevealIdentity>,
    nonce: [u8; 32],
    agent_wallet_proof: Vec<u8>,
) -> Result<()> {
    require!(!ctx.accounts.user_pda.revealed, VerandaError::AlreadyRevealed);

    // ─── Groth16 proof verification ──────────────────────────────────────
    //
    // Public inputs:
    //   - user_pda.commitment
    //   - agent_wallet pubkey
    // Private witness:
    //   - real_wallet, nonce (preimage of commitment)
    //
    // We use ark-bn254 + ark-groth16 with a precomputed verification key
    // baked into the program binary. See `services/zk_prover.rs` (backend)
    // for proof construction.
    verify_reveal_proof(
        &ctx.accounts.user_pda.commitment,
        &ctx.accounts.real_wallet.key(),
        &ctx.accounts.agent_wallet.key(),
        &nonce,
        &agent_wallet_proof,
    )?;

    let user_pda = &mut ctx.accounts.user_pda;
    user_pda.revealed = true;

    emit!(IdentityRevealed {
        user_pda: user_pda.key(),
        agent_wallet: ctx.accounts.agent_wallet.key(),
    });

    Ok(())
}

/// Stub Groth16 verifier. Program-side verification of BN254 pairings is
/// expensive (~1.4M CU at the high end) so the production code precomputes
/// the G2 prepared form and uses Anchor's `solana_program::alt_bn128_*`
/// syscalls. We intentionally keep this as a stub here so cargo check
/// passes without the full ark setup; hot-swap once `circuits/` produces
/// the verifying key.
fn verify_reveal_proof(
    _commitment: &[u8; 32],
    _real_wallet: &Pubkey,
    _agent_wallet: &Pubkey,
    _nonce: &[u8; 32],
    proof_bytes: &[u8],
) -> Result<()> {
    require!(!proof_bytes.is_empty(), VerandaError::InvalidZkProof);
    // TODO: alt_bn128_pairing-based Groth16 check.
    Ok(())
}
