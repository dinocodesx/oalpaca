import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceMeta, WorkspacesIndex } from "../types/workspace";

/**
 * Custom hook for managing workspace operations in the frontend.
 * Provides state and actions for switching, creating, renaming, deleting,
 * and refreshing workspaces. Used by the sidebar workspace dropdown and
 * app-level workspace management.
 * 
 * @returns Workspace state and management actions
 */
export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");

  /**
   * Fetches all workspaces and the currently active workspace from the backend.
   * Called on initial app load and after any workspace operations.
   * Updates workspaces and activeWorkspaceId state. Returns the active workspace ID.
   */
  const refreshWorkspaces = useCallback(async () => {
    try {
      const result = await invoke<WorkspacesIndex>("get_all_workspaces");
      setWorkspaces(result.workspaces);
      setActiveWorkspaceId(result.active_workspace_id);
      return result.active_workspace_id;
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
      return "";
    }
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  /**
   * Switches the active workspace to a different one.
   * Calls the backend to set the active workspace and updates local state.
   * When switching, the chat history and folders should be refreshed by
   * the calling component. Used when user selects a different workspace
   * from the sidebar dropdown.
   * 
   * @param workspaceId - The ID of the workspace to switch to
   */
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    await invoke("set_active_workspace", { workspaceId });
    setActiveWorkspaceId(workspaceId);
  }, []);

  /**
   * Creates a new workspace and switches to it.
   * Calls the backend to create a workspace with the given name,
   * refreshes the workspace list, and automatically switches to
   * the newly created workspace. Returns the created workspace object.
   * Called from the sidebar when user creates a new workspace.
   * 
   * @param name - The name for the new workspace
   * @returns The created workspace object
   */
  const createNewWorkspace = useCallback(
    async (name: string) => {
      const ws = await invoke<WorkspaceMeta>("create_workspace", { name });
      await refreshWorkspaces();
      await switchWorkspace(ws.id);
      return ws;
    },
    [refreshWorkspaces, switchWorkspace],
  );

  /**
   * Renames an existing workspace.
   * Updates the workspace name in the backend and refreshes the workspace list.
   * Called from the sidebar workspace dropdown when user edits a workspace name.
   * 
   * @param workspaceId - The ID of the workspace to rename
   * @param newName - The new name for the workspace
   */
  const renameWorkspaceAction = useCallback(
    async (workspaceId: string, newName: string) => {
      await invoke("rename_workspace", { workspaceId, newName });
      await refreshWorkspaces();
    },
    [refreshWorkspaces],
  );

  /**
   * Deletes a workspace from the backend.
   * Removes the workspace and all its chats/folders. Refreshes the workspace list
   * after deletion. If the deleted workspace was active, the UI should handle
   * switching to another workspace. Called from sidebar dropdown context menu.
   * 
   * @param workspaceId - The ID of the workspace to delete
   */
  const deleteWorkspaceAction = useCallback(
    async (workspaceId: string) => {
      await invoke("delete_workspace", { workspaceId });
      return await refreshWorkspaces();
    },
    [refreshWorkspaces],
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    refreshWorkspaces,
    switchWorkspace,
    createNewWorkspace,
    renameWorkspaceAction,
    deleteWorkspaceAction,
  };
}
