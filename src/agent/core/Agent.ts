import { IPlugin } from '../../types/Plugin';
import { AgentConfig } from '../../types/Runtime';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { ConfigLoader, FullConfig } from './ConfigLoader';
import { Lifecycle } from './Lifecycle';
import { Context } from '../runtime/Context';
import { ToolRegistry } from '../registry/ToolRegistry';
import { SkillRegistry } from '../registry/SkillRegistry';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import { PluginRegistry } from '../registry/PluginRegistry';
import { InterfaceRegistry } from '../registry/InterfaceRegistry';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { LLMPlanner } from '../orchestrator/LLMPlanner';
import { ToolExecutor } from '../orchestrator/ToolExecutor';
import { IPlanner } from '../orchestrator/Planner';
import { DATAULT_AGENT_CONFIG } from '../../types/AgentConfig';

const log = logger.child('agent');

export class Agent {
  readonly eventBus: EventBus<AgentEvents>;
  readonly tools: ToolRegistry;
  readonly skills: SkillRegistry;
  readonly providers: ProviderRegistry;
  readonly interfaces: InterfaceRegistry;

  private pluginRegistry: PluginRegistry;
  private lifecycle: Lifecycle;
  private configLoader: ConfigLoader;
  private fullConfig!: FullConfig;
  private context!: Context;
  private orchestrator!: Orchestrator;
  private customPlanner: IPlanner | null = null;

  constructor(private configDir: string) {
    this.eventBus = new EventBus<AgentEvents>();
    this.lifecycle = new Lifecycle(this.eventBus);
    this.configLoader = new ConfigLoader(configDir);
    this.fullConfig = this.configLoader.load(); // Load immediately

    this.tools = new ToolRegistry(this.eventBus);
    this.skills = new SkillRegistry(this.eventBus);
    this.providers = new ProviderRegistry(this.eventBus);
    this.interfaces = new InterfaceRegistry(this.eventBus);
    this.pluginRegistry = new PluginRegistry(this, this.eventBus);
  }

  get config(): AgentConfig {
    return this.fullConfig?.agent;
  }

  setPlanner(planner: IPlanner): void {
    this.customPlanner = planner;
    if (this.orchestrator) {
      this.orchestrator.setPlanner(planner);
    }
    log.info(`Planner set to: ${planner.constructor.name}`);
  }

  async use(plugin: IPlugin): Promise<void> {
    await this.pluginRegistry.register(plugin);
  }

  async init(): Promise<void> {
    await this.lifecycle.transitionTo('INITIALIZING' as any);
    
    this.context = new Context(
      this.fullConfig.agent,
      this.fullConfig.runtime,
      this.tools,
      this.skills,
      this.providers,
      this.eventBus
    );

    await this.lifecycle.transitionTo('READY' as any);
    log.info('Agent initialized');
  }

  async boot(): Promise<void> {
    const agentConfig = DATAULT_AGENT_CONFIG;

    const toolExecutor = new ToolExecutor(
      this.context,
      agentConfig.tools,
      this.eventBus
    );

    const planner = this.customPlanner || new LLMPlanner(
      this.context,
      agentConfig.planner,
      this.eventBus
    );

    this.orchestrator = new Orchestrator(
      this.context,
      this.eventBus,
      planner,
      toolExecutor
    );

    for (const iface of this.interfaces.getAll()) {
      await iface.start(this.context);
      iface.onInput((input: string) => this.orchestrator.handleInput(input));
    }

    log.info('Agent booted');
  }

  async run(): Promise<void> {
    await this.lifecycle.transitionTo('RUNNING' as any);
    log.info('Agent running');

    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.lifecycle.isStopped()) return resolve();
        setTimeout(check, 1000);
      };
      check();
    });
  }

  async handleInput(input: string): Promise<string> {
    if (!this.orchestrator) throw new Error('Agent not booted');
    return this.orchestrator.handleInput(input);
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down...');
    await this.lifecycle.transitionTo('SHUTTING_DOWN' as any);

    for (const iface of this.interfaces.getAll()) {
      await iface.stop();
    }

    await this.lifecycle.transitionTo('STOPPED' as any);
    log.info('Agent stopped');
  }
}
