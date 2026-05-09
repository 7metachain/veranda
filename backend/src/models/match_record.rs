use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MatchRecord {
    pub id: Uuid,
    pub agent_wallet: String,
    pub scenarios: Vec<String>,
    pub round: Option<i32>,
    pub progress: Option<f64>,
    pub eta_seconds: Option<i32>,
    pub status: Option<String>,
    pub merkle_root_round1: Option<String>,
    pub merkle_root_round2: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
