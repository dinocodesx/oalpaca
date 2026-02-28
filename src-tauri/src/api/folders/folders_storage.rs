use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Metadata for a folder containing id, name, workspace_id, list of chat IDs, tags, and timestamps.
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

/// The root structure for the folders index file (folders.json). Contains list of all FolderMeta entries.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FoldersIndex {
    pub folders: Vec<FolderMeta>,
}

/// Returns the path to the .data directory, creating it if it doesn't exist. Used internally for all file operations.
fn get_data_dir() -> Result<PathBuf, String> {
    let data_dir = PathBuf::from("../.data");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create .data directory: {}", e))?;
    }
    Ok(data_dir)
}

/// Returns the path to the folders.json index file. Used internally for loading/saving folders.
fn get_folders_index_path() -> Result<PathBuf, String> {
    let data_dir = get_data_dir()?;
    Ok(data_dir.join("folders.json"))
}

/// Returns the current UTC time as an ISO 8601 RFC3339 string. Used for setting timestamps on folder metadata.
fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Loads the folders index from folders.json, creating it with an empty list if it doesn't exist. Used by Tauri commands to get all folder metadata.
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

/// Saves the folders index to folders.json. Used whenever folder metadata is modified (create, rename, delete, etc.).
pub fn save_folders_index(index: &FoldersIndex) -> Result<(), String> {
    let index_path = get_folders_index_path()?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize folders index: {}", e))?;
    fs::write(&index_path, content).map_err(|e| format!("Failed to write folders index: {}", e))
}

/// Deletes all folders belonging to a workspace and removes them from the index. Called when a workspace is deleted.
pub fn delete_folders_for_workspace(workspace_id: &str) -> Result<(), String> {
    let mut index = load_folders_index()?;
    index.folders.retain(|f| f.workspace_id != workspace_id);
    save_folders_index(&index)
}

/// Tauri command: Returns all folders for a specific workspace. Called from frontend to display folders in sidebar.
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

/// Tauri command: Creates a new folder with the given name in a workspace. Called from frontend when user creates a new folder.
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

/// Tauri command: Renames a folder with a new name. Called from frontend when user edits a folder name.
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

/// Tauri command: Deletes a folder and releases all its chats (sets their folder_id to None). Called from frontend when user deletes a folder.
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

/// Tauri command: Adds a chat to a folder by updating both the folder's chat_ids and the chat's folder_id. Called from frontend when dragging a chat into a folder.
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

/// Tauri command: Removes a chat from a folder by updating both the folder's chat_ids and the chat's folder_id to None. Called from frontend when removing a chat from a folder.
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
