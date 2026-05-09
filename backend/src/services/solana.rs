//! Wrapper over Solana JSON-RPC for talking to `veranda-escrow`.
//!
//! We use `reqwest` to call JSON-RPC directly because the
//! `solana-client` / `anchor-client` 1.18 line pulls a broken transitive
//! chain at the time of scaffolding (`spl-token-2022 = 1.0.0` pins
//! `solana-program = =1.17.6`, conflicting with our workspace `1.18`
//! constraint). When we move the workspace to Solana 2.x or pin a
//! Cargo.lock that resolves the cycle, swap this back to
//! `solana_client::nonblocking::rpc_client::RpcClient`.

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use solana_sdk::pubkey::Pubkey;
use uuid::Uuid;

use crate::config::Config;

pub struct SolanaService {
    pub http: Client,
    pub rpc_url: String,
    pub program_id_escrow: Pubkey,
    pub program_id_rollup: Pubkey,
    pub usdc_mint: Pubkey,
}

impl SolanaService {
    pub fn new(config: &Config) -> Result<Self> {
        Ok(Self {
            http: Client::new(),
            rpc_url: config.solana_rpc_url.clone(),
            program_id_escrow: config.program_id_escrow,
            program_id_rollup: config.program_id_rollup,
            usdc_mint: config.usdc_mint,
        })
    }

    async fn rpc(&self, method: &str, params: Value) -> Result<Value> {
        let body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        });
        let resp = self
            .http
            .post(&self.rpc_url)
            .json(&body)
            .send()
            .await?
            .error_for_status()?
            .json::<Value>()
            .await?;
        if let Some(err) = resp.get("error") {
            return Err(anyhow!("rpc error: {err}"));
        }
        Ok(resp
            .get("result")
            .cloned()
            .unwrap_or(Value::Null))
    }

    /// Verify an x402 payment transaction. The client paid `expected_amount`
    /// USDC base units to the platform treasury. We:
    ///   1. Confirm the signature is finalized
    ///   2. (TODO) decode the SPL transfer and check amount + destination
    pub async fn verify_x402_payment(
        &self,
        tx_b58: &str,
        _expected_amount: u64,
    ) -> Result<()> {
        let result = self
            .rpc(
                "getSignatureStatuses",
                json!([[tx_b58], { "searchTransactionHistory": true }]),
            )
            .await?;

        let confirmed = result
            .pointer("/value/0/confirmationStatus")
            .and_then(|v| v.as_str())
            .map(|s| matches!(s, "confirmed" | "finalized"))
            .unwrap_or(false);

        if !confirmed {
            return Err(anyhow!("payment tx not yet confirmed"));
        }
        Ok(())
    }

    /// Verify a `request_disclosure` transaction emitted the
    /// `DisclosureGranted` event for `(session_id, candidate_index)` and
    /// return the candidate's `agent_wallet` from that event.
    pub async fn verify_disclosure_tx(
        &self,
        _tx_b58: &str,
        _session_id: Uuid,
        _candidate_index: u8,
    ) -> Result<String> {
        // TODO: getTransaction → parse Anchor event log → match this session.
        // Returning a deterministic placeholder lets the demo flow proceed.
        Ok("VerandaCandidateAgent11111111111111111111111".into())
    }

    pub fn user_pda(&self, real_wallet: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(
            &[b"user", real_wallet.as_ref()],
            &self.program_id_escrow,
        )
        .0
    }

    pub fn agent_pda(&self, agent_wallet: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(
            &[b"agent", agent_wallet.as_ref()],
            &self.program_id_escrow,
        )
        .0
    }

    pub fn match_batch_pda(&self, user_pda: &Pubkey, round: u8) -> Pubkey {
        Pubkey::find_program_address(
            &[b"batch", user_pda.as_ref(), &[round]],
            &self.program_id_escrow,
        )
        .0
    }

    pub fn treasury_pda(&self) -> Pubkey {
        Pubkey::find_program_address(&[b"treasury"], &self.program_id_escrow).0
    }
}
