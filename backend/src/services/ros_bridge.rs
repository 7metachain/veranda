//! WebSocket bridge to the Gazebo / ROS 2 stack running in `ros-sim/`.
//!
//! `rosbridge_suite` exposes ROS topics over a JSON-over-websocket protocol.
//! We publish a single message on `/veranda/match_confirmed` that the
//! `pickup_flower.py` node subscribes to; that node drives the TurtleBot
//! to the cafe table and triggers screen recording.

use std::time::Duration;

use anyhow::{Context, Result};
use futures_util::SinkExt;
use serde_json::json;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

use crate::config::Config;

pub struct RosBridge {
    pub ws_url: String,
    pub recording_path: String,
}

impl RosBridge {
    pub fn new(config: &Config) -> Self {
        Self {
            ws_url: config.rosbridge_ws_url.clone(),
            recording_path: config.ceremony_recording_path.clone(),
        }
    }

    /// Connects, advertises `/veranda/match_confirmed` as a `std_msgs/String`,
    /// publishes the candidate's agent_wallet, then disconnects. The Python
    /// node in `ros-sim/scripts/pickup_flower.py` does the rest.
    pub async fn trigger_pickup_flower(&self, candidate_agent_wallet: &str) -> Result<String> {
        let (mut ws, _) = match tokio::time::timeout(
            Duration::from_secs(2),
            connect_async(&self.ws_url),
        )
        .await
        {
            Ok(Ok(pair)) => pair,
            // If rosbridge isn't running we mock the recording; the demo
            // script also covers the no-docker case.
            Ok(Err(e)) => {
                tracing::warn!(error = ?e, "rosbridge unreachable; mocking recording path");
                return Ok(self.recording_path.clone());
            }
            Err(_) => {
                tracing::warn!("rosbridge connect timed out; mocking recording path");
                return Ok(self.recording_path.clone());
            }
        };

        let advertise = json!({
            "op": "advertise",
            "topic": "/veranda/match_confirmed",
            "type": "std_msgs/String",
        });
        ws.send(Message::Text(advertise.to_string()))
            .await
            .context("rosbridge advertise")?;

        let publish = json!({
            "op": "publish",
            "topic": "/veranda/match_confirmed",
            "msg": { "data": candidate_agent_wallet },
        });
        ws.send(Message::Text(publish.to_string()))
            .await
            .context("rosbridge publish")?;

        // Give the bot ~7 seconds to drive + record.
        tokio::time::sleep(Duration::from_secs(7)).await;
        Ok(self.recording_path.clone())
    }
}
