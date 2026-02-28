use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Metadata for a workspace containing id, name, created_at, and last_updated_at timestamps.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub last_updated_at: String,
}

/// The root structure for the workspaces index file (workspaces.json). Contains list of workspaces and the active workspace ID.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspacesIndex {
    pub workspaces: Vec<WorkspaceMeta>,
    pub active_workspace_id: String,
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

/// Returns the path to the workspaces.json index file. Used internally for loading/saving workspaces.
fn get_workspaces_index_path() -> Result<PathBuf, String> {
    let data_dir = get_data_dir()?;
    Ok(data_dir.join("workspaces.json"))
}

/// Returns the current UTC time as an ISO 8601 RFC3339 string. Used for setting timestamps on workspace metadata.
fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Loads the workspaces index from workspaces.json, creating a default workspace if it doesn't exist. Used by Tauri commands to get all workspaces.
pub fn load_workspaces_index() -> Result<WorkspacesIndex, String> {
    let index_path = get_workspaces_index_path()?;
    if !index_path.exists() {
        // Auto-create a default workspace on first run
        let default_id = uuid::Uuid::new_v4().to_string();
        let now = now_iso();
        let default_workspace = WorkspaceMeta {
            id: default_id.clone(),
            name: "My Workspace".to_string(),
            created_at: now.clone(),
            last_updated_at: now,
        };
        let index = WorkspacesIndex {
            workspaces: vec![default_workspace],
            active_workspace_id: default_id,
        };
        save_workspaces_index(&index)?;
        return Ok(index);
    }
    let content = fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read workspaces index: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse workspaces index: {}", e))
}

/// Saves the workspaces index to workspaces.json. Used whenever workspace metadata is modified (create, rename, delete, etc.).
pub fn save_workspaces_index(index: &WorkspacesIndex) -> Result<(), String> {
    let index_path = get_workspaces_index_path()?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize workspaces index: {}", e))?;
    fs::write(&index_path, content).map_err(|e| format!("Failed to write workspaces index: {}", e))
}

/// Tauri command: Returns all workspaces and the active workspace ID. Called from frontend to display workspace list and current workspace.
#[tauri::command]
pub async fn get_all_workspaces() -> Result<WorkspacesIndex, String> {
    load_workspaces_index()
}

/// Tauri command: Creates a new workspace with the given name. Called from frontend when user creates a new workspace.
#[tauri::command]
pub async fn create_workspace(name: String) -> Result<WorkspaceMeta, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Workspace name cannot be empty".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();

    let workspace = WorkspaceMeta {
        id: id.clone(),
        name: trimmed.to_string(),
        created_at: now.clone(),
        last_updated_at: now,
    };

    let mut index = load_workspaces_index()?;
    index.workspaces.push(workspace.clone());
    save_workspaces_index(&index)?;

    Ok(workspace)
}

/// Tauri command: Renames a workspace with a new name. Called from frontend when user edits a workspace name.
#[tauri::command]
pub async fn rename_workspace(workspace_id: String, new_name: String) -> Result<(), String> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err("Workspace name cannot be empty".to_string());
    }

    let mut index = load_workspaces_index()?;
    let now = now_iso();

    let workspace = index
        .workspaces
        .iter_mut()
        .find(|w| w.id == workspace_id)
        .ok_or_else(|| format!("Workspace with id '{}' not found", workspace_id))?;

    workspace.name = trimmed.to_string();
    workspace.last_updated_at = now;

    save_workspaces_index(&index)
}

/// Tauri command: Deletes a workspace and cleans up its folders and chats. Prevents deletion of last workspace. Called from frontend when user deletes a workspace.
#[tauri::command]
pub async fn delete_workspace(workspace_id: String) -> Result<(), String> {
    let mut index = load_workspaces_index()?;

    if index.workspaces.len() <= 1 {
        return Err(
            "Cannot delete the last workspace. At least one workspace must exist.".to_string(),
        );
    }

    let position = index
        .workspaces
        .iter()
        .position(|w| w.id == workspace_id)
        .ok_or_else(|| format!("Workspace with id '{}' not found", workspace_id))?;

    index.workspaces.remove(position);

    // If the active workspace was deleted, switch to the first available one
    if index.active_workspace_id == workspace_id {
        index.active_workspace_id = index
            .workspaces
            .first()
            .map(|w| w.id.clone())
            .unwrap_or_default();
    }

    save_workspaces_index(&index)?;

    // Also clean up folders and chats belonging to this workspace
    // Import and call the cleanup functions
    crate::api::folders::folders_storage::delete_folders_for_workspace(&workspace_id)?;
    crate::api::chats::chat_storage::delete_chats_for_workspace(&workspace_id)?;

    Ok(())
}

/// Tauri command: Sets the active workspace by ID. Called from frontend when user switches between workspaces.
#[tauri::command]
pub async fn set_active_workspace(workspace_id: String) -> Result<(), String> {
    let mut index = load_workspaces_index()?;

    // Verify the workspace exists
    let exists = index.workspaces.iter().any(|w| w.id == workspace_id);
    if !exists {
        return Err(format!("Workspace with id '{}' not found", workspace_id));
    }

    index.active_workspace_id = workspace_id;
    save_workspaces_index(&index)
}
