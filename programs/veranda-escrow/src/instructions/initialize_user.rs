use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::{EscrowVault, UserPDA};
use crate::UserInitialized;

#[derive(Accounts)]
#[instruction(commitment: [u8; 32])]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub real_wallet: Signer<'info>,

    #[account(
        init,
        payer = real_wallet,
        space = 8 + UserPDA::INIT_SPACE,
        seeds = [UserPDA::SEED_PREFIX, real_wallet.key().as_ref()],
        bump,
    )]
    pub user_pda: Account<'info, UserPDA>,

    #[account(
        init,
        payer = real_wallet,
        space = 8 + EscrowVault::INIT_SPACE,
        seeds = [EscrowVault::SEED_PREFIX, user_pda.key().as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    pub usdc_mint: Account<'info, Mint>,

    /// USDC ATA owned by the `escrow_vault` PDA. Holds user funds.
    #[account(
        init,
        payer = real_wallet,
        associated_token::mint = usdc_mint,
        associated_token::authority = escrow_vault,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeUser>, commitment: [u8; 32]) -> Result<()> {
    let user_pda = &mut ctx.accounts.user_pda;
    let escrow_vault = &mut ctx.accounts.escrow_vault;
    let now = Clock::get()?.unix_timestamp;

    user_pda.real_wallet = ctx.accounts.real_wallet.key();
    user_pda.commitment = commitment;
    user_pda.escrow_vault = escrow_vault.key();
    user_pda.deposited_total = 0;
    user_pda.disclosures_purchased = 0;
    user_pda.revealed = false;
    user_pda.created_at = now;
    user_pda.bump = ctx.bumps.user_pda;

    escrow_vault.user_pda = user_pda.key();
    escrow_vault.token_account = ctx.accounts.escrow_token_account.key();
    escrow_vault.balance = 0;
    escrow_vault.bump = ctx.bumps.escrow_vault;

    emit!(UserInitialized {
        user_pda: user_pda.key(),
        commitment,
    });

    Ok(())
}
