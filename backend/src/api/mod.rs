use axum::routing::{get, post};
use axum::Router;

use crate::AppState;

pub mod auth;
pub mod candidates;
pub mod lifi_proxy;
pub mod matching;
pub mod profile;
pub mod x402_middleware;

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        // Auth
        .route("/auth/session", post(auth::session))
        // Profile
        .route("/profile", post(profile::create))
        .route("/profile/me", get(profile::me))
        // Agent registration
        .route("/agent/register", post(profile::register_agent))
        // Matching
        .route("/match/start", post(matching::start))
        .route("/match/status/:session_id", get(matching::status))
        // Candidates
        .route("/candidates/:session_id", get(candidates::list))
        .route(
            "/candidates/:session_id/disclose/:index",
            post(candidates::disclose),
        )
        // LI.FI
        .route("/lifi/quote", get(lifi_proxy::quote))
        // Agent-to-agent (x402-gated)
        .route(
            "/agent/:agent_wallet/score",
            post(x402_middleware::scored_endpoint),
        )
        // ROS ceremony trigger
        .route("/ceremony/trigger", post(matching::trigger_ceremony))
        .with_state(state)
}
