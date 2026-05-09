use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::VerandaError;
use crate::state::PlatformTreasury;

#[derive(Accounts)]
pub struct ClaimTreasury<'info> {
    #[account(mut)]
    pub platform_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PlatformTreasury::SEED_PREFIX],
        bump = treasury.bump,
        has_one = authority @ VerandaError::UnauthorizedTreasury,
    )]
    pub treasury: Account<'info, PlatformTreasury>,

    /// CHECK: enforced by the `has_one` constraint above.
    pub authority: UncheckedAccount<'info>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = treasury.vault,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Destination — any USDC token account controlled by the authority.
    #[account(mut, token::mint = usdc_mint)]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimTreasury>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.platform_authority.key() == ctx.accounts.treasury.authority,
        VerandaError::UnauthorizedTreasury
    );

    let treasury_seeds: &[&[u8]] = &[
        PlatformTreasury::SEED_PREFIX,
        &[ctx.accounts.treasury.bump],
    ];
    let signer_seeds = &[treasury_seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.destination_token_account.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_withdrawn = treasury
        .total_withdrawn
        .checked_add(amount)
        .ok_or(VerandaError::MathOverflow)?;

    Ok(())
}
