//! Privy access-token verification + user lookup for wallet-backed sessions.

use anyhow::{anyhow, Context, Result};
use base64::Engine;
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;

use crate::config::Config;

#[derive(Debug, Deserialize)]
pub struct PrivyAccessClaims {
    pub sub: String,
    pub iss: String,
    pub aud: serde_json::Value,
    pub exp: u64,
}

/// Verify ES256 access token from the Privy React SDK (`getAccessToken()`).
/// `pem` is the verification key from the Privy Dashboard (PEM, may contain `\n` escapes).
pub fn verify_access_token(config: &Config, token: &str) -> Result<PrivyAccessClaims> {
    let pem = config
        .privy_verification_key
        .as_ref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| anyhow!("PRIVY_VERIFICATION_KEY not set"))?;

    let app_id = config
        .privy_app_id
        .as_ref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| anyhow!("PRIVY_APP_ID not set"))?;

    let pem_normalized = pem.replace("\\n", "\n");

    let key =
        jsonwebtoken::DecodingKey::from_ec_pem(pem_normalized.as_bytes()).context("invalid PEM")?;

    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::ES256);
    validation.set_issuer(&["privy.io"]);
    validation.validate_aud = false;

    let data = jsonwebtoken::decode::<PrivyAccessClaims>(token, &key, &validation)
        .map_err(|e| anyhow!("jwt verify failed: {e}"))?;

    let claims = data.claims;
    if claims.iss != "privy.io" {
        return Err(anyhow!("invalid issuer"));
    }

    let aud_ok = match &claims.aud {
        serde_json::Value::String(s) => s == app_id,
        serde_json::Value::Array(arr) => arr.iter().any(|v| v.as_str() == Some(app_id.as_str())),
        _ => false,
    };
    if !aud_ok {
        return Err(anyhow!("jwt aud does not match PRIVY_APP_ID"));
    }

    Ok(claims)
}

#[derive(Debug, Deserialize)]
struct PrivyUserResponse {
    linked_accounts: Vec<Value>,
}

/// `GET https://api.privy.io/v1/users/{user_id}` — returns first Solana `address` from linked_accounts.
pub async fn fetch_primary_solana_wallet(
    http: &Client,
    config: &Config,
    privy_user_id: &str,
) -> Result<String> {
    let app_id = config
        .privy_app_id
        .as_ref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| anyhow!("PRIVY_APP_ID not set"))?;
    let secret = config
        .privy_app_secret
        .as_ref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| anyhow!("PRIVY_APP_SECRET not set"))?;

    let basic = base64::engine::general_purpose::STANDARD.encode(format!("{app_id}:{secret}"));

    let enc = urlencoding::encode(privy_user_id);
    let url = format!("https://api.privy.io/v1/users/{enc}");

    let resp = http
        .get(&url)
        .header("privy-app-id", app_id.as_str())
        .header("Authorization", format!("Basic {basic}"))
        .send()
        .await
        .context("privy users GET")?
        .error_for_status()
        .context("privy users GET status")?;

    let user: PrivyUserResponse = resp.json().await.context("privy user json")?;

    for acc in &user.linked_accounts {
        let chain = acc.get("chain_type").and_then(|v| v.as_str());
        if chain != Some("solana") {
            continue;
        }
        if let Some(addr) = acc.get("address").and_then(|v| v.as_str()) {
            if !addr.is_empty() {
                return Ok(addr.to_string());
            }
        }
    }

    Err(anyhow!(
        "no Solana wallet linked to this Privy user — connect Phantom or enable embedded Solana wallet"
    ))
}
