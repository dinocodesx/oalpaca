use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use super::chat_storage::{
    create_new_chat, load_chat_data, save_chat_data, update_chat_timestamp, ChatData, ChatMessage,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaChatMessage>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OllamaChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OllamaStreamChunk {
    model: Option<String>,
    created_at: Option<String>,
    message: Option<OllamaChunkMessage>,
    done: bool,
    done_reason: Option<String>,
    total_duration: Option<u64>,
    load_duration: Option<u64>,
    prompt_eval_count: Option<u64>,
    prompt_eval_duration: Option<u64>,
    eval_count: Option<u64>,
    eval_duration: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OllamaChunkMessage {
    role: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatStreamEvent {
    pub chat_id: String,
    pub content: String,
    pub done: bool,
    pub done_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatStreamError {
    pub chat_id: String,
    pub error: String,
}

#[tauri::command]
pub async fn send_chat_message(
    app: tauri::AppHandle,
    chat_id: Option<String>,
    model: String,
    message: String,
) -> Result<String, String> {
    // Determine if this is a new chat or an existing one
    let (resolved_chat_id, mut chat_data) = if let Some(ref id) = chat_id {
        let data = load_chat_data(id)?;
        (id.clone(), data)
    } else {
        let meta = create_new_chat(&model, &message)?;
        (meta.id, ChatData { messages: vec![] })
    };

    // Append the user message to the conversation
    chat_data.messages.push(ChatMessage {
        role: "user".to_string(),
        content: message.clone(),
    });

    // Save immediately so the user message is persisted
    save_chat_data(&resolved_chat_id, &chat_data)?;

    // Build the Ollama request with full conversation history
    let ollama_messages: Vec<OllamaChatMessage> = chat_data
        .messages
        .iter()
        .map(|m| OllamaChatMessage {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    let request_body = OllamaChatRequest {
        model: model.clone(),
        messages: ollama_messages,
        stream: true,
    };

    let chat_id_for_task = resolved_chat_id.clone();

    // Spawn a background task to handle streaming
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();

        let response = match client
            .post("http://localhost:11434/api/chat")
            .json(&request_body)
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                let error_msg = if e.is_connect() {
                    "Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434".to_string()
                } else if e.is_timeout() {
                    "Request to Ollama timed out".to_string()
                } else {
                    format!("Network error: {}", e)
                };

                let _ = app.emit(
                    "chat-stream-error",
                    ChatStreamError {
                        chat_id: chat_id_for_task.clone(),
                        error: error_msg,
                    },
                );
                return;
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            let _ = app.emit(
                "chat-stream-error",
                ChatStreamError {
                    chat_id: chat_id_for_task.clone(),
                    error: format!("Ollama returned HTTP {}: {}", status, body),
                },
            );
            return;
        }

        let mut stream = response.bytes_stream();
        let mut full_response = String::new();
        let mut buffer = String::new();

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(bytes) => {
                    let text = match String::from_utf8(bytes.to_vec()) {
                        Ok(t) => t,
                        Err(_) => continue,
                    };

                    buffer.push_str(&text);

                    // Process complete lines (NDJSON - newline-delimited JSON)
                    while let Some(newline_pos) = buffer.find('\n') {
                        let line = buffer[..newline_pos].trim().to_string();
                        buffer = buffer[newline_pos + 1..].to_string();

                        if line.is_empty() {
                            continue;
                        }

                        match serde_json::from_str::<OllamaStreamChunk>(&line) {
                            Ok(chunk) => {
                                let content = chunk
                                    .message
                                    .as_ref()
                                    .and_then(|m| m.content.clone())
                                    .unwrap_or_default();

                                full_response.push_str(&content);

                                let _ = app.emit(
                                    "chat-stream-chunk",
                                    ChatStreamEvent {
                                        chat_id: chat_id_for_task.clone(),
                                        content,
                                        done: chunk.done,
                                        done_reason: chunk.done_reason.clone(),
                                    },
                                );

                                if chunk.done {
                                    // Save the assistant's complete response
                                    let mut final_data = load_chat_data(&chat_id_for_task)
                                        .unwrap_or(ChatData { messages: vec![] });

                                    final_data.messages.push(ChatMessage {
                                        role: "assistant".to_string(),
                                        content: full_response.clone(),
                                    });

                                    let _ = save_chat_data(&chat_id_for_task, &final_data);
                                    let _ = update_chat_timestamp(&chat_id_for_task);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to parse stream chunk: {} - line: {}", e, line);
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = app.emit(
                        "chat-stream-error",
                        ChatStreamError {
                            chat_id: chat_id_for_task.clone(),
                            error: format!("Stream error: {}", e),
                        },
                    );
                    break;
                }
            }
        }

        // Handle any remaining data in the buffer
        let remaining = buffer.trim().to_string();
        if !remaining.is_empty() {
            if let Ok(chunk) = serde_json::from_str::<OllamaStreamChunk>(&remaining) {
                let content = chunk
                    .message
                    .as_ref()
                    .and_then(|m| m.content.clone())
                    .unwrap_or_default();

                full_response.push_str(&content);

                let _ = app.emit(
                    "chat-stream-chunk",
                    ChatStreamEvent {
                        chat_id: chat_id_for_task.clone(),
                        content,
                        done: chunk.done,
                        done_reason: chunk.done_reason.clone(),
                    },
                );

                if chunk.done {
                    let mut final_data =
                        load_chat_data(&chat_id_for_task).unwrap_or(ChatData { messages: vec![] });

                    final_data.messages.push(ChatMessage {
                        role: "assistant".to_string(),
                        content: full_response.clone(),
                    });

                    let _ = save_chat_data(&chat_id_for_task, &final_data);
                    let _ = update_chat_timestamp(&chat_id_for_task);
                }
            }
        }
    });

    Ok(resolved_chat_id)
}
