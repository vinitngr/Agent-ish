import { IContext, AgentConfig, RuntimeConfig } from '../../types/Runtime';
import { ToolRegistry } from '../registry/ToolRegistry';
import { SkillRegistry } from '../registry/SkillRegistry';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import { AgentEvents, EventBus } from '../../utils/events';
import { ConsentManager } from '../consent/ConsentManager';

export class Context implements IContext {
  readonly sessionId: string;
  readonly config: AgentConfig;
  readonly runtimeConfig: RuntimeConfig;
  readonly tools: ToolRegistry;
  readonly skills: SkillRegistry;
  readonly providers: ProviderRegistry;
  readonly eventBus: EventBus<AgentEvents>;
  readonly consentManager: ConsentManager;

  private store: Map<string, unknown> = new Map();

  constructor(
    config: AgentConfig,
    runtimeConfig: RuntimeConfig,
    tools: ToolRegistry,
    skills: SkillRegistry,
    providers: ProviderRegistry,
    eventBus: EventBus<AgentEvents>,
    consentManager: ConsentManager
  ) {
    this.sessionId = this.generateId();
    this.config = config;
    this.runtimeConfig = runtimeConfig;
    this.tools = tools;
    this.skills = skills;
    this.providers = providers;
    this.eventBus = eventBus;
    this.consentManager = consentManager;
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
