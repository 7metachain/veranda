use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::AppState;

// ─── POST /match/start ─────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct StartMatchRequest {
    pub agent_wallet: String,
    pub scenarios: Vec<String>,
}

#[derive(Serialize)]
pub struct StartMatchResponse {
    pub match_session_id: Uuid,
}

pub async fn start(
    State(state): State<AppState>,
    Json(req): Json<StartMatchRequest>,
) -> AppResult<Json<StartMatchResponse>> {
    if !(2..=4).contains(&req.scenarios.len()) {
        return Err(AppError::BadRequest(
            "scenarios must select 2–4 items".into(),
        ));
    }

    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO matches (id, agent_wallet, scenarios, status)
        VALUES ($1, $2, $3, 'pending')
        "#,
    )
    .bind(session_id)
    .bind(&req.agent_wallet)
    .bind(&req.scenarios)
    .execute(&state.db)
    .await?;

    // Spawn the matching pipeline as a background task. The HTTP request
    // returns immediately; clients poll /match/status/:id.
    let pipeline_state = state.clone();
    let agent_wallet = req.agent_wallet.clone();
    let scenarios = req.scenarios.clone();
    tokio::spawn(async move {
        if let Err(e) = crate::orchestrator::matching_pipeline::run(
            &pipeline_state,
            session_id,
            &agent_wallet,
            &scenarios,
        )
        .await
        {
            tracing::error!(error = ?e, ?session_id, "matching pipeline failed");
        }
    });

    Ok(Json(StartMatchResponse {
        match_session_id: session_id,
    }))
}

// ─── GET /match/status/:session_id ─────────────────────────────────────────

#[derive(Serialize)]
pub struct MatchStatusResponse {
    pub round: i32,
    pub progress: f32,
    pub eta_seconds: i32,
    pub status: String,
}

pub async fn status(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
) -> AppResult<Json<MatchStatusResponse>> {
    let row = sqlx::query(
        r#"
        SELECT round, progress, eta_seconds, status
        FROM matches
        WHERE id = $1
        "#,
    )
    .bind(session_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(MatchStatusResponse {
        round: row.try_get::<Option<i32>, _>("round")?.unwrap_or(0),
        progress: row
            .try_get::<Option<f64>, _>("progress")?
            .unwrap_or(0.0) as f32,
        eta_seconds: row
            .try_get::<Option<i32>, _>("eta_seconds")?
            .unwrap_or(0),
        status: row
            .try_get::<Option<String>, _>("status")?
            .unwrap_or_else(|| "unknown".into()),
    }))
}

// ─── POST /ceremony/trigger ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct TriggerCeremonyRequest {
    pub candidate_agent_wallet: String,
}

#[derive(Serialize)]
pub struct TriggerCeremonyResponse {
    pub video_url: String,
}

pub async fn trigger_ceremony(
    State(state): State<AppState>,
    Json(req): Json<TriggerCeremonyRequest>,
) -> AppResult<Json<TriggerCeremonyResponse>> {
    let recording_path = state
        .ros
        .trigger_pickup_flower(&req.candidate_agent_wallet)
        .await?;

    Ok(Json(TriggerCeremonyResponse {
        video_url: recording_path,
    }))
}
