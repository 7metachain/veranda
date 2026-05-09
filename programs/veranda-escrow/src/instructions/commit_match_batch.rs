use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VerandaError;
use crate::state::{EscrowVault, MatchBatch, PlatformTreasury, UserPDA};
use crate::MatchBatchCommitted;

#[derive(Accounts)]
#[instruction(round: u8)]
pub struct CommitMatchBatch<'info> {
    /// Platform multisig — only entity allowed to commit a round.
    #[account(mut)]
    pub platform_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [UserPDA::SEED_PREFIX, user_pda.real_wallet.as_ref()],
        bump = user_pda.bump,
    )]
    pub user_pda: Account<'info, UserPDA>,

    #[account(
        mut,
        seeds = [EscrowVault::SEED_PREFIX, user_pda.key().as_ref()],
        bump = escrow_vault.bump,
        has_one = user_pda,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(
        init,
        payer = platform_authority,
        space = 8 + MatchBatch::INIT_SPACE,
        seeds = [MatchBatch::SEED_PREFIX, user_pda.key().as_ref(), &[round]],
        bump,
    )]
    pub match_batch: Account<'info, MatchBatch>,

    #[account(
        mut,
        seeds = [PlatformTreasury::SEED_PREFIX],
        bump = treasury.bump,
        has_one = authority @ VerandaError::UnauthorizedTreasury,
    )]
    pub treasury: Account<'info, PlatformTreasury>,

    /// CHECK: must equal `treasury.authority`. Constraint above (`has_one`)
    /// already enforces this; we keep this account here so the IDL exposes
    /// the relationship explicitly to clients.
    pub authority: UncheckedAccount<'info>,

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
    ctx: Context<CommitMatchBatch>,
    round: u8,
    merkle_root: [u8; 32],
    fee_total: u64,
) -> Result<()> {
    require!(
        round == MatchBatch::ROUND_FIRST || round == MatchBatch::ROUND_FINAL,
        VerandaError::InvalidRound
    );
    require!(
        ctx.accounts.escrow_vault.balance >= fee_total,
        VerandaError::InsufficientFunds
    );

    // ─── Settle fees: EscrowVault → Treasury ─────────────────────────────
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
    token::transfer(cpi_ctx, fee_total)?;

    let escrow_vault = &mut ctx.accounts.escrow_vault;
    escrow_vault.balance = escrow_vault
        .balance
        .checked_sub(fee_total)
        .ok_or(VerandaError::MathOverflow)?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_collected = treasury
        .total_collected
        .checked_add(fee_total)
        .ok_or(VerandaError::MathOverflow)?;

    // ─── Record the round ────────────────────────────────────────────────
    let now = Clock::get()?.unix_timestamp;
    let batch = &mut ctx.accounts.match_batch;
    batch.user_pda = ctx.accounts.user_pda.key();
    batch.round = round;
    batch.merkle_root = merkle_root;
    batch.fee_total_paid = fee_total;
    batch.committed_at = now;
    batch.bump = ctx.bumps.match_batch;

    emit!(MatchBatchCommitted {
        user_pda: ctx.accounts.user_pda.key(),
        round,
        merkle_root,
    });

    Ok(())
}
