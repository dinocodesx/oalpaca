use serde::{Deserialize, Serialize};

/// Response from Ollama's /api/pull endpoint indicating success status.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PullModelResponse {
    pub status: String,
}

/// Tauri command: Pulls a model from the Ollama registry to local storage. Calls Ollama's /api/pull endpoint.
#[tauri::command]
pub async fn pull_model(model: String) -> Result<PullModelResponse, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": model,
        "stream": false
    });

    let response = client
        .post("http://localhost:11434/api/pull")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while pulling model '{}'",
                    model
                )
            } else {
                format!("Network error while pulling model '{}': {}", model, e)
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
            404 => format!("Model '{}' not found in the Ollama registry", model),
            400 => format!("Invalid model name '{}': {}", model, ollama_msg),
            500 => format!(
                "Ollama encountered an internal error while pulling model '{}': {}",
                model, ollama_msg
            ),
            _ => format!(
                "Unexpected error pulling model '{}' (HTTP {}): {}",
                model, status, ollama_msg
            ),
        });
    }

    response.json::<PullModelResponse>().await.map_err(|e| {
        format!(
            "Failed to parse the pull response for model '{}' from Ollama: {}",
            model, e
        )
    })
}
