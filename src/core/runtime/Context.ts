import { IContext, AgentConfig, RuntimeConfig } from '../types/Runtime';
import { ToolRegistry } from '../registry/ToolRegistry';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import { AgentEvents, EventBus } from '../utils/events';

export class Context implements IContext {
  readonly sessionId: string;
  readonly config: AgentConfig;
  readonly runtimeConfig: RuntimeConfig;
  readonly tools: ToolRegistry;
  readonly providers: ProviderRegistry;
  readonly eventBus: EventBus<AgentEvents>;

  private store: Map<string, unknown> = new Map();

  constructor(
    config: AgentConfig,
    runtimeConfig: RuntimeConfig,
    tools: ToolRegistry,
    providers: ProviderRegistry,
    eventBus: EventBus<AgentEvents>
  ) {
    this.sessionId = this.generateId();
    this.config = config;
    this.runtimeConfig = runtimeConfig;
    this.tools = tools;
    this.providers = providers;
    this.eventBus = eventBus;
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  registerExtension<T>(name: string, instance: T): void {
    this.set(name, instance);
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
