//! HTTP 402 (Payment Required) middleware for agent-to-agent calls.
//!
//! The flow follows the x402 spec: on first request the server returns
//! HTTP 402 + a JSON body listing acceptable payment requirements. The
//! client constructs a signed Solana USDC transfer and re-issues the
//! request with an `X-PAYMENT` header carrying that transaction. The
//! server verifies and forwards (or in our case, executes the agent
//! match) and replies 200.
//!
//! We try to use the `x402-axum` crate (workspace dep). If that crate's
//! API differs from this scaffold, the manual flow below is a complete
//! drop-in implementation that follows the spec.

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::AppState;

#[derive(Deserialize)]
pub struct ScoreRequest {
    pub counterparty_agent_wallet: String,
    pub scenario_weights: [f32; 5],
}

#[derive(Serialize)]
pub struct ScoreResponse {
    pub score: u16,
}

/// `POST /agent/:agent_wallet/score`
pub async fn scored_endpoint(
    State(state): State<AppState>,
    Path(agent_wallet): Path<String>,
    headers: HeaderMap,
    Json(req): Json<ScoreRequest>,
) -> axum::response::Response {
    let payment = headers
        .get("x-payment")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if payment.is_none() {
        // ─── Return 402 with payment requirements ────────────────────────
        let treasury = state
            .config
            .x402_treasury_wallet
            .map(|p| p.to_string())
            .unwrap_or_default();

        let body = json!({
            "x402Version": 1,
            "error": "Payment required",
            "accepts": [{
                "scheme": "exact",
                "network": "solana-devnet",
                "asset": state.config.usdc_mint.to_string(),
                "maxAmountRequired": state.config.x402_price_match_usdc.to_string(),
                "payTo": treasury,
                "resource": format!(
                    "{}/api/v1/agent/{}/score",
                    state.config.public_url, agent_wallet
                ),
                "description": "Agent-to-agent compatibility match",
                "mimeType": "application/json",
                "outputSchema": null,
                "maxTimeoutSeconds": 60,
                "extra": null,
            }],
        });

        return (StatusCode::PAYMENT_REQUIRED, Json(body)).into_response();
    }

    // ─── Verify the payment tx, then execute the match ───────────────────
    let payment_tx = payment.unwrap();
    if let Err(e) = state
        .solana
        .verify_x402_payment(&payment_tx, state.config.x402_price_match_usdc)
        .await
    {
        tracing::warn!(error = ?e, "x402 payment verification failed");
        return (
            StatusCode::PAYMENT_REQUIRED,
            Json(json!({ "error": "invalid payment" })),
        )
            .into_response();
    }

    // ─── Compute the score using the (mock) Arcium MPC stub ──────────────
    let profile_a = state
        .arcium
        .load_profile_blob(&agent_wallet)
        .await
        .unwrap_or_default();
    let profile_b = state
        .arcium
        .load_profile_blob(&req.counterparty_agent_wallet)
        .await
        .unwrap_or_default();

    let score = state
        .arcium
        .compute_compatibility(&profile_a, &profile_b, &req.scenario_weights)
        .await
        .map(|s| s.value)
        .unwrap_or(0);

    (StatusCode::OK, Json(ScoreResponse { score })).into_response()
}
