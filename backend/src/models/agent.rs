use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub agent_wallet: String,
    pub commitment: Option<String>,
    pub leaf_index: Option<i64>,
    pub registered: bool,
    pub scenarios: Option<Vec<String>>,
    pub profile_vector: Option<serde_json::Value>,
    pub display_name: Option<String>,
    pub photos: Option<Vec<String>>,
    pub recordings: Option<Vec<String>>,
    pub bio: Option<String>,
}
