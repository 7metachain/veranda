//! # veranda-rollup
//!
//! The MagicBlock Ephemeral Rollup program. Contains exactly one
//! instruction, `record_match`, which writes a single pairwise compatibility
//! score during a matching round.
//!
//! Why a separate program? Two reasons:
//!
//! 1. **Throughput.** A round evaluates O(n²) pairs for the round-1 funnel
//!    (30k → 100). We want each pair to be a real on-chain transaction so
//!    that off-chain claims about scores are independently verifiable, but
//!    the cost on mainnet would be prohibitive. The ER gives us sub-cent
//!    txs at high TPS, and only the final aggregated merkle root settles
//!    back to mainnet via [`veranda_escrow::commit_match_batch`].
//!
//! 2. **State scoping.** `delegate_to_rollup` on the escrow program flips
//!    ownership of the user's match-state account to this rollup program;
//!    `record_match` mutates it freely; `commit!` + `undelegate!` flip it
//!    back. The escrow program never sees the intermediate state.
//!
//! The x402 fee is collected at the API gateway BEFORE this instruction is
//! invoked, so the on-chain code here doesn't deal with payments — see
//! `backend/src/api/x402_middleware.rs`.

use anchor_lang::prelude::*;

pub mod instructions;
pub use instructions::*;

declare_id!("2RU1h2nvcXK972kwfoAdEwCDpJ5xxH9KDM2h5geEHbLd");

#[program]
pub mod veranda_rollup {
    use super::*;

    pub fn record_match(
        ctx: Context<RecordMatch>,
        agent_a: Pubkey,
        agent_b: Pubkey,
        score: u16,
        round: u8,
    ) -> Result<()> {
        instructions::record_match::handler(ctx, agent_a, agent_b, score, round)
    }
}

#[event]
pub struct MatchRecorded {
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub score: u16,
    pub round: u8,
    pub recorded_at: i64,
}
