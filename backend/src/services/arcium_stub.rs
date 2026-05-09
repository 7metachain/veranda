//! Mock Arcium MPC compatibility scorer.
//!
//! In production, `compute_compatibility` would call into Arcium's MPC
//! network: each user's profile vector is sealed with a per-user key, the
//! computation runs across a quorum of MPC nodes, and the network returns a
//! single revealed score. The user's profile never leaves their device in
//! plaintext.
//!
//! Here we just hash the inputs and scale into the same 0..10000 range the
//! real network would return, so the matching pipeline downstream sees
//! data of the right shape.

use anyhow::Result;
use chrono::{DateTime, Utc};

use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct CompatibilityScore {
    pub value: u16,
    pub computed_at: DateTime<Utc>,
}

#[derive(Default)]
pub struct ArciumStub;

impl ArciumStub {
    /// Mock-load the sealed profile blob for an agent. In the real flow
    /// this would be a ciphertext fetched from Arcium's data layer.
    pub async fn load_profile_blob(&self, agent_wallet: &str) -> Result<Vec<u8>> {
        Ok(agent_wallet.as_bytes().to_vec())
    }

    pub async fn compute_compatibility(
        &self,
        profile_a_blob: &[u8],
        profile_b_blob: &[u8],
        scenario_weights: &[f32; 5],
    ) -> Result<CompatibilityScore> {
        // TODO: replace with Arcium MPC client when integration is built.
        let value = mock_score_from_hashes(profile_a_blob, profile_b_blob, scenario_weights);
        Ok(CompatibilityScore {
            value,
            computed_at: Utc::now(),
        })
    }
}

fn mock_score_from_hashes(a: &[u8], b: &[u8], weights: &[f32; 5]) -> u16 {
    let mut h = Sha256::new();
    h.update(a);
    h.update(b);
    for w in weights {
        h.update(w.to_le_bytes());
    }
    let out = h.finalize();
    let raw = u16::from_be_bytes([out[0], out[1]]);
    // Normalize to 0..10000.
    ((raw as u32 * 10_000) / u16::MAX as u32) as u16
}
