export type LexyraAiStatus = 'checking' | 'online' | 'offline' | 'generating' | 'error';

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: Record<string, unknown>;
}

export interface OllamaGenerateChunk {
  model?: string;
  created_at?: string;
  response?: string;
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  eval_count?: number;
}

export interface LexyraAiRequest {
  action: string;
  text: string;
  instruction?: string;
  language?: string;
}

export interface LexyraAiAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  instruction: string;
}
