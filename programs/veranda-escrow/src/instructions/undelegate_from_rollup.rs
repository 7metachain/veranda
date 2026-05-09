use anchor_lang::prelude::*;

use crate::state::UserPDA;

/// Reverse of [`delegate_to_rollup`]. Pulls the user's match-state account
/// back to mainnet so subsequent reads/writes go through the regular
/// Solana runtime.
#[derive(Accounts)]
pub struct UndelegateFromRollup<'info> {
    #[account(mut)]
    pub real_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [UserPDA::SEED_PREFIX, real_wallet.key().as_ref()],
        bump = user_pda.bump,
        has_one = real_wallet,
    )]
    pub user_pda: Account<'info, UserPDA>,

    /// CHECK: SDK-managed delegation record (passed through).
    pub delegation_record: UncheckedAccount<'info>,

    /// CHECK: SDK-managed buffer.
    pub buffer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<UndelegateFromRollup>) -> Result<()> {
    // Real implementation calls `commit!` then `undelegate!` from
    // `ephemeral-rollups-sdk`. See [`delegate_to_rollup::handler`] for
    // the same caveat about pinned versions.
    msg!("undelegate_from_rollup: TODO wire ephemeral-rollups-sdk commit/undelegate");
    Ok(())
}
