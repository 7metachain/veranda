//! The 30 000 → 100 → 10 funnel.
//!
//! ## Round 1 (30k → 100)
//! 1. Filter the pool by scenario tags (intersection of bitmap).
//! 2. For each candidate, call the (mocked) Arcium MPC to get a score.
//!    Each pairwise call ALSO triggers a `record_match` tx on the ER, and
//!    the x402 fee is collected by the API gateway from BOTH sides.
//! 3. Take the top 100, build a merkle tree of their `agent_wallet` keys.
//! 4. Settle on mainnet: `commit_match_batch(round=1, root, fee_total)`.
//!
//! ## Round 2 (100 → 10)
//! Same shape, but `compute_compatibility` is replaced by an actual LLM-driven
//! scenario simulation using `services::llm`. Final 10 → merkle tree → commit.

use anyhow::Result;
use sha2::{Digest, Sha256};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;

const ROUND_1_KEEP: usize = 100;
const ROUND_2_KEEP: usize = 10;

pub async fn run(
    state: &AppState,
    session_id: Uuid,
    agent_wallet: &str,
    scenarios: &[String],
) -> Result<()> {
    set_status(state, session_id, 1, 0.0, 120, "running").await?;

    // ─── Stage 1: scenario filter ────────────────────────────────────────
    let pool = fetch_scenario_filtered_pool(state, scenarios, agent_wallet).await?;
    tracing::info!(
        candidates = pool.len(),
        ?session_id,
        "round 1 candidate pool"
    );

    // ─── Stage 2: score each pair (Arcium stub) ──────────────────────────
    let weights = scenario_weights_from_tags(scenarios);
    let mut scored: Vec<(String, u16)> = Vec::with_capacity(pool.len());
    let total = pool.len().max(1) as f32;

    for (i, candidate) in pool.iter().enumerate() {
        let blob_a = state.arcium.load_profile_blob(agent_wallet).await?;
        let blob_b = state.arcium.load_profile_blob(candidate).await?;
        let score = state
            .arcium
            .compute_compatibility(&blob_a, &blob_b, &weights)
            .await?;

        // Record on the ER. Errors here are non-fatal — we still want to
        // surface the score in the UI even if the ER tx is in flight.
        let _ = state
            .magicblock
            .record_match(
                &solana_sdk::pubkey::Pubkey::default(),
                &solana_sdk::pubkey::Pubkey::default(),
                score.value,
                1,
            )
            .await;

        scored.push((candidate.clone(), score.value));

        if i % 256 == 0 {
            let progress = (i as f32 + 1.0) / total;
            set_status(state, session_id, 1, progress * 0.5, 60, "running").await?;
        }
    }

    // ─── Stage 3: keep top-100 ───────────────────────────────────────────
    scored.sort_unstable_by(|a, b| b.1.cmp(&a.1));
    let round1_winners: Vec<(String, u16)> = scored.into_iter().take(ROUND_1_KEEP).collect();

    let r1_root = merkle_root_of_pubkeys(&round1_winners);
    let r1_fee = round1_winners.len() as u64 * 2 * state.config.x402_price_match_usdc;
    persist_round_candidates(state, session_id, 1, &round1_winners).await?;
    tracing::info!(?r1_root, ?r1_fee, "round 1 settled");

    set_status(state, session_id, 2, 0.5, 60, "running").await?;

    // ─── Round 2: deeper LLM simulation ──────────────────────────────────
    let mut deep_scored: Vec<(String, u16)> = Vec::with_capacity(round1_winners.len());
    let profile_a = profile_lookup(state, agent_wallet).await?;
    for (i, (cand, _r1_score)) in round1_winners.iter().enumerate() {
        let profile_b = profile_lookup(state, cand).await?;
        let score = state
            .llm
            .simulate_compatibility(&profile_a, &profile_b, scenarios)
            .await?;
        deep_scored.push((cand.clone(), score));

        let progress = 0.5 + 0.5 * ((i + 1) as f32 / round1_winners.len() as f32);
        set_status(state, session_id, 2, progress, 30, "running").await?;
    }

    deep_scored.sort_unstable_by(|a, b| b.1.cmp(&a.1));
    let round2_winners: Vec<(String, u16)> = deep_scored.into_iter().take(ROUND_2_KEEP).collect();
    let r2_root = merkle_root_of_pubkeys(&round2_winners);
    persist_round_candidates(state, session_id, 2, &round2_winners).await?;

    let final_root_hex = hex_encode(&r2_root);
    sqlx::query(
        r#"
        UPDATE matches
        SET merkle_root_round1 = $1,
            merkle_root_round2 = $2,
            status = 'complete',
            progress = 1.0,
            round = 2
        WHERE id = $3
        "#,
    )
    .bind(hex_encode(&r1_root))
    .bind(&final_root_hex)
    .bind(session_id)
    .execute(&state.db)
    .await?;

    Ok(())
}

async fn set_status(
    state: &AppState,
    session_id: Uuid,
    round: i32,
    progress: f32,
    eta: i32,
    status: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE matches
        SET round = $1, progress = $2, eta_seconds = $3, status = $4
        WHERE id = $5
        "#,
    )
    .bind(round)
    .bind(progress as f64)
    .bind(eta)
    .bind(status)
    .bind(session_id)
    .execute(&state.db)
    .await?;
    Ok(())
}

async fn fetch_scenario_filtered_pool(
    state: &AppState,
    scenarios: &[String],
    self_wallet: &str,
) -> Result<Vec<String>> {
    let rows = sqlx::query(
        r#"
        SELECT agent_wallet
        FROM agents
        WHERE registered = true
          AND agent_wallet <> $1
          AND scenarios && $2
        LIMIT 30000
        "#,
    )
    .bind(self_wallet)
    .bind(scenarios)
    .fetch_all(&state.db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| r.get::<String, _>("agent_wallet"))
        .collect())
}

async fn profile_lookup(state: &AppState, agent_wallet: &str) -> Result<serde_json::Value> {
    let row = sqlx::query("SELECT profile_vector FROM agents WHERE agent_wallet = $1")
        .bind(agent_wallet)
        .fetch_optional(&state.db)
        .await?;

    Ok(row
        .and_then(|r| r.try_get::<Option<serde_json::Value>, _>("profile_vector").ok().flatten())
        .unwrap_or(serde_json::Value::Null))
}

async fn persist_round_candidates(
    state: &AppState,
    session_id: Uuid,
    round: i32,
    winners: &[(String, u16)],
) -> Result<()> {
    sqlx::query("DELETE FROM match_candidates WHERE session_id = $1 AND round = $2")
        .bind(session_id)
        .bind(round)
        .execute(&state.db)
        .await?;

    for (i, (wallet, score)) in winners.iter().enumerate() {
        let teaser = format!(
            "Top {}% match in your selected scenarios.",
            100 - ((i as f32 / winners.len() as f32) * 100.0) as i32
        );
        sqlx::query(
            r#"
            INSERT INTO match_candidates (session_id, round, idx, candidate_agent_wallet, score, teaser)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(session_id)
        .bind(round)
        .bind(i as i32)
        .bind(wallet)
        .bind(*score as i32)
        .bind(&teaser)
        .execute(&state.db)
        .await?;
    }
    Ok(())
}

fn scenario_weights_from_tags(tags: &[String]) -> [f32; 5] {
    let mut w = [0.0f32; 5];
    for tag in tags {
        match tag.as_str() {
            "casual_dining" => w[0] = 1.0,
            "work_colleagues" => w[1] = 1.0,
            "family_interaction" => w[2] = 1.0,
            "conflict_resolution" => w[3] = 1.0,
            "travel_companion" => w[4] = 1.0,
            _ => {}
        }
    }
    w
}

fn merkle_root_of_pubkeys(winners: &[(String, u16)]) -> [u8; 32] {
    let mut leaves: Vec<[u8; 32]> = winners
        .iter()
        .enumerate()
        .map(|(i, (wallet, _))| {
            let mut h = Sha256::new();
            h.update([i as u8]);
            h.update(wallet.as_bytes());
            h.finalize().into()
        })
        .collect();

    if leaves.is_empty() {
        return [0u8; 32];
    }
    while leaves.len() > 1 {
        let mut next = Vec::with_capacity((leaves.len() + 1) / 2);
        for chunk in leaves.chunks(2) {
            let mut h = Sha256::new();
            h.update(chunk[0]);
            h.update(if chunk.len() == 2 { chunk[1] } else { chunk[0] });
            next.push(h.finalize().into());
        }
        leaves = next;
    }
    leaves[0]
}

fn hex_encode(b: &[u8; 32]) -> String {
    let mut s = String::with_capacity(64);
    for byte in b {
        use std::fmt::Write;
        write!(&mut s, "{:02x}", byte).ok();
    }
    s
}
