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
    pub workspace_id: String,
    #[serde(default)]
    pub folder_id: Option<String>,
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

pub fn create_new_chat(
    model: &str,
    first_message: &str,
    workspace_id: &str,
    folder_id: Option<String>,
) -> Result<ChatMeta, String> {
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
        workspace_id: workspace_id.to_string(),
        folder_id,
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

// Set the folder_id on a chat (used when adding a chat to a folder).
pub fn set_chat_folder(chat_id: &str, folder_id: Option<String>) -> Result<(), String> {
    let mut index = load_chats_index()?;
    let now = now_iso();
    if let Some(meta) = index.chats.iter_mut().find(|c| c.id == chat_id) {
        meta.folder_id = folder_id;
        meta.last_updated_at = now;
    }
    save_chats_index(&index)
}

// Remove the folder association from a chat (set folder_id to None).
pub fn remove_chat_from_folder(chat_id: &str) -> Result<(), String> {
    set_chat_folder(chat_id, None)
}

// Delete all chats belonging to a given workspace (called when a workspace is deleted).
pub fn delete_chats_for_workspace(workspace_id: &str) -> Result<(), String> {
    let mut index = load_chats_index()?;

    // Collect chat ids to delete their files
    let to_delete: Vec<String> = index
        .chats
        .iter()
        .filter(|c| c.workspace_id == workspace_id)
        .map(|c| c.id.clone())
        .collect();

    // Remove chat files
    for chat_id in &to_delete {
        if let Ok(path) = get_chat_file_path(chat_id) {
            let _ = fs::remove_file(path);
        }
    }

    // Remove from index
    index.chats.retain(|c| c.workspace_id != workspace_id);
    save_chats_index(&index)
}

// Tauri Commands

#[tauri::command]
pub async fn get_all_chats() -> Result<Vec<ChatMeta>, String> {
    let index = load_chats_index()?;
    Ok(index.chats)
}

#[tauri::command]
pub async fn get_chats_for_workspace(workspace_id: String) -> Result<Vec<ChatMeta>, String> {
    let index = load_chats_index()?;
    let filtered: Vec<ChatMeta> = index
        .chats
        .into_iter()
        .filter(|c| c.workspace_id == workspace_id)
        .collect();
    Ok(filtered)
}

#[tauri::command]
pub async fn get_chat_messages(chat_id: String) -> Result<Vec<ChatMessage>, String> {
    let data = load_chat_data(&chat_id)?;
    Ok(data.messages)
}

#[tauri::command]
pub async fn rename_chat(chat_id: String, new_title: String) -> Result<(), String> {
    let trimmed = new_title.trim();
    if trimmed.is_empty() {
        return Err("Chat title cannot be empty".to_string());
    }

    let mut index = load_chats_index()?;
    let now = now_iso();

    let chat = index
        .chats
        .iter_mut()
        .find(|c| c.id == chat_id)
        .ok_or_else(|| format!("Chat with id '{}' not found", chat_id))?;

    chat.chat_title = trimmed.to_string();
    chat.last_updated_at = now;

    save_chats_index(&index)
}

#[tauri::command]
pub async fn delete_chat(chat_id: String) -> Result<(), String> {
    let mut index = load_chats_index()?;

    let position = index
        .chats
        .iter()
        .position(|c| c.id == chat_id)
        .ok_or_else(|| format!("Chat with id '{}' not found", chat_id))?;

    let chat = &index.chats[position];

    // If the chat belongs to a folder, remove it from the folder's chat_ids list
    if let Some(ref fid) = chat.folder_id {
        let _ = remove_chat_from_folder_list(fid, &chat_id);
    }

    index.chats.remove(position);
    save_chats_index(&index)?;

    // Delete the chat data file
    if let Ok(path) = get_chat_file_path(&chat_id) {
        let _ = fs::remove_file(path);
    }

    Ok(())
}

#[tauri::command]
pub async fn search_chats(workspace_id: String, query: String) -> Result<Vec<ChatMeta>, String> {
    let index = load_chats_index()?;
    let query_lower = query.trim().to_lowercase();

    if query_lower.is_empty() {
        // Return all chats for the workspace
        let filtered: Vec<ChatMeta> = index
            .chats
            .into_iter()
            .filter(|c| c.workspace_id == workspace_id)
            .collect();
        return Ok(filtered);
    }

    let filtered: Vec<ChatMeta> = index
        .chats
        .into_iter()
        .filter(|c| {
            c.workspace_id == workspace_id && c.chat_title.to_lowercase().contains(&query_lower)
        })
        .collect();

    Ok(filtered)
}

/// Helper: remove a chat_id from a folder's chat_ids list.
/// This is called internally when deleting a chat that belongs to a folder.
fn remove_chat_from_folder_list(folder_id: &str, chat_id: &str) -> Result<(), String> {
    let mut folders_index = crate::api::folders::folders_storage::load_folders_index()?;

    if let Some(folder) = folders_index.folders.iter_mut().find(|f| f.id == folder_id) {
        folder.chat_ids.retain(|id| id != chat_id);
    }

    crate::api::folders::folders_storage::save_folders_index(&folders_index)
}
