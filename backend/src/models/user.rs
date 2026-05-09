use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub privy_user_id: String,
    pub real_wallet: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
