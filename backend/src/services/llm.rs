//! Thin wrapper over `rig` for OpenAI chat completions used in round 2's
//! deeper compatibility simulation. Each pair is fed into a structured
//! prompt that asks the model to play out a scene from the user-selected
//! scenarios and emit a 0–10000 compatibility score.

use anyhow::Result;

use crate::config::Config;

pub struct LlmService {
    pub api_key: Option<String>,
    pub model: String,
}

impl LlmService {
    pub fn new(config: &Config) -> Self {
        Self {
            api_key: config.openai_api_key.clone(),
            model: config.openai_model.clone(),
        }
    }

    /// Round-2 deep simulation. Returns a score in basis points (0..10000).
    pub async fn simulate_compatibility(
        &self,
        profile_a: &serde_json::Value,
        profile_b: &serde_json::Value,
        scenarios: &[String],
    ) -> Result<u16> {
        if self.api_key.is_none() {
            // Dev mode: deterministic mock derived from the JSON shape.
            return Ok(deterministic_mock_score(profile_a, profile_b, scenarios));
        }

        // TODO: build a `rig::providers::openai::Client`, construct a
        // structured prompt, call `chat`, parse the score.
        Ok(deterministic_mock_score(profile_a, profile_b, scenarios))
    }
}

fn deterministic_mock_score(
    a: &serde_json::Value,
    b: &serde_json::Value,
    scenarios: &[String],
) -> u16 {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(a.to_string().as_bytes());
    h.update(b.to_string().as_bytes());
    for s in scenarios {
        h.update(s.as_bytes());
    }
    let bytes = h.finalize();
    // Pull 16 bits, clamp to [4000, 9500] so the demo always shows reasonable scores.
    let raw = u16::from_be_bytes([bytes[0], bytes[1]]);
    4000 + (raw % 5500)
}
