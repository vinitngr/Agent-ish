import { EventEmitter } from 'events';
import { ToolResult } from '../types/Tool';

type EventMap = Record<string, unknown[]>;

export class EventBus<T extends EventMap = EventMap> {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends keyof T & string>(
    event: K,
    listener: (...args: T[K] extends unknown[] ? T[K] : never[]) => void
  ): void {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof T & string>(
    event: K,
    listener: (...args: T[K] extends unknown[] ? T[K] : never[]) => void
  ): void {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof T & string>(
    event: K,
    listener: (...args: T[K] extends unknown[] ? T[K] : never[]) => void
  ): void {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
  }

  emit<K extends keyof T & string>(
    event: K,
    ...args: T[K] extends unknown[] ? T[K] : never[]
  ): void {
    this.emitter.emit(event, ...args);
  }

  removeAllListeners(event?: string): void {
    this.emitter.removeAllListeners(event);
  }
}

export type AgentEvents = {
  'lifecycle:change': [state: string, previous: string];
  'tool:registered': [name: string];
  'tool:unregistered': [name: string];
  'tool:executed': [name: string, args: Record<string, unknown>, result: ToolResult, duration: number];
  'skill:registered': [name: string];
  'skill:unregistered': [name: string];
  'skill:executed': [name: string];
  'provider:registered': [type: string, name: string];
  'interface:registered': [name: string];
  'interface:input': [interfaceName: string, input: string];
  'interface:output': [interfaceName: string, output: string];
  'plugin:registered': [name: string];
  'pipeline:start': [name: string];
  'pipeline:complete': [name: string, duration: number];
  'pipeline:error': [name: string, error: Error];
  'orchestrator:think': [sessionId: string];
  'orchestrator:act': [sessionId: string, action: string];
  'orchestrator:observe': [sessionId: string, result: unknown];
  'error': [error: Error];
};

export const eventBus = new EventBus<AgentEvents>();
