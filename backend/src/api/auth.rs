use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::AppResult;
use crate::AppState;

#[derive(Deserialize)]
pub struct SessionRequest {
    pub privy_token: String,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub user_id: uuid::Uuid,
    pub real_wallet: String,
}

/// Verifies the Privy JWT, upserts a user row, returns the canonical
/// `(user_id, real_wallet)` tuple the frontend will send on every later call.
pub async fn session(
    State(state): State<AppState>,
    Json(req): Json<SessionRequest>,
) -> AppResult<Json<SessionResponse>> {
    let claims = verify_privy_token(&state, &req.privy_token).await?;
    let real_wallet = claims.solana_wallet.clone();

    let row = sqlx::query(
        r#"
        INSERT INTO users (privy_user_id, real_wallet)
        VALUES ($1, $2)
        ON CONFLICT (privy_user_id) DO UPDATE
            SET real_wallet = EXCLUDED.real_wallet
        RETURNING id
        "#,
    )
    .bind(&claims.sub)
    .bind(&real_wallet)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(SessionResponse {
        user_id: row.try_get("id")?,
        real_wallet,
    }))
}

#[derive(Debug)]
pub struct PrivyClaims {
    pub sub: String,
    pub solana_wallet: String,
}

/// In production: pull `privy_verification_key` from config, `jsonwebtoken::decode`
/// against ES256, and extract the embedded Solana wallet from the linked accounts
/// claim. For the scaffold we accept any non-empty token in dev mode and return
/// a deterministic stub.
async fn verify_privy_token(state: &AppState, token: &str) -> AppResult<PrivyClaims> {
    if token.trim().is_empty() {
        return Err(crate::AppError::Unauthorized);
    }

    if state.config.privy_verification_key.is_none() {
        // DEV mode: derive a stable fake `sub` from the token so the same token
        // always maps to the same row in `users`.
        let sub = format!("did:privy:dev:{}", &token[..token.len().min(16)]);
        return Ok(PrivyClaims {
            sub,
            // dev placeholder — real flow returns the embedded Solana wallet.
            solana_wallet: "11111111111111111111111111111111".to_string(),
        });
    }

    // TODO: real ES256 JWT verification using `state.config.privy_verification_key`.
    Err(crate::AppError::Internal(
        "TODO: production Privy JWT verification not implemented".into(),
    ))
}
