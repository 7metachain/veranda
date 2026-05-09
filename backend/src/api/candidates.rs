use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::AppState;

// ─── GET /candidates/:session_id ───────────────────────────────────────────

#[derive(Serialize)]
pub struct CandidateBrief {
    pub index: u8,
    pub score: u16,
    pub teaser: String,
    pub agent_wallet: String,
}

#[derive(Serialize)]
pub struct CandidateListResponse {
    pub candidates: Vec<CandidateBrief>,
}

pub async fn list(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
) -> AppResult<Json<CandidateListResponse>> {
    let rows = sqlx::query(
        r#"
        SELECT idx, score, teaser, candidate_agent_wallet
        FROM match_candidates
        WHERE session_id = $1 AND round = 2
        ORDER BY idx ASC
        "#,
    )
    .bind(session_id)
    .fetch_all(&state.db)
    .await?;

    let candidates = rows
        .into_iter()
        .map(|r| -> AppResult<CandidateBrief> {
            Ok(CandidateBrief {
                index: r.try_get::<i32, _>("idx")? as u8,
                score: r
                    .try_get::<Option<i32>, _>("score")?
                    .unwrap_or(0) as u16,
                teaser: r
                    .try_get::<Option<String>, _>("teaser")?
                    .unwrap_or_default(),
                agent_wallet: r.try_get("candidate_agent_wallet")?,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    Ok(Json(CandidateListResponse { candidates }))
}

// ─── POST /candidates/:session_id/disclose/:index ──────────────────────────

#[derive(Deserialize)]
pub struct DiscloseRequest {
    pub tx_signature: String,
}

#[derive(Serialize)]
pub struct DisclosedProfile {
    pub display_name: String,
    pub photos: Vec<String>,
    pub recordings: Vec<String>,
    pub bio: String,
}

pub async fn disclose(
    State(state): State<AppState>,
    Path((session_id, index)): Path<(Uuid, u8)>,
    Json(req): Json<DiscloseRequest>,
) -> AppResult<Json<DisclosedProfile>> {
    // Verify the on-chain DisclosureGranted event corresponds to this user
    // and this candidate index. `solana::verify_disclosure_tx` returns the
    // candidate's agent_wallet pulled from the event log.
    let agent_wallet = state
        .solana
        .verify_disclosure_tx(&req.tx_signature, session_id, index)
        .await?;

    let row = sqlx::query(
        r#"
        SELECT display_name, photos, recordings, bio
        FROM agents
        WHERE agent_wallet = $1
        "#,
    )
    .bind(&agent_wallet)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(DisclosedProfile {
        display_name: row
            .try_get::<Option<String>, _>("display_name")?
            .unwrap_or_else(|| "Anonymous".into()),
        photos: row
            .try_get::<Option<Vec<String>>, _>("photos")?
            .unwrap_or_default(),
        recordings: row
            .try_get::<Option<Vec<String>>, _>("recordings")?
            .unwrap_or_default(),
        bio: row
            .try_get::<Option<String>, _>("bio")?
            .unwrap_or_default(),
    }))
}
