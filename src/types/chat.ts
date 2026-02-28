// Represents a single chat message with role and content - used in ChatBox message rendering
export interface ChatMessage {
  role: string;
  content: string;
}

// Represents a streaming chunk event from backend during chat generation - used in useChat streaming listener
export interface ChatStreamEvent {
  chat_id: string;
  content: string;
  done: boolean;
  done_reason: string | null;
}

// Represents a streaming error event from backend - used in useChat error listener
export interface ChatStreamError {
  chat_id: string;
  error: string;
}

// Represents chat metadata for sidebar listing - used in sidebar chat list and history
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
