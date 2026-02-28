use serde::{Deserialize, Serialize};

/// Response from Ollama's /api/copy endpoint indicating success status.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CopyModelResponse {
    pub status: String,
}

/// Tauri command: Copies a model to create a new model with a different name. Calls Ollama's /api/copy endpoint.
#[tauri::command]
pub async fn copy_model(source: String, destination: String) -> Result<CopyModelResponse, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "source": source,
        "destination": destination
    });

    let response = client
        .post("http://localhost:11434/api/copy")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while copying model '{}' to '{}'",
                    source, destination
                )
            } else {
                format!(
                    "Network error while copying model '{}' to '{}': {}",
                    source, destination, e
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
            404 => format!("Source model '{}' not found", source),
            400 => format!(
                "Invalid copy request from '{}' to '{}': {}",
                source, destination, ollama_msg
            ),
            500 => format!(
                "Ollama encountered an internal error while copying model '{}' to '{}': {}",
                source, destination, ollama_msg
            ),
            _ => format!(
                "Unexpected error copying model '{}' to '{}' (HTTP {}): {}",
                source, destination, status, ollama_msg
            ),
        });
    }

    Ok(CopyModelResponse {
        status: "success".to_string(),
    })
}
