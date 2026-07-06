import { AgentEvents, EventBus } from '../utils/events';

export enum LifecycleState {
  CREATED = 'CREATED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  SHUTTING_DOWN = 'SHUTTING_DOWN',
  STOPPED = 'STOPPED',
}

export type LifecycleHook = (state: LifecycleState) => Promise<void> | void;

export interface AgentConfig {
  agent: {
    name: string;
    version: string;
    consent?: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    directory: string;
  };
  modules: {
    tools: string[];
    interfaces: string[];
  };
  monitoring?: {
    config?: boolean;
    plugins?: boolean;
  };
}

export interface RuntimeConfig {
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  lazyLoad: boolean;
  storage: {
    memory: string;
    logs: string;
    cache: string;
  };
  showToolResults: boolean;
}

export interface ProvidersConfig {
  llm: {
    default: string | null;
    adapters: Record<string, Record<string, unknown>>;
  };
  memory: {
    default: string | null;
    adapters: Record<string, Record<string, unknown>>;
  };
  embeddings: {
    default: string | null;
    adapters: Record<string, Record<string, unknown>>;
  };
}



export interface IContext {
  sessionId: string;
  config: AgentConfig;
  runtimeConfig: RuntimeConfig;
  eventBus: EventBus<AgentEvents>;
  
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface ISession {
  id: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
  history: SessionMessage[];
  addMessage(message: SessionMessage): void;
  getHistory(): SessionMessage[];
  clear(): void;
}

import { ToolCall } from './Provider';

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface IInterface {
  name: string;
  isTrusted?: boolean;
  start(context: IContext): Promise<void>;
  stop(): Promise<void>;
  onInput(handler: (input: string) => Promise<string>): void;
}
