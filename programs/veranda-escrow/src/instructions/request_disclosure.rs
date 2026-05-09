use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VerandaError;
use crate::state::{
    DisclosureReceipt, EscrowVault, MatchBatch, PlatformTreasury, UserPDA,
};
use crate::DisclosureGranted;

#[derive(Accounts)]
#[instruction(candidate_index: u8)]
pub struct RequestDisclosure<'info> {
    #[account(mut)]
    pub real_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [UserPDA::SEED_PREFIX, real_wallet.key().as_ref()],
        bump = user_pda.bump,
        has_one = real_wallet,
    )]
    pub user_pda: Account<'info, UserPDA>,

    #[account(
        mut,
        seeds = [EscrowVault::SEED_PREFIX, user_pda.key().as_ref()],
        bump = escrow_vault.bump,
        has_one = user_pda,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    /// Round 2 batch — only the final 10 are disclosable.
    #[account(
        seeds = [MatchBatch::SEED_PREFIX, user_pda.key().as_ref(), &[MatchBatch::ROUND_FINAL]],
        bump = match_batch.bump,
        constraint = match_batch.user_pda == user_pda.key() @ VerandaError::CandidateNotInBatch,
        constraint = match_batch.round == MatchBatch::ROUND_FINAL @ VerandaError::CandidateNotInBatch,
    )]
    pub match_batch: Account<'info, MatchBatch>,

    #[account(
        init,
        payer = real_wallet,
        space = 8 + DisclosureReceipt::INIT_SPACE,
        seeds = [
            DisclosureReceipt::SEED_PREFIX,
            user_pda.key().as_ref(),
            &[candidate_index],
        ],
        bump,
    )]
    pub disclosure_receipt: Account<'info, DisclosureReceipt>,

    /// CHECK: agent_wallet pubkey of the candidate. We don't dereference it
    /// on chain — the backend reveals the off-chain profile. The pubkey is
    /// part of the merkle leaf the user proved against `match_batch.merkle_root`.
    pub candidate_agent_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [PlatformTreasury::SEED_PREFIX],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, PlatformTreasury>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = escrow_vault.token_account,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = treasury.vault,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RequestDisclosure>,
    candidate_index: u8,
    merkle_proof: Vec<[u8; 32]>,
) -> Result<()> {
    // ─── Verify candidate is in round-2 batch ────────────────────────────
    //
    // Leaf = sha256(candidate_index || candidate_agent_wallet)
    let leaf = compute_candidate_leaf(
        candidate_index,
        &ctx.accounts.candidate_agent_wallet.key(),
    );
    let computed_root = compute_merkle_root(leaf, candidate_index as u64, &merkle_proof);
    require!(
        computed_root == ctx.accounts.match_batch.merkle_root,
        VerandaError::InvalidMerkleProof
    );

    // ─── Charge user $2 USDC → treasury ──────────────────────────────────
    let price = DisclosureReceipt::PRICE_USDC;
    require!(
        ctx.accounts.escrow_vault.balance >= price,
        VerandaError::InsufficientFunds
    );

    let user_pda_key = ctx.accounts.user_pda.key();
    let escrow_seeds: &[&[u8]] = &[
        EscrowVault::SEED_PREFIX,
        user_pda_key.as_ref(),
        &[ctx.accounts.escrow_vault.bump],
    ];
    let signer_seeds = &[escrow_seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.escrow_vault.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, price)?;

    // ─── Update accounting ───────────────────────────────────────────────
    let escrow_vault = &mut ctx.accounts.escrow_vault;
    escrow_vault.balance = escrow_vault
        .balance
        .checked_sub(price)
        .ok_or(VerandaError::MathOverflow)?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_collected = treasury
        .total_collected
        .checked_add(price)
        .ok_or(VerandaError::MathOverflow)?;

    let user_pda = &mut ctx.accounts.user_pda;
    user_pda.disclosures_purchased = user_pda
        .disclosures_purchased
        .checked_add(1)
        .ok_or(VerandaError::MathOverflow)?;

    // ─── Persist the receipt ─────────────────────────────────────────────
    let now = Clock::get()?.unix_timestamp;
    let receipt = &mut ctx.accounts.disclosure_receipt;
    receipt.user_pda = ctx.accounts.user_pda.key();
    receipt.candidate_index = candidate_index;
    receipt.candidate_agent_wallet = ctx.accounts.candidate_agent_wallet.key();
    receipt.paid = price;
    receipt.paid_at = now;
    receipt.bump = ctx.bumps.disclosure_receipt;

    emit!(DisclosureGranted {
        user_pda: ctx.accounts.user_pda.key(),
        candidate_agent_wallet: ctx.accounts.candidate_agent_wallet.key(),
        paid: price,
    });

    Ok(())
}

fn compute_candidate_leaf(index: u8, agent_wallet: &Pubkey) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update([index]);
    h.update(agent_wallet.as_ref());
    h.finalize().into()
}

/// Standard binary merkle root reconstruction.
/// `index` selects whether each sibling is left or right.
fn compute_merkle_root(
    mut current: [u8; 32],
    mut index: u64,
    proof: &[[u8; 32]],
) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    for sibling in proof {
        let mut h = Sha256::new();
        if index & 1 == 0 {
            h.update(current);
            h.update(sibling);
        } else {
            h.update(sibling);
            h.update(current);
        }
        current = h.finalize().into();
        index >>= 1;
    }
    current
}
