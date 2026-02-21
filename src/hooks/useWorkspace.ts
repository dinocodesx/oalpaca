import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceMeta, WorkspacesIndex } from "../types/workspace";

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");

  // ──────────────────────────────────────────────
  //  Fetch workspaces
  // ──────────────────────────────────────────────
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

  // ──────────────────────────────────────────────
  //  Workspace actions
  // ──────────────────────────────────────────────

  /** Sets the active workspace on the backend and updates local state. */
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    await invoke("set_active_workspace", { workspaceId });
    setActiveWorkspaceId(workspaceId);
  }, []);

  const createNewWorkspace = useCallback(
    async (name: string) => {
      const ws = await invoke<WorkspaceMeta>("create_workspace", { name });
      await refreshWorkspaces();
      await switchWorkspace(ws.id);
      return ws;
    },
    [refreshWorkspaces, switchWorkspace],
  );

  const renameWorkspaceAction = useCallback(
    async (workspaceId: string, newName: string) => {
      await invoke("rename_workspace", { workspaceId, newName });
      await refreshWorkspaces();
    },
    [refreshWorkspaces],
  );

  /**
   * Deletes a workspace and refreshes the workspace list.
   * Returns the new active workspace ID so the caller can
   * refresh folders / chat history for it.
   */
  const deleteWorkspaceAction = useCallback(
    async (workspaceId: string) => {
      await invoke("delete_workspace", { workspaceId });
      return await refreshWorkspaces();
    },
    [refreshWorkspaces],
  );

  // ──────────────────────────────────────────────
  //  Derived
  // ──────────────────────────────────────────────
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return {
    // State
    workspaces,
    activeWorkspaceId,
    activeWorkspace,

    // Actions
    refreshWorkspaces,
    switchWorkspace,
    createNewWorkspace,
    renameWorkspaceAction,
    deleteWorkspaceAction,
  };
}
