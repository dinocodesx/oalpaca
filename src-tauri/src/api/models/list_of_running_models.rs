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

#[tauri::command]
pub async fn list_of_running_models() -> Result<Vec<RunningModel>, String> {
    let client = reqwest::Client::new();

    match client.get("http://localhost:11434/api/ps").send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<RunningModelsResponse>().await {
                    Ok(running_models_response) => Ok(running_models_response.models),
                    Err(e) => Err(format!("Failed to parse response: {}", e)),
                }
            } else {
                Err(format!("HTTP error: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Failed to connect to Ollama: {}", e)),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunningModelsResponse {
    pub models: Vec<RunningModel>,
}
