use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatData {
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMeta {
    pub id: String,
    pub chat_title: String,
    pub file_location: String,
    pub model_used: String,
    pub created_at: String,
    pub last_updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatsIndex {
    pub chats: Vec<ChatMeta>,
}

fn get_data_dir() -> Result<PathBuf, String> {
    let data_dir = PathBuf::from("../.data");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create .data directory: {}", e))?;
    }
    let chats_dir = data_dir.join("chats");
    if !chats_dir.exists() {
        fs::create_dir_all(&chats_dir)
            .map_err(|e| format!("Failed to create .data/chats directory: {}", e))?;
    }
    Ok(data_dir)
}

fn get_index_path() -> Result<PathBuf, String> {
    let data_dir = get_data_dir()?;
    Ok(data_dir.join("chats_index.json"))
}

fn get_chat_file_path(chat_id: &str) -> Result<PathBuf, String> {
    let data_dir = get_data_dir()?;
    Ok(data_dir.join("chats").join(format!("{}.json", chat_id)))
}

pub fn load_chats_index() -> Result<ChatsIndex, String> {
    let index_path = get_index_path()?;
    if !index_path.exists() {
        let index = ChatsIndex { chats: vec![] };
        save_chats_index(&index)?;
        return Ok(index);
    }
    let content = fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read chats index: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse chats index: {}", e))
}

pub fn save_chats_index(index: &ChatsIndex) -> Result<(), String> {
    let index_path = get_index_path()?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize chats index: {}", e))?;
    fs::write(&index_path, content).map_err(|e| format!("Failed to write chats index: {}", e))
}

pub fn load_chat_data(chat_id: &str) -> Result<ChatData, String> {
    let chat_path = get_chat_file_path(chat_id)?;
    if !chat_path.exists() {
        return Ok(ChatData { messages: vec![] });
    }
    let content =
        fs::read_to_string(&chat_path).map_err(|e| format!("Failed to read chat data: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse chat data: {}", e))
}

pub fn save_chat_data(chat_id: &str, data: &ChatData) -> Result<(), String> {
    let chat_path = get_chat_file_path(chat_id)?;
    let content = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize chat data: {}", e))?;
    fs::write(&chat_path, content).map_err(|e| format!("Failed to write chat data: {}", e))
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn create_new_chat(model: &str, first_message: &str) -> Result<ChatMeta, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    let file_location = format!(".data/chats/{}.json", id);

    // Generate a title from the first message (truncate to 50 chars)
    let chat_title = if first_message.len() > 50 {
        format!("{}...", &first_message[..50])
    } else {
        first_message.to_string()
    };

    let meta = ChatMeta {
        id: id.clone(),
        chat_title,
        file_location,
        model_used: model.to_string(),
        created_at: now.clone(),
        last_updated_at: now,
    };

    // Save initial empty chat data
    let chat_data = ChatData { messages: vec![] };
    save_chat_data(&id, &chat_data)?;

    // Add to index
    let mut index = load_chats_index()?;
    index.chats.push(meta.clone());
    save_chats_index(&index)?;

    Ok(meta)
}

pub fn update_chat_timestamp(chat_id: &str) -> Result<(), String> {
    let mut index = load_chats_index()?;
    let now = now_iso();
    if let Some(meta) = index.chats.iter_mut().find(|c| c.id == chat_id) {
        meta.last_updated_at = now;
    }
    save_chats_index(&index)
}

#[tauri::command]
pub async fn get_all_chats() -> Result<Vec<ChatMeta>, String> {
    let index = load_chats_index()?;
    Ok(index.chats)
}

#[tauri::command]
pub async fn get_chat_messages(chat_id: String) -> Result<Vec<ChatMessage>, String> {
    let data = load_chat_data(&chat_id)?;
    Ok(data.messages)
}
