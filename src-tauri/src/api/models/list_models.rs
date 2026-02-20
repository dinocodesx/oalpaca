use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelDetails {
    pub format: String,
    pub family: String,
    pub families: Vec<String>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Model {
    pub name: String,
    pub model: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: ModelDetails,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelsResponse {
    pub models: Vec<Model>,
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<Model>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                "Request to Ollama timed out while fetching the model list".to_string()
            } else {
                format!("Network error while fetching the model list: {}", e)
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
                "Ollama encountered an internal error while listing models: {}",
                ollama_msg
            ),
            _ => format!(
                "Unexpected error fetching model list (HTTP {}): {}",
                status, ollama_msg
            ),
        });
    }

    response
        .json::<ModelsResponse>()
        .await
        .map(|r| r.models)
        .map_err(|e| format!("Failed to parse the model list response from Ollama: {}", e))
}
