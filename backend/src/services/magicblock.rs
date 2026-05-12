//! MagicBlock Ephemeral Rollups — Solana-compatible JSON-RPC.
//!
//! MagicBlock exposes standard Solana RPC methods on regional HTTPS endpoints
//! (see <https://docs.magicblock.gg/>). This service targets that RPC to send
//! high-frequency `veranda_rollup::record_match` transactions from the
//! platform authority keypair.
//!
//! Delegation (`delegate_to_rollup` / `undelegate_from_rollup`) still requires
//! the ephemeral-rollups delegation program accounts; keep those instructions
//! on-chain stubs until the SDK is re-enabled in the workspace.

use std::sync::Arc;

use anyhow::{Context, Result};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signature};
use solana_sdk::signer::keypair::read_keypair_file;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

use crate::config::Config;

/// Anchor `#[instruction]` layout for `record_match`: discriminator + Borsh args.
/// `sha256("global:record_match")[0..8]`
const RECORD_MATCH_DISCRIMINATOR: [u8; 8] =
    [0x94, 0x29, 0xa3, 0xcb, 0x3a, 0xfb, 0xc0, 0xe4];

pub struct MagicBlockService {
    er_rpc_url: String,
    program_id_rollup: Pubkey,
    recorder: Option<Arc<Keypair>>,
    magicblock_send_enabled: bool,
}

impl MagicBlockService {
    pub fn new(config: &Config) -> Result<Self> {
        let recorder = read_keypair_file(&config.platform_authority_keypair)
            .map(Arc::new)
            .map_err(|e| {
                tracing::warn!(
                    path = %config.platform_authority_keypair,
                    %e,
                    "MagicBlock: could not load PLATFORM_AUTHORITY_KEYPAIR; record_match will be skipped"
                );
                e
            })
            .ok();

        Ok(Self {
            er_rpc_url: config.magicblock_rpc_url.clone(),
            program_id_rollup: config.program_id_rollup,
            recorder,
            magicblock_send_enabled: config.magicblock_send_enabled,
        })
    }

    /// Ping MagicBlock RPC (`getLatestBlockhash`).
    pub async fn check_er_rpc(&self) -> Result<solana_sdk::hash::Hash> {
        let rpc = RpcClient::new_with_commitment(
            self.er_rpc_url.clone(),
            CommitmentConfig::processed(),
        );
        rpc
            .get_latest_blockhash()
            .await
            .map_err(|e| anyhow::anyhow!("MagicBlock RPC {}: {e}", self.er_rpc_url))
    }

    fn build_record_match_ix(
        &self,
        recorder: &Pubkey,
        agent_a: &Pubkey,
        agent_b: &Pubkey,
        score: u16,
        round: u8,
    ) -> Instruction {
        let (log_pda, _bump) = Pubkey::find_program_address(
            &[b"match", agent_a.as_ref(), agent_b.as_ref(), &[round]],
            &self.program_id_rollup,
        );

        let mut data = Vec::with_capacity(8 + 32 + 32 + 2 + 1);
        data.extend_from_slice(&RECORD_MATCH_DISCRIMINATOR);
        data.extend_from_slice(agent_a.as_ref());
        data.extend_from_slice(agent_b.as_ref());
        data.extend_from_slice(&score.to_le_bytes());
        data.push(round);

        Instruction {
            program_id: self.program_id_rollup,
            accounts: vec![
                AccountMeta::new(*recorder, true),
                AccountMeta::new(log_pda, false),
                AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
            ],
            data,
        }
    }

    /// Sends `record_match` to the ER via MagicBlock JSON-RPC (`sendTransaction`).
    pub async fn record_match(
        &self,
        agent_a: &Pubkey,
        agent_b: &Pubkey,
        score: u16,
        round: u8,
    ) -> Result<Signature> {
        if !self.magicblock_send_enabled {
            tracing::debug!("magicblock record_match skipped (MAGICBLOCK_SEND=false)");
            return Ok(Signature::default());
        }
        let Some(recorder) = self.recorder.as_ref() else {
            tracing::debug!("magicblock record_match skipped (no authority keypair)");
            return Ok(Signature::default());
        };

        let rpc = RpcClient::new_with_commitment(
            self.er_rpc_url.clone(),
            CommitmentConfig::processed(),
        );

        let recent_blockhash = rpc
            .get_latest_blockhash()
            .await
            .with_context(|| format!("getLatestBlockhash {}", self.er_rpc_url))?;

        let ix = self.build_record_match_ix(&recorder.pubkey(), agent_a, agent_b, score, round);

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&recorder.pubkey()),
            &[recorder.as_ref()],
            recent_blockhash,
        );

        let sig = rpc
            .send_transaction(&tx)
            .await
            .with_context(|| format!("sendTransaction {}", self.er_rpc_url))?;

        tracing::trace!(%sig, "magicblock record_match sent");
        Ok(sig)
    }

    pub async fn delegate(&self, _user_pda: &Pubkey) -> Result<Signature> {
        tracing::debug!("magicblock delegate: not wired (needs ephemeral-rollups delegation accounts)");
        Ok(Signature::default())
    }

    pub async fn undelegate(&self, _user_pda: &Pubkey) -> Result<Signature> {
        tracing::debug!("magicblock undelegate: not wired (needs ephemeral-rollups delegation accounts)");
        Ok(Signature::default())
    }
}
