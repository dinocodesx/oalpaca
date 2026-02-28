use serde::{Deserialize, Serialize};

/// Response from Ollama's /api/delete endpoint indicating success status.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeleteModelResponse {
    pub status: String,
}

/// Tauri command: Deletes a model from local Ollama storage. Calls Ollama's /api/delete endpoint.
#[tauri::command]
pub async fn delete_model(model: String) -> Result<DeleteModelResponse, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({ "model": model });

    let response = client
        .delete("http://localhost:11434/api/delete")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while deleting model '{}'",
                    model
                )
            } else {
                format!("Network error while deleting model '{}': {}", model, e)
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
            404 => format!("Model '{}' not found and cannot be deleted", model),
            400 => format!("Invalid model name '{}': {}", model, ollama_msg),
            500 => format!(
                "Ollama encountered an internal error while deleting model '{}': {}",
                model, ollama_msg
            ),
            _ => format!(
                "Unexpected error deleting model '{}' (HTTP {}): {}",
                model, status, ollama_msg
            ),
        });
    }

    Ok(DeleteModelResponse {
        status: "success".to_string(),
    })
}
