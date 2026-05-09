//! Groth16 proof generation for the membership / reveal circuits.
//!
//! This service runs server-side for tooling/tests; the production frontend
//! generates these proofs in the browser via snarkjs (see `frontend/src/lib/zk.ts`).
//! Sharing the function signatures here keeps both sides honest when
//! debugging proof mismatches.

use anyhow::Result;

#[derive(Debug, Clone)]
pub struct GrothProof(pub Vec<u8>);

#[derive(Default)]
pub struct ZkProverService;

impl ZkProverService {
    pub fn new() -> Self {
        Self
    }

    /// Generate a membership proof for the off-chain matching pipeline
    /// (e.g. when the platform itself needs to prove inclusion of a
    /// candidate during settlement disputes).
    pub fn prove_membership(
        &self,
        _real_wallet: [u8; 32],
        _agent_wallet: [u8; 32],
        _nonce: [u8; 32],
        _leaf_index: u64,
        _path: &[[u8; 32]],
    ) -> Result<GrothProof> {
        // TODO: load circuits/build/membership_final.zkey and call ark-groth16.
        Ok(GrothProof(vec![0u8; 192])) // 64*3 bytes — the canonical Groth16 size
    }

    pub fn prove_reveal(
        &self,
        _real_wallet: [u8; 32],
        _agent_wallet: [u8; 32],
        _nonce: [u8; 32],
        _commitment: [u8; 32],
    ) -> Result<GrothProof> {
        // TODO
        Ok(GrothProof(vec![0u8; 192]))
    }
}
