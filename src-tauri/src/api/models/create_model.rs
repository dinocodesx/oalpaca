use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateModelResponse {
    pub status: String,
}

#[tauri::command]
pub async fn create_model(
    from: String,
    model: String,
    system: Option<String>,
) -> Result<CreateModelResponse, String> {
    let client = reqwest::Client::new();

    let mut body = serde_json::json!({
        "from": from,
        "model": model,
        "stream": false
    });

    if let Some(system_prompt) = system {
        body["system"] = serde_json::Value::String(system_prompt);
    }

    let response = client
        .post("http://localhost:11434/api/create")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434"
                    .to_string()
            } else if e.is_timeout() {
                format!(
                    "Request to Ollama timed out while creating model '{}' from '{}'",
                    model, from
                )
            } else {
                format!(
                    "Network error while creating model '{}' from '{}': {}",
                    model, from, e
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
            404 => format!("Base model '{}' not found", from),
            400 => format!(
                "Invalid model configuration for '{}': {}",
                model, ollama_msg
            ),
            500 => format!(
                "Ollama encountered an internal error while creating model '{}' from '{}': {}",
                model, from, ollama_msg
            ),
            _ => format!(
                "Unexpected error creating model '{}' from '{}' (HTTP {}): {}",
                model, from, status, ollama_msg
            ),
        });
    }

    response.json::<CreateModelResponse>().await.map_err(|e| {
        format!(
            "Failed to parse the create model response for '{}' from Ollama: {}",
            model, e
        )
    })
}
