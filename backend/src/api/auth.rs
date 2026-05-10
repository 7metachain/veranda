use axum::extract::State;
use axum::Json;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::{AppError, AppResult};
use crate::services::privy;
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

/// Verifies the Privy access JWT, upserts a user row, returns the canonical
/// `(user_id, real_wallet)` tuple the frontend will cache in localStorage.
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

async fn verify_privy_token(state: &AppState, token: &str) -> AppResult<PrivyClaims> {
    if token.trim().is_empty() {
        return Err(AppError::Unauthorized);
    }

    // Dev: no verification key — accept any non-empty token (unchanged scaffold).
    if state.config.privy_verification_key.is_none()
        || state
            .config
            .privy_verification_key
            .as_ref()
            .map(|s| s.is_empty())
            .unwrap_or(true)
    {
        let sub = format!("did:privy:dev:{}", &token[..token.len().min(16)]);
        return Ok(PrivyClaims {
            sub,
            solana_wallet: "11111111111111111111111111111111".to_string(),
        });
    }

    let access = privy::verify_access_token(&state.config, token).map_err(|e| {
        tracing::warn!(error = %e, "privy access token verify failed");
        AppError::Unauthorized
    })?;

    let http = Client::new();
    let solana_wallet = privy::fetch_primary_solana_wallet(&http, &state.config, &access.sub)
        .await
        .map_err(|e| {
            tracing::warn!(error = %e, "privy solana wallet lookup failed");
            AppError::BadRequest(e.to_string())
        })?;

    Ok(PrivyClaims {
        sub: access.sub,
        solana_wallet,
    })
}
