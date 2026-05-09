//! Veranda backend HTTP entrypoint.
//!
//! Bootstraps:
//!   - tracing
//!   - postgres pool
//!   - shared service handles (Solana, MagicBlock, LI.FI, LLM, ROS)
//!   - axum router with all routes from §8 of the project spec
//!
//! All long-running stateful work (matching pipeline, ER delegation, event
//! listeners) lives behind the `services::` and `orchestrator::` modules.

use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Context;
use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod api;
mod config;
mod db;
mod error;
mod models;
mod orchestrator;
mod services;

pub use error::AppError;

/// Application-wide handles passed by `axum::Router::with_state`.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<config::Config>,
    pub db: db::pool::PgPool,
    pub solana: Arc<services::solana::SolanaService>,
    pub magicblock: Arc<services::magicblock::MagicBlockService>,
    pub lifi: Arc<services::lifi::LifiService>,
    pub llm: Arc<services::llm::LlmService>,
    pub light: Arc<services::light_protocol::LightService>,
    pub zk: Arc<services::zk_prover::ZkProverService>,
    pub ros: Arc<services::ros_bridge::RosBridge>,
    pub voice: Arc<services::voice_mock::VoiceMockService>,
    pub arcium: Arc<services::arcium_stub::ArciumStub>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Arc::new(config::Config::from_env().context("loading config")?);
    let db = db::pool::connect(&config.database_url).await?;
    db::pool::run_migrations(&db).await?;

    let solana = Arc::new(services::solana::SolanaService::new(&config)?);
    let magicblock = Arc::new(services::magicblock::MagicBlockService::new(&config)?);
    let lifi = Arc::new(services::lifi::LifiService::new(&config));
    let llm = Arc::new(services::llm::LlmService::new(&config));
    let light = Arc::new(services::light_protocol::LightService::new(&config));
    let zk = Arc::new(services::zk_prover::ZkProverService::new());
    let ros = Arc::new(services::ros_bridge::RosBridge::new(&config));
    let voice = Arc::new(services::voice_mock::VoiceMockService::default());
    let arcium = Arc::new(services::arcium_stub::ArciumStub::default());

    let state = AppState {
        config: config.clone(),
        db,
        solana,
        magicblock,
        lifi,
        llm,
        light,
        zk,
        ros,
        voice,
        arcium,
    };

    let app = Router::new()
        .nest("/api/v1", api::router(state.clone()))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    tracing::info!("Veranda backend listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
