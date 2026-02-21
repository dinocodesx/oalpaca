use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RunningModelDetails {
    pub parent_model: String,
    pub format: String,
    pub family: String,
    pub families: Vec<String>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RunningModel {
    pub name: String,
    pub model: String,
    pub size: u64,
    pub digest: String,
    pub details: RunningModelDetails,
    pub expires_at: String,
    pub size_vram: u64,
    pub context_length: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RunningModelsResponse {
    pub models: Vec<RunningModel>,
}

#[tauri::command]
pub async fn list_running_models() -> Result<Vec<RunningModel>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:11434/api/ps")
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                "Request to Ollama timed out while fetching running models".to_string()
            } else {
                format!("Network error while fetching running models: {}", e)
            }
        })?;

    let status = response.status();

    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_default();
        let ollama_msg = serde_json::from_str::<serde_json::Value>(&error_body)
            .ok()
            .and_then(|v| v["error"].as_str().map(String::from))
            .unwrap_or(error_body);

        return Err(match status.as_u16() {
            500 => format!(
                "Ollama encountered an internal error while fetching running models: {}",
                ollama_msg
            ),
            _ => format!(
                "Unexpected error fetching running models (HTTP {}): {}",
                status, ollama_msg
            ),
        });
    }

    response
        .json::<RunningModelsResponse>()
        .await
        .map(|r| r.models)
        .map_err(|e| {
            format!(
                "Failed to parse the running models response from Ollama: {}",
                e
            )
        })
}
