export interface ProviderConfig {
  name: string;
  type: 'llm' | 'memory' | 'embeddings';
  options: Record<string, unknown>;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: LLMToolDefinition[];
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ILLMProvider {
  name: string;
  initialize(config: ProviderConfig): Promise<void>;
  chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
  shutdown(): Promise<void>;
}

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface MemorySearchOptions {
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface IMemoryProvider {
  name: string;
  initialize(config: ProviderConfig): Promise<void>;
  store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  search(options: MemorySearchOptions): Promise<MemoryEntry[]>;
  delete(id: string): Promise<boolean>;
  shutdown(): Promise<void>;
}

export interface IEmbeddingProvider {
  name: string;
  initialize(config: ProviderConfig): Promise<void>;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  shutdown(): Promise<void>;
}
