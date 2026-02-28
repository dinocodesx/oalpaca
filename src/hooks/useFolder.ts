import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FolderMeta } from "../types/folder";

/**
 * Custom hook for managing folder operations in the frontend.
 * Provides state and actions for creating, renaming, deleting, and refreshing
 * folders within a workspace. Used by the sidebar to manage chat organization.
 * 
 * @param activeWorkspaceId - The ID of the currently active workspace
 * @returns Folder state and management actions
 */
export function useFolder(activeWorkspaceId: string) {
  const [folders, setFolders] = useState<FolderMeta[]>([]);

  /**
   * Fetches all folders for a workspace from the backend.
   * Called on initial load and after any folder operations to keep the
   * sidebar in sync with backend data. Updates the folders state.
   * 
   * @param wsId - Optional workspace ID; defaults to activeWorkspaceId if not provided
   */
  const refreshFolders = useCallback(
    async (wsId?: string) => {
      const id = wsId ?? activeWorkspaceId;
      if (!id) return;
      try {
        const result = await invoke<FolderMeta[]>("get_folders_for_workspace", {
          workspaceId: id,
        });
        setFolders(result);
      } catch (err) {
        console.error("Failed to fetch folders:", err);
      }
    },
    [activeWorkspaceId],
  );

  useEffect(() => {
    if (activeWorkspaceId) {
      refreshFolders(activeWorkspaceId);
    }
  }, [activeWorkspaceId, refreshFolders]);

  /**
   * Creates a new folder in the active workspace.
   * Calls the backend to create the folder with the given name, then
   * refreshes the folder list. Throws error on failure for caller to handle.
   * Called from the sidebar when user creates a new folder via inline form.
   * 
   * @param name - The name for the new folder
   */
  const createNewFolder = useCallback(
    async (name: string) => {
      if (!activeWorkspaceId) return;
      try {
        await invoke("create_folder", {
          workspaceId: activeWorkspaceId,
          name,
        });
        await refreshFolders();
      } catch (err) {
        console.error("Failed to create folder:", err);
        throw err;
      }
    },
    [activeWorkspaceId, refreshFolders],
  );

  /**
   * Renames an existing folder.
   * Updates the folder name in the backend and refreshes the folder list.
   * Called from the sidebar when user edits a folder name via inline input
   * or context menu action.
   * 
   * @param folderId - The ID of the folder to rename
   * @param newName - The new name for the folder
   */
  const renameFolderAction = useCallback(
    async (folderId: string, newName: string) => {
      try {
        await invoke("rename_folder", { folderId, newName });
        await refreshFolders();
      } catch (err) {
        console.error("Failed to rename folder:", err);
        throw err;
      }
    },
    [refreshFolders],
  );

  /**
   * Deletes a folder from the workspace.
   * Removes the folder from the backend and refreshes the folder list.
   * Note: Chats in the folder are not deleted but become loose chats.
   * Called from the sidebar when user deletes a folder via context menu.
   * 
   * @param folderId - The ID of the folder to delete
   */
  const deleteFolderAction = useCallback(
    async (folderId: string) => {
      try {
        await invoke("delete_folder", { folderId });
        await refreshFolders();
      } catch (err) {
        console.error("Failed to delete folder:", err);
        throw err;
      }
    },
    [refreshFolders],
  );

  return {
    folders,
    refreshFolders,
    createNewFolder,
    renameFolderAction,
    deleteFolderAction,
  };
}
