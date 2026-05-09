use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VerandaError;
use crate::state::{EscrowVault, UserPDA};

#[derive(Accounts)]
pub struct Deposit<'info> {
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

    pub usdc_mint: Account<'info, Mint>,

    /// User's source USDC account.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = real_wallet,
    )]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    /// Destination — owned by `escrow_vault` PDA.
    #[account(
        mut,
        address = escrow_vault.token_account,
        token::mint = usdc_mint,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Enforce platform minimum on the FIRST deposit only. Subsequent top-ups
    // can be any size (including microtransactions to top up disclosures).
    if ctx.accounts.user_pda.deposited_total == 0 {
        require!(
            amount >= EscrowVault::MIN_INITIAL_DEPOSIT,
            VerandaError::DepositBelowMinimum
        );
    }

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_usdc_ata.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.real_wallet.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    let user_pda = &mut ctx.accounts.user_pda;
    let escrow_vault = &mut ctx.accounts.escrow_vault;

    user_pda.deposited_total = user_pda
        .deposited_total
        .checked_add(amount)
        .ok_or(VerandaError::MathOverflow)?;
    escrow_vault.balance = escrow_vault
        .balance
        .checked_add(amount)
        .ok_or(VerandaError::MathOverflow)?;

    Ok(())
}
