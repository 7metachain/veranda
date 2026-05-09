//! # veranda-escrow
//!
//! The main on-chain program for Veranda. It owns three things:
//!
//! 1. **User escrow** — a per-user PDA holding the USDC the user deposited
//!    plus accounting metadata (`UserPDA` + an associated USDC token account).
//! 2. **Anonymous agent registration** — a separate PDA keyed by the user's
//!    agent wallet. It carries the user's commitment leaf index in the Light
//!    Protocol compressed merkle tree, but is *never* linked back to the
//!    user's real wallet on chain.
//! 3. **Match batches & disclosures** — once the off-chain matching pipeline
//!    finishes a round, the platform authority commits a merkle root of the
//!    round's selected agents. Users then pay $2 per candidate to learn that
//!    candidate's identity (`request_disclosure` + `reveal_identity`).
//!
//! The privacy story:
//!
//! ```text
//!   real_wallet  ──Privy── (server knows this)
//!        │
//!        │  poseidon(real, agent, nonce)        ← only commitment posted
//!        ▼
//!   commitment  ──Light──► merkle_root  (server cannot derive real_wallet
//!                                        from a leaf in the tree)
//!        ▲
//!        │  zero-knowledge proof of preimage in `register_agent`
//!        │
//!   agent_wallet (signs all on-chain actions during matching)
//! ```

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("kH4G28phYLsi8FsJouSLBUbNhyxDeXVmvVYZ1GuZgUc");

/// Five fixed scenarios. Stored on-chain as a 5-byte bitmap inside
/// [`AgentRegistration::scenarios`]; bit `i` is set iff the user opted into
/// scenario `i`. Users must select 2–4 scenarios.
pub mod scenarios {
    pub const CASUAL_DINING: u8 = 1 << 0;
    pub const WORK_COLLEAGUES: u8 = 1 << 1;
    pub const FAMILY_INTERACTION: u8 = 1 << 2;
    pub const CONFLICT_RESOLUTION: u8 = 1 << 3;
    pub const TRAVEL_COMPANION: u8 = 1 << 4;

    pub const ALL: u8 = CASUAL_DINING
        | WORK_COLLEAGUES
        | FAMILY_INTERACTION
        | CONFLICT_RESOLUTION
        | TRAVEL_COMPANION;
}

#[program]
pub mod veranda_escrow {
    use super::*;

    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        commitment: [u8; 32],
    ) -> Result<()> {
        instructions::initialize_user::handler(ctx, commitment)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        commitment_leaf_index: u64,
        scenarios: [u8; 5],
        merkle_proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::register_agent::handler(
            ctx,
            commitment_leaf_index,
            scenarios,
            merkle_proof,
        )
    }

    pub fn delegate_to_rollup(ctx: Context<DelegateToRollup>) -> Result<()> {
        instructions::delegate_to_rollup::handler(ctx)
    }

    pub fn undelegate_from_rollup(ctx: Context<UndelegateFromRollup>) -> Result<()> {
        instructions::undelegate_from_rollup::handler(ctx)
    }

    pub fn commit_match_batch(
        ctx: Context<CommitMatchBatch>,
        round: u8,
        merkle_root: [u8; 32],
        fee_total: u64,
    ) -> Result<()> {
        instructions::commit_match_batch::handler(ctx, round, merkle_root, fee_total)
    }

    pub fn request_disclosure(
        ctx: Context<RequestDisclosure>,
        candidate_index: u8,
        merkle_proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::request_disclosure::handler(ctx, candidate_index, merkle_proof)
    }

    pub fn reveal_identity(
        ctx: Context<RevealIdentity>,
        nonce: [u8; 32],
        agent_wallet_proof: Vec<u8>,
    ) -> Result<()> {
        instructions::reveal_identity::handler(ctx, nonce, agent_wallet_proof)
    }

    pub fn claim_treasury(ctx: Context<ClaimTreasury>, amount: u64) -> Result<()> {
        instructions::claim_treasury::handler(ctx, amount)
    }
}

// ─── Events ────────────────────────────────────────────────────────────────
//
// The event layout is part of the program's public interface — the backend's
// `services/solana.rs` listener decodes these via Anchor's IDL.

#[event]
pub struct UserInitialized {
    pub user_pda: Pubkey,
    pub commitment: [u8; 32],
}

#[event]
pub struct AgentRegistered {
    pub agent_wallet: Pubkey,
    pub leaf_index: u64,
}

#[event]
pub struct MatchBatchCommitted {
    pub user_pda: Pubkey,
    pub round: u8,
    pub merkle_root: [u8; 32],
}

#[event]
pub struct DisclosureGranted {
    pub user_pda: Pubkey,
    pub candidate_agent_wallet: Pubkey,
    pub paid: u64,
}

#[event]
pub struct IdentityRevealed {
    pub user_pda: Pubkey,
    pub agent_wallet: Pubkey,
}
