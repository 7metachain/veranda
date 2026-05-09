use anchor_lang::prelude::*;

/// One per (user, round). The off-chain matching pipeline runs the funnel,
/// computes a merkle root over the selected agents, and the platform
/// authority commits that root here. Once committed, the user can verify
/// candidate inclusion via a merkle proof in `request_disclosure`.
///
/// `round` is `1` for 30k → 100, `2` for 100 → 10.
#[account]
#[derive(InitSpace)]
pub struct MatchBatch {
    /// The user this batch belongs to.
    pub user_pda: Pubkey,
    /// `1` (30k → 100) or `2` (100 → 10).
    pub round: u8,
    /// Merkle root over the round's selected `agent_wallet` pubkeys.
    pub merkle_root: [u8; 32],
    /// Total fees paid (USDC base units) — settled from `EscrowVault` to `Treasury`
    /// in `commit_match_batch`.
    pub fee_total_paid: u64,
    /// Unix timestamp (seconds).
    pub committed_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl MatchBatch {
    pub const SEED_PREFIX: &'static [u8] = b"batch";
    pub const ROUND_FIRST: u8 = 1;
    pub const ROUND_FINAL: u8 = 2;
}

/// Tracks a single disclosure purchase. Lives at PDA
/// `[b"disclosure", user_pda, candidate_index]`.
#[account]
#[derive(InitSpace)]
pub struct DisclosureReceipt {
    pub user_pda: Pubkey,
    pub candidate_index: u8,
    pub candidate_agent_wallet: Pubkey,
    pub paid: u64,
    pub paid_at: i64,
    pub bump: u8,
}

impl DisclosureReceipt {
    pub const SEED_PREFIX: &'static [u8] = b"disclosure";
    /// 2 USDC (6 decimals).
    pub const PRICE_USDC: u64 = 2_000_000;
}
