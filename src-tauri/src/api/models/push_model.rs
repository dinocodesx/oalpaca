use serde::{Deserialize, Serialize};

/// Response from Ollama's /api/push endpoint indicating success status.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PushModelResponse {
    pub status: String,
}

/// Tauri command: Pushes a model to the Ollama registry. Calls Ollama's /api/push endpoint.
#[tauri::command]
pub async fn push_model(model: String) -> Result<PushModelResponse, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": model,
        "stream": false
    });

    let response = client
        .post("http://localhost:11434/api/push")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while pushing model '{}'",
                    model
                )
            } else {
                format!("Network error while pushing model '{}': {}", model, e)
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
            401 | 403 => format!(
                "Authentication failed while pushing model '{}'. Make sure you are logged in to the Ollama registry: {}",
                model, ollama_msg
            ),
            404 => format!("Model '{}' not found locally", model),
            400 => format!("Invalid model name '{}': {}", model, ollama_msg),
            500 => format!(
                "Ollama encountered an internal error while pushing model '{}': {}",
                model, ollama_msg
            ),
            _ => format!(
                "Unexpected error pushing model '{}' (HTTP {}): {}",
                model, status, ollama_msg
            ),
        });
    }

    response.json::<PushModelResponse>().await.map_err(|e| {
        format!(
            "Failed to parse the push response for model '{}' from Ollama: {}",
            model, e
        )
    })
}
