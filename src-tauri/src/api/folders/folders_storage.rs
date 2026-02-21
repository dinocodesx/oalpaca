use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderMeta {
    pub id: String,
    pub name: String,
    pub workspace_id: String,
    pub chat_ids: Vec<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub last_updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FoldersIndex {
    pub folders: Vec<FolderMeta>,
}

fn get_data_dir() -> Result<PathBuf, String> {
    let data_dir = PathBuf::from("../.data");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create .data directory: {}", e))?;
    }
    Ok(data_dir)
}

fn get_folders_index_path() -> Result<PathBuf, String> {
    let data_dir = get_data_dir()?;
    Ok(data_dir.join("folders.json"))
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn load_folders_index() -> Result<FoldersIndex, String> {
    let index_path = get_folders_index_path()?;
    if !index_path.exists() {
        let index = FoldersIndex { folders: vec![] };
        save_folders_index(&index)?;
        return Ok(index);
    }
    let content = fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read folders index: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse folders index: {}", e))
}

pub fn save_folders_index(index: &FoldersIndex) -> Result<(), String> {
    let index_path = get_folders_index_path()?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize folders index: {}", e))?;
    fs::write(&index_path, content).map_err(|e| format!("Failed to write folders index: {}", e))
}

/// Delete all folders belonging to a given workspace (called when a workspace is deleted).
pub fn delete_folders_for_workspace(workspace_id: &str) -> Result<(), String> {
    let mut index = load_folders_index()?;
    index.folders.retain(|f| f.workspace_id != workspace_id);
    save_folders_index(&index)
}

#[tauri::command]
pub async fn get_folders_for_workspace(workspace_id: String) -> Result<Vec<FolderMeta>, String> {
    let index = load_folders_index()?;
    let filtered: Vec<FolderMeta> = index
        .folders
        .into_iter()
        .filter(|f| f.workspace_id == workspace_id)
        .collect();
    Ok(filtered)
}

#[tauri::command]
pub async fn create_folder(workspace_id: String, name: String) -> Result<FolderMeta, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Folder name cannot be empty".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();

    let folder = FolderMeta {
        id: id.clone(),
        name: trimmed.to_string(),
        workspace_id,
        chat_ids: vec![],
        tags: vec![],
        created_at: now.clone(),
        last_updated_at: now,
    };

    let mut index = load_folders_index()?;
    index.folders.push(folder.clone());
    save_folders_index(&index)?;

    Ok(folder)
}

#[tauri::command]
pub async fn rename_folder(folder_id: String, new_name: String) -> Result<(), String> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err("Folder name cannot be empty".to_string());
    }

    let mut index = load_folders_index()?;
    let now = now_iso();

    let folder = index
        .folders
        .iter_mut()
        .find(|f| f.id == folder_id)
        .ok_or_else(|| format!("Folder with id '{}' not found", folder_id))?;

    folder.name = trimmed.to_string();
    folder.last_updated_at = now;

    save_folders_index(&index)
}

#[tauri::command]
pub async fn delete_folder(folder_id: String) -> Result<(), String> {
    let mut index = load_folders_index()?;

    let position = index
        .folders
        .iter()
        .position(|f| f.id == folder_id)
        .ok_or_else(|| format!("Folder with id '{}' not found", folder_id))?;

    let folder = &index.folders[position];

    // Move chats out of the folder (set their folder_id to None)
    let chat_ids_to_release: Vec<String> = folder.chat_ids.clone();
    index.folders.remove(position);
    save_folders_index(&index)?;

    // Update each chat to remove the folder_id association
    for chat_id in &chat_ids_to_release {
        let _ = crate::api::chats::chat_storage::remove_chat_from_folder(chat_id);
    }

    Ok(())
}

#[tauri::command]
pub async fn add_chat_to_folder(folder_id: String, chat_id: String) -> Result<(), String> {
    let mut index = load_folders_index()?;
    let now = now_iso();

    let folder = index
        .folders
        .iter_mut()
        .find(|f| f.id == folder_id)
        .ok_or_else(|| format!("Folder with id '{}' not found", folder_id))?;

    // Don't add duplicates
    if !folder.chat_ids.contains(&chat_id) {
        folder.chat_ids.push(chat_id.clone());
        folder.last_updated_at = now;
    }

    save_folders_index(&index)?;

    // Update the chat's folder_id reference
    crate::api::chats::chat_storage::set_chat_folder(&chat_id, Some(folder_id))?;

    Ok(())
}

#[tauri::command]
pub async fn remove_chat_from_folder_cmd(folder_id: String, chat_id: String) -> Result<(), String> {
    let mut index = load_folders_index()?;
    let now = now_iso();

    let folder = index
        .folders
        .iter_mut()
        .find(|f| f.id == folder_id)
        .ok_or_else(|| format!("Folder with id '{}' not found", folder_id))?;

    folder.chat_ids.retain(|id| id != &chat_id);
    folder.last_updated_at = now;

    save_folders_index(&index)?;

    // Update the chat's folder_id reference
    crate::api::chats::chat_storage::remove_chat_from_folder(&chat_id)?;

    Ok(())
}
