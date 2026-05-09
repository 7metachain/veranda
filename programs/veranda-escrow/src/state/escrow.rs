use anchor_lang::prelude::*;

/// A thin wrapper over the user's USDC associated-token-account.
/// We keep a separate PDA struct (rather than just relying on the ATA) so
/// that we can attach Veranda-specific metadata in future revisions
/// (rate-limits, cooldowns, etc.) without breaking the wire format.
#[account]
#[derive(InitSpace)]
pub struct EscrowVault {
    /// The `UserPDA` that owns this vault.
    pub user_pda: Pubkey,
    /// The actual USDC associated token account.
    pub token_account: Pubkey,
    /// Cached balance (lamports / USDC base units).
    /// We update this on `deposit` / `commit_match_batch` / `request_disclosure`
    /// so that off-chain indexers can sort users without re-fetching the ATA.
    pub balance: u64,
    /// PDA bump.
    pub bump: u8,
}

impl EscrowVault {
    pub const SEED_PREFIX: &'static [u8] = b"vault";
    /// Minimum first-deposit amount: 20 USDC (USDC has 6 decimals).
    pub const MIN_INITIAL_DEPOSIT: u64 = 20_000_000;
}
