//! MagicBlock Ephemeral Rollups service wrapper.
//!
//! ## Lifecycle of a matching round
//!
//! ```text
//! ┌─ mainnet ───────────────────────┐
//! │ veranda_escrow::delegate_to_   │     ┌─ ER (MagicBlock) ─────────────┐
//! │  rollup(user_pda)              │ ──► │  user_pda is now ER-owned     │
//! └─────────────────────────────────┘     │                               │
//!                                         │ veranda_rollup::record_match  │
//!                                         │   × ~thousands per round      │
//!                                         │                               │
//! ┌─ mainnet ───────────────────────┐     │                               │
//! │ veranda_escrow::                │ ◄── │  commit + undelegate          │
//! │   commit_match_batch(           │     └───────────────────────────────┘
//! │     round, merkle_root, fee)   │
//! └─────────────────────────────────┘
//! ```
//!
//! Why this dance?
//!
//! - **Cost:** 30k × 99 ≈ 3M pairs in round 1. On mainnet that would burn
//!   $30k+ in priority fees. On the ER each tx is sub-cent.
//! - **Verifiability:** every score is still on-chain, just on the ER. The
//!   final aggregated merkle root commits to every score.
//! - **State scoping:** delegation flips ownership of the user's match-state
//!   account so `record_match` can mutate it without going through the
//!   mainnet runtime. Undelegation flips it back.
//!
//! The `ephemeral-rollups-sdk` crate is currently disabled at the workspace
//! level (its 0.13.x line conflicts with anchor-lang 0.30.1's transitive
//! pinning). This module is wired so the matching pipeline compiles and
//! the public surface is stable; the inner calls are stubs that will swap
//! to the SDK once version conflicts settle.

use anyhow::Result;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signature;

use crate::config::Config;

pub struct MagicBlockService {
    pub er_rpc_url: String,
    pub program_id_rollup: Pubkey,
}

impl MagicBlockService {
    pub fn new(config: &Config) -> Result<Self> {
        Ok(Self {
            er_rpc_url: config.magicblock_rpc_url.clone(),
            program_id_rollup: config.program_id_rollup,
        })
    }

    /// Sends a single `record_match` transaction to the ER.
    /// Returns the signature so callers can attach it to event logs.
    pub async fn record_match(
        &self,
        _agent_a: &Pubkey,
        _agent_b: &Pubkey,
        _score: u16,
        _round: u8,
    ) -> Result<Signature> {
        // TODO: build instruction via anchor-client targeting `er_rpc_url`,
        // sign with platform_authority, send.
        Ok(Signature::default())
    }

    /// Issue the mainnet `delegate_to_rollup` instruction. Wraps
    /// `ephemeral-rollups-sdk` helper that constructs the delegate ix.
    pub async fn delegate(&self, _user_pda: &Pubkey) -> Result<Signature> {
        Ok(Signature::default())
    }

    /// Issue the mainnet `undelegate_from_rollup` (with implicit `commit`).
    pub async fn undelegate(&self, _user_pda: &Pubkey) -> Result<Signature> {
        Ok(Signature::default())
    }
}
