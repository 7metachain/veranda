use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;

use crate::AppState;

/// GET — verifies connectivity to MagicBlock’s Solana-compatible RPC
/// (`MAGICBLOCK_RPC_URL`, default `https://devnet.magicblock.app`).
pub async fn er_health(State(state): State<AppState>) -> (StatusCode, Json<serde_json::Value>) {
    match state.magicblock.check_er_rpc().await {
        Ok(hash) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "ok": true,
                "rpc": state.config.magicblock_rpc_url,
                "latest_blockhash": hash.to_string(),
                "rollup_program": state.config.program_id_rollup.to_string(),
            })),
        ),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "ok": false,
                "error": e.to_string(),
                "rpc": state.config.magicblock_rpc_url,
            })),
        ),
    }
}
