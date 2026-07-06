
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface CompletionRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  responseFormat?: 'text' | 'json_object';
  tools?: any[];
}

export interface CompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CompletionChunk {
  content: string;
  delta?: string;
}

export interface ModelConfig {
  id: string;
  providerId: string;
  contextWindow: number;
  description?: string;
}
