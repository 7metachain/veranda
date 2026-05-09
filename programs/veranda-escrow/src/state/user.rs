use anchor_lang::prelude::*;

/// One per real user. Owned by the user's Privy embedded wallet
/// (`real_wallet`). Holds the Poseidon commitment that anonymously links
/// the real wallet to an off-chain agent wallet, plus pointers into the
/// rest of the protocol's state.
///
/// **Privacy invariant:** `commitment` is the *only* on-chain value that
/// connects the user's real and agent wallets. It is uniformly random from
/// the perspective of any observer who does not know `agent_wallet` and
/// `nonce` — both of which are kept client-side.
#[account]
#[derive(InitSpace)]
pub struct UserPDA {
    /// Owner; signer for `deposit`, `request_disclosure`, etc.
    pub real_wallet: Pubkey,
    /// `poseidon(real_wallet, agent_wallet, nonce)`.
    pub commitment: [u8; 32],
    /// Associated USDC token account funding all platform fees.
    pub escrow_vault: Pubkey,
    /// Sum of all successful `deposit` amounts (USDC base units).
    pub deposited_total: u64,
    /// How many disclosures the user has already paid for in their lifetime.
    pub disclosures_purchased: u32,
    /// Whether the user has revealed their own identity to a counterparty.
    pub revealed: bool,
    /// Unix timestamp (seconds).
    pub created_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl UserPDA {
    pub const SEED_PREFIX: &'static [u8] = b"user";
}
