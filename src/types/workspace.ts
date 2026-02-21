export interface WorkspaceMeta {
  id: string;
  name: string;
  created_at: string;
  last_updated_at: string;
}

export interface WorkspacesIndex {
  workspaces: WorkspaceMeta[];
  active_workspace_id: string;
}
