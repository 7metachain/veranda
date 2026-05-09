use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::{AppError, AppResult};
use crate::AppState;

// ─── POST /profile ─────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateProfileRequest {
    pub agent_wallet: String,
    pub scenarios: Vec<String>,
    pub audio_uploads: Vec<String>, // mock: just file names from scripts/mock_data
}

#[derive(Serialize)]
pub struct CreateProfileResponse {
    pub profile_id: uuid::Uuid,
    pub vector: Vec<f32>,
}

pub async fn create(
    State(state): State<AppState>,
    Json(req): Json<CreateProfileRequest>,
) -> AppResult<Json<CreateProfileResponse>> {
    if !(2..=4).contains(&req.scenarios.len()) {
        return Err(AppError::BadRequest(
            "scenarios must select 2–4 items".into(),
        ));
    }

    // ─── Mock voice profile generation ───────────────────────────────────
    // The real flow would feed each audio file to Whisper, then prompt an
    // LLM to extract a 5-dimensional personality vector. We swap in a stub.
    let vector = state.voice.generate_profile_vector(&req.audio_uploads);
    let vector_json = serde_json::to_value(&vector)?;

    let row = sqlx::query(
        r#"
        INSERT INTO agents (agent_wallet, scenarios, profile_vector)
        VALUES ($1, $2, $3)
        ON CONFLICT (agent_wallet) DO UPDATE
            SET scenarios = EXCLUDED.scenarios,
                profile_vector = EXCLUDED.profile_vector
        RETURNING id
        "#,
    )
    .bind(&req.agent_wallet)
    .bind(&req.scenarios)
    .bind(&vector_json)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(CreateProfileResponse {
        profile_id: row.try_get("id")?,
        vector,
    }))
}

// ─── GET /profile/me ───────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ProfileResponse {
    pub agent_wallet: String,
    pub scenarios: Vec<String>,
    pub profile_vector: serde_json::Value,
}

pub async fn me(
    State(state): State<AppState>,
    AuthHeader(agent_wallet): AuthHeader,
) -> AppResult<Json<ProfileResponse>> {
    let row = sqlx::query(
        r#"
        SELECT agent_wallet, scenarios, profile_vector
        FROM agents
        WHERE agent_wallet = $1
        "#,
    )
    .bind(&agent_wallet)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(ProfileResponse {
        agent_wallet: row.try_get("agent_wallet")?,
        scenarios: row
            .try_get::<Option<Vec<String>>, _>("scenarios")?
            .unwrap_or_default(),
        profile_vector: row
            .try_get::<Option<serde_json::Value>, _>("profile_vector")?
            .unwrap_or(serde_json::Value::Null),
    }))
}

// ─── POST /agent/register ──────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RegisterAgentRequest {
    pub agent_wallet: String,
    pub commitment: String, // hex
    pub scenarios: Vec<String>,
    pub merkle_proof: Vec<String>, // each leaf hex
}

#[derive(Serialize)]
pub struct RegisterAgentResponse {
    pub agent_id: uuid::Uuid,
    pub leaf_index: u64,
}

pub async fn register_agent(
    State(state): State<AppState>,
    Json(req): Json<RegisterAgentRequest>,
) -> AppResult<Json<RegisterAgentResponse>> {
    let leaf_index = state
        .light
        .insert_commitment_leaf(&req.commitment)
        .await?;

    let row = sqlx::query(
        r#"
        UPDATE agents
        SET commitment = $1, leaf_index = $2, registered = true
        WHERE agent_wallet = $3
        RETURNING id
        "#,
    )
    .bind(&req.commitment)
    .bind(leaf_index as i64)
    .bind(&req.agent_wallet)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(RegisterAgentResponse {
        agent_id: row.try_get("id")?,
        leaf_index,
    }))
}

// ─── tiny extractor for the agent_wallet auth header ───────────────────────
//
// Convention: clients pass `X-Agent-Wallet: <pubkey>` after Privy auth.

pub struct AuthHeader(pub String);

#[axum::async_trait]
impl<S: Send + Sync> axum::extract::FromRequestParts<S> for AuthHeader {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .headers
            .get("x-agent-wallet")
            .and_then(|v| v.to_str().ok())
            .map(|s| AuthHeader(s.to_string()))
            .ok_or(AppError::Unauthorized)
    }
}
