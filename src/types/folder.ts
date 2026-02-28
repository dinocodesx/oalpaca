// Represents folder metadata for sidebar folder listing - used in sidebar folder components
export interface FolderMeta {
  id: string;
  name: string;
  workspace_id: string;
  chat_ids: string[];
  tags: string[];
  created_at: string;
  last_updated_at: string;
}
