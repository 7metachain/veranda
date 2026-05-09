//! Mock voice → profile-vector pipeline.
//!
//! Real flow: each scenario recording → Whisper transcript → LLM extracts a
//! 5-dim trait vector (one component per Big Five trait) → vectors averaged.
//!
//! Here we just return a deterministic vector derived from the file names.

use sha2::{Digest, Sha256};

#[derive(Default)]
pub struct VoiceMockService;

impl VoiceMockService {
    pub fn generate_profile_vector(&self, audio_uploads: &[String]) -> Vec<f32> {
        let mut h = Sha256::new();
        for f in audio_uploads {
            h.update(f.as_bytes());
        }
        let bytes = h.finalize();

        // Take first 5 bytes, normalize to [0, 1].
        (0..5)
            .map(|i| bytes[i] as f32 / 255.0)
            .collect()
    }
}
