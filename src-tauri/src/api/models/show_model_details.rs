use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShowModelDetails {
    pub parent_model: String,
    pub format: String,
    pub family: String,
    pub families: Vec<String>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShowModelResponse {
    pub parameters: Option<String>,
    pub license: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub modified_at: String,
    pub details: ShowModelDetails,
    pub model_info: HashMap<String, Value>,
}

#[tauri::command]
pub async fn show_model_details(model: String) -> Result<ShowModelResponse, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({ "model": model });

    let response = client
        .post("http://localhost:11434/api/show")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while fetching details for model '{}'",
                    model
                )
            } else {
                format!(
                    "Network error while fetching details for model '{}': {}",
                    model, e
                )
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
            404 => format!("Model '{}' not found", model),
            400 => format!("Invalid request for model '{}': {}", model, ollama_msg),
            500 => format!(
                "Ollama encountered an internal error while fetching details for model '{}': {}",
                model, ollama_msg
            ),
            _ => format!(
                "Unexpected error fetching details for model '{}' (HTTP {}): {}",
                model, status, ollama_msg
            ),
        });
    }

    response.json::<ShowModelResponse>().await.map_err(|e| {
        format!(
            "Failed to parse the model details response for '{}' from Ollama: {}",
            model, e
        )
    })
}
