// Represents workspace metadata - used in workspace list and management UI
export interface WorkspaceMeta {
  id: string;
  name: string;
  created_at: string;
  last_updated_at: string;
}

// Represents the workspaces index with all workspaces and active ID - used in useWorkspace state
export interface WorkspacesIndex {
  workspaces: WorkspaceMeta[];
  active_workspace_id: string;
}
