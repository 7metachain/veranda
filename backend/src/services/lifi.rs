//! Thin reqwest wrapper around the LI.FI REST API.

use anyhow::Result;
use reqwest::Client;

use crate::api::lifi_proxy::QuoteParams;
use crate::config::Config;

pub struct LifiService {
    pub http: Client,
    pub api_key: Option<String>,
    pub integrator: String,
}

impl LifiService {
    pub fn new(config: &Config) -> Self {
        Self {
            http: Client::new(),
            api_key: config.lifi_api_key.clone(),
            integrator: config.lifi_integrator.clone(),
        }
    }

    pub async fn quote(&self, params: &QuoteParams) -> Result<serde_json::Value> {
        let mut req = self
            .http
            .get("https://li.quest/v1/quote")
            .query(&[
                ("fromChain", params.from_chain.as_str()),
                ("toChain", params.to_chain.as_str()),
                ("fromToken", params.from_token.as_str()),
                ("toToken", params.to_token.as_str()),
                ("fromAddress", params.from_address.as_str()),
                ("amount", params.amount.as_str()),
                ("integrator", self.integrator.as_str()),
            ]);

        if let Some(key) = &self.api_key {
            req = req.header("x-lifi-api-key", key);
        }

        let resp = req.send().await?.error_for_status()?;
        Ok(resp.json().await?)
    }
}
