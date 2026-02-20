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

    match client
        .post("http://localhost:11434/api/show")
        .json(&body)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<ShowModelResponse>().await {
                    Ok(show_response) => Ok(show_response),
                    Err(e) => Err(format!("Failed to parse response: {}", e)),
                }
            } else {
                Err(format!("HTTP error: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Failed to connect to Ollama: {}", e)),
    }
}
