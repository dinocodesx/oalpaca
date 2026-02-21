export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatStreamEvent {
  chat_id: string;
  content: string;
  done: boolean;
  done_reason: string | null;
}

export interface ChatStreamError {
  chat_id: string;
  error: string;
}

export interface ChatMeta {
  id: string;
  chat_title: string;
  file_location: string;
  model_used: string;
  workspace_id: string;
  folder_id: string | null;
  created_at: string;
  last_updated_at: string;
}
