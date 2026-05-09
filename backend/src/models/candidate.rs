use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Candidate {
    pub id: Uuid,
    pub session_id: Uuid,
    pub round: i32,
    pub idx: i32,
    pub candidate_agent_wallet: String,
    pub score: Option<i32>,
    pub teaser: Option<String>,
}
