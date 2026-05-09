use anchor_lang::prelude::*;

/// Single global treasury. Receives every per-match fee (`$0.01`)
/// and every disclosure fee (`$2.00`). Withdrawn by `claim_treasury`,
/// which is restricted to `authority` (a multisig in production).
#[account]
#[derive(InitSpace)]
pub struct PlatformTreasury {
    /// Multisig authority allowed to call `claim_treasury`.
    pub authority: Pubkey,
    /// USDC token account holding all collected fees.
    pub vault: Pubkey,
    /// Lifetime fees collected (USDC base units).
    pub total_collected: u64,
    /// Lifetime amount withdrawn.
    pub total_withdrawn: u64,
    /// PDA bump.
    pub bump: u8,
}

impl PlatformTreasury {
    pub const SEED_PREFIX: &'static [u8] = b"treasury";
}
