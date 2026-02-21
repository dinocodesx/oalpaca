import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FolderMeta } from "../types/folder";

export function useFolder(activeWorkspaceId: string) {
  const [folders, setFolders] = useState<FolderMeta[]>([]);

  //  Fetch folders for the active workspace
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

  //  Folder actions

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
   * Deletes a folder and refreshes the folder list.
   * Note: the caller is responsible for refreshing chat history
   * afterwards, since folder deletion may affect chat metadata.
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
    // State
    folders,

    // Actions
    refreshFolders,
    createNewFolder,
    renameFolderAction,
    deleteFolderAction,
  };
}
