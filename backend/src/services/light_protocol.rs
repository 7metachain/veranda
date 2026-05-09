//! Light Protocol compressed-account helpers.
//!
//! In production this module:
//!   - Maintains a handle to the Light Protocol RPC (Helius indexer)
//!   - Inserts new commitment leaves into the configured merkle tree
//!   - Generates inclusion proofs for clients to feed into `register_agent`
//!
//! For the scaffold we keep an in-memory append-only log so the demo flow
//! can run without a Helius API key.

use std::sync::atomic::{AtomicU64, Ordering};

use anyhow::Result;

use crate::config::Config;

pub struct LightService {
    next_index: AtomicU64,
    pub rpc_url: String,
}

impl LightService {
    pub fn new(config: &Config) -> Self {
        Self {
            next_index: AtomicU64::new(0),
            rpc_url: config.light_rpc_url.clone(),
        }
    }

    /// Append a commitment to the tree. Returns its leaf index.
    pub async fn insert_commitment_leaf(&self, _commitment_hex: &str) -> Result<u64> {
        // TODO: call Light's stateless.js / Photon RPC `appendLeaf`.
        Ok(self.next_index.fetch_add(1, Ordering::SeqCst))
    }

    /// Fetch a merkle inclusion proof for a previously appended leaf.
    pub async fn get_inclusion_proof(&self, _leaf_index: u64) -> Result<Vec<[u8; 32]>> {
        // TODO: call Light's RPC for the proof.
        Ok(vec![[0u8; 32]; 20])
    }
}
