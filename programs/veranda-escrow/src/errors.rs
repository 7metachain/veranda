use anchor_lang::prelude::*;

#[error_code]
pub enum VerandaError {
    #[msg("Insufficient escrow balance")]
    InsufficientFunds,
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
    #[msg("Invalid Groth16 proof")]
    InvalidZkProof,
    #[msg("Agent not in matching pool")]
    AgentNotRegistered,
    #[msg("Match round already committed")]
    RoundAlreadyCommitted,
    #[msg("Candidate not in approved batch")]
    CandidateNotInBatch,
    #[msg("Disclosure already paid")]
    DisclosureAlreadyPaid,
    #[msg("Unauthorized treasury claim")]
    UnauthorizedTreasury,
    #[msg("Scenario bitmap must select 2-4")]
    InvalidScenarioCount,
    #[msg("Deposit below platform minimum (20 USDC)")]
    DepositBelowMinimum,
    #[msg("Round must be 1 or 2")]
    InvalidRound,
    #[msg("Identity already revealed")]
    AlreadyRevealed,
    #[msg("Math overflow")]
    MathOverflow,
}
