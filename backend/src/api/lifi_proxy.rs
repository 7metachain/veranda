use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppResult;
use crate::AppState;

#[derive(Deserialize)]
pub struct QuoteParams {
    #[serde(rename = "fromChain")]
    pub from_chain: String,
    #[serde(rename = "toChain")]
    pub to_chain: String,
    #[serde(rename = "fromToken")]
    pub from_token: String,
    #[serde(rename = "toToken")]
    pub to_token: String,
    #[serde(rename = "fromAddress")]
    pub from_address: String,
    pub amount: String,
}

/// Thin proxy to LI.FI's `/v1/quote` REST endpoint. We could call LI.FI from
/// the browser directly, but proxying lets us:
///   1. Inject our `LIFI_API_KEY` server-side
///   2. Annotate the response with our integrator id for fee attribution
pub async fn quote(
    State(state): State<AppState>,
    Query(params): Query<QuoteParams>,
) -> AppResult<Json<serde_json::Value>> {
    let response = state.lifi.quote(&params).await?;
    Ok(Json(response))
}
