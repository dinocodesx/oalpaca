export interface ChatMessage {
  role: string;
  content: string;
}

export interface ModelDetails {
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface Model {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
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
  created_at: string;
  last_updated_at: string;
}
