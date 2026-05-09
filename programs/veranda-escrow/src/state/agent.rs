use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum AgentStatus {
    Active,
    Matching,
    Matched,
    Withdrawn,
}

/// Represents a user's anonymous agent in the matching pool.
///
/// **Critical privacy property:** this account is keyed by `agent_wallet`,
/// not by `real_wallet`. Anyone scanning chain state sees only a fresh,
/// random-looking pubkey. The link back to a real user lives only in
/// the [`UserPDA::commitment`] hash, which requires the off-chain
/// preimage to break.
#[account]
#[derive(InitSpace)]
pub struct AgentRegistration {
    /// The agent's signing pubkey (BIP32-derived client-side, never seen by server).
    pub agent_wallet: Pubkey,
    /// Position of the user's commitment leaf in the Light Protocol
    /// compressed merkle tree. Public — does NOT reveal which real wallet.
    pub commitment_leaf_index: u64,
    /// 5-byte bitmap; one byte per scenario for forward compat.
    /// Currently only the low bit of each byte is used.
    pub scenarios: [u8; 5],
    /// Unix timestamp (seconds).
    pub registered_at: i64,
    /// Lifecycle.
    pub status: AgentStatus,
    /// PDA bump.
    pub bump: u8,
}

impl AgentRegistration {
    pub const SEED_PREFIX: &'static [u8] = b"agent";

    /// Returns `true` if the bitmap selects between 2 and 4 scenarios (inclusive).
    pub fn scenario_count_valid(scenarios: &[u8; 5]) -> bool {
        let count = scenarios.iter().filter(|&&b| b != 0).count();
        (2..=4).contains(&count)
    }
}
