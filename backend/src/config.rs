use std::env;

use anyhow::{anyhow, Context, Result};
use solana_sdk::pubkey::Pubkey;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub public_url: String,
    pub database_url: String,

    pub solana_rpc_url: String,
    pub solana_ws_url: String,
    pub solana_cluster: String,
    pub program_id_escrow: Pubkey,
    pub program_id_rollup: Pubkey,
    pub usdc_mint: Pubkey,
    pub platform_authority_keypair: String,

    pub magicblock_rpc_url: String,
    pub magicblock_ws_url: String,
    /// When false, skip sending rollup txs (local dev without funded authority).
    pub magicblock_send_enabled: bool,

    pub light_rpc_url: String,
    pub light_merkle_tree_pubkey: Option<Pubkey>,

    pub privy_app_id: Option<String>,
    pub privy_app_secret: Option<String>,
    pub privy_verification_key: Option<String>,

    pub lifi_api_key: Option<String>,
    pub lifi_integrator: String,

    pub openai_api_key: Option<String>,
    pub openai_model: String,

    pub x402_facilitator_url: String,
    pub x402_treasury_wallet: Option<Pubkey>,
    pub x402_price_match_usdc: u64,
    pub x402_price_disclosure_usdc: u64,

    pub rosbridge_ws_url: String,
    pub ceremony_recording_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            host: env_or_default("BACKEND_HOST", "0.0.0.0"),
            port: env::var("BACKEND_PORT").ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            public_url: env_or_default("BACKEND_PUBLIC_URL", "http://localhost:8080"),
            database_url: env_required("DATABASE_URL")?,

            solana_rpc_url: env_or_default(
                "SOLANA_RPC_URL",
                "https://api.devnet.solana.com",
            ),
            solana_ws_url: env_or_default(
                "SOLANA_WS_URL",
                "wss://api.devnet.solana.com",
            ),
            solana_cluster: env_or_default("SOLANA_CLUSTER", "devnet"),
            program_id_escrow: parse_pubkey(&env_required("PROGRAM_ID_ESCROW")?)?,
            program_id_rollup: parse_pubkey(&env_required("PROGRAM_ID_ROLLUP")?)?,
            usdc_mint: parse_pubkey(&env_required("USDC_MINT_DEVNET")?)?,
            platform_authority_keypair: env_or_default(
                "PLATFORM_AUTHORITY_KEYPAIR",
                "./keys/platform-authority.json",
            ),

            magicblock_rpc_url: env_or_default(
                "MAGICBLOCK_RPC_URL",
                "https://devnet.magicblock.app",
            ),
            magicblock_ws_url: env_or_default(
                "MAGICBLOCK_WS_URL",
                "wss://devnet.magicblock.app",
            ),
            magicblock_send_enabled: env::var("MAGICBLOCK_SEND")
                .map(|v| {
                    matches!(
                        v.to_ascii_lowercase().as_str(),
                        "1" | "true" | "yes" | "on"
                    )
                })
                .unwrap_or(true),

            light_rpc_url: env_or_default("LIGHT_RPC_URL", ""),
            light_merkle_tree_pubkey: env::var("LIGHT_MERKLE_TREE_PUBKEY")
                .ok()
                .filter(|s| !s.is_empty())
                .map(|s| parse_pubkey(&s))
                .transpose()?,

            privy_app_id: env::var("PRIVY_APP_ID").ok(),
            privy_app_secret: env::var("PRIVY_APP_SECRET").ok(),
            privy_verification_key: env::var("PRIVY_VERIFICATION_KEY").ok(),

            lifi_api_key: env::var("LIFI_API_KEY").ok(),
            lifi_integrator: env_or_default("LIFI_INTEGRATOR", "veranda"),

            openai_api_key: env::var("OPENAI_API_KEY").ok(),
            openai_model: env_or_default("OPENAI_MODEL", "gpt-4o-mini"),

            x402_facilitator_url: env_or_default(
                "X402_FACILITATOR_URL",
                "https://x402.org/facilitator",
            ),
            x402_treasury_wallet: env::var("X402_TREASURY_WALLET")
                .ok()
                .filter(|s| !s.is_empty())
                .map(|s| parse_pubkey(&s))
                .transpose()?,
            x402_price_match_usdc: env::var("X402_PRICE_AGENT_MATCH_USDC")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10_000), // 0.01 USDC
            x402_price_disclosure_usdc: env::var("X402_PRICE_DISCLOSURE_USDC")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(2_000_000), // 2.00 USDC

            rosbridge_ws_url: env_or_default("ROSBRIDGE_WS_URL", "ws://localhost:9090"),
            ceremony_recording_path: env_or_default(
                "CEREMONY_RECORDING_PATH",
                "/tmp/match_ceremony.mp4",
            ),
        })
    }
}

fn env_or_default(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_required(key: &str) -> Result<String> {
    env::var(key).with_context(|| format!("missing required env var {key}"))
}

fn parse_pubkey(s: &str) -> Result<Pubkey> {
    s.parse()
        .map_err(|e| anyhow!("invalid pubkey {s:?}: {e}"))
}
