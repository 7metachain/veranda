use anchor_lang::prelude::*;

use crate::state::UserPDA;

/// Delegates the user's matching state to the MagicBlock Ephemeral Rollup
/// validator so that the matching pipeline can write thousands of cheap
/// `record_match` transactions without touching mainnet.
///
/// Pattern (simplified):
///
/// ```text
/// mainnet           ER (MagicBlock)
///  ┌──┐    delegate    ┌──┐
///  │  │ ───────────►  │  │  record_match × N (sub-cent each)
///  │  │                │  │
///  │  │ ◄───────────  │  │  commit
///  └──┘   undelegate   └──┘
/// ```
///
/// In `ephemeral-rollups-sdk` the heavy lifting is done by the
/// `delegate!`/`commit!` macros applied to the user's match-state account.
/// For this scaffold, we keep the instruction signature stable and document
/// where the macro call goes; the actual macro is invoked by the SDK
/// CPI helpers — see `backend/src/services/magicblock.rs` for the full flow.
#[derive(Accounts)]
pub struct DelegateToRollup<'info> {
    #[account(mut)]
    pub real_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [UserPDA::SEED_PREFIX, real_wallet.key().as_ref()],
        bump = user_pda.bump,
        has_one = real_wallet,
    )]
    pub user_pda: Account<'info, UserPDA>,

    /// CHECK: Owner program that the SDK will set as the new authority.
    pub owner_program: UncheckedAccount<'info>,

    /// CHECK: PDA that records that the account is delegated. Maintained by
    /// the ER SDK; we just pass it through.
    pub buffer: UncheckedAccount<'info>,

    /// CHECK: SDK-managed delegation record.
    pub delegation_record: UncheckedAccount<'info>,

    /// CHECK: SDK-managed delegation metadata.
    pub delegation_metadata: UncheckedAccount<'info>,

    /// CHECK: ER program ID (MagicBlock delegation program).
    pub delegation_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<DelegateToRollup>) -> Result<()> {
    // The real call site uses the `delegate!` macro from `ephemeral-rollups-sdk`:
    //
    //     ephemeral_rollups_sdk::cpi::delegate_account(
    //         ctx.accounts.user_pda.to_account_info(),
    //         &[UserPDA::SEED_PREFIX, ctx.accounts.real_wallet.key().as_ref(),
    //           &[ctx.accounts.user_pda.bump]],
    //         &ctx.accounts.owner_program,
    //         &ctx.accounts.buffer,
    //         &ctx.accounts.delegation_record,
    //         &ctx.accounts.delegation_metadata,
    //     )?;
    //
    // We leave it commented out at the scaffolding stage because the SDK
    // version pinned in `Cargo.toml` (0.0.10) is pre-stable and the helper
    // signature is shifting between releases. Wire it up after running
    // `cargo update -p ephemeral-rollups-sdk` and reading the latest README.
    msg!("delegate_to_rollup: TODO wire ephemeral-rollups-sdk delegate! macro");
    Ok(())
}
