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
import { ISessionStore, MemorySessionStore } from '../runtime/SessionStore';
import { ConsentManager } from '../consent/ConsentManager';
import { ConsentDecision } from '../../types/Consent';
import { DATAULT_AGENT_CONFIG } from '../../types/AgentConfig';
import { ToolCall } from '../../types/Provider';

const log = logger.child('agent');

export class Agent {
  readonly eventBus: EventBus<AgentEvents>;
  readonly tools: ToolRegistry;
  readonly skills: SkillRegistry;
  readonly providers: ProviderRegistry;
  readonly interfaces: InterfaceRegistry;
  readonly consentManager: ConsentManager;

  private pluginRegistry: PluginRegistry;
  private lifecycle: Lifecycle;
  private configLoader: ConfigLoader;
  private fullConfig!: FullConfig;
  private context!: Context;
  private orchestrator!: Orchestrator;
  private customPlanner: IPlanner | null = null;
  private sessionStore: ISessionStore;
  private middlewares: Array<(call: ToolCall) => boolean | string | Promise<boolean | string>> = [];

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
    this.sessionStore = new MemorySessionStore();
    this.consentManager = new ConsentManager();
    this.setupDefaultMiddlewares();
  }

  private setupDefaultMiddlewares(): void {
    this.addMiddleware(async (call) => {
      if (this.config.agent?.consent === false) return true;
      if (call.metadata?.isTrusted === true) return true;

      const tool = await this.tools.get(call.name);
      if (!tool || !tool.requiresConsent) return true;

      const decision = await this.consentManager.check({
        toolName: call.name,
        args: call.arguments as any,
        description: tool.description,
        metadata: call.metadata
      });

      const allowed = decision === ConsentDecision.ALLOW || decision === ConsentDecision.ALLOW_SESSION;
      
      if (!allowed) {
        return `⚠️ Access Denied: This tool requires your permission. Type '/allow ${call.name}' or '/allow ${call.name.split('.')[0]}' to proceed.`;
      }

      return true;
    });
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

  setSessionStore(store: ISessionStore): void {
    this.sessionStore = store;
    log.info(`Session store set to: ${store.constructor.name}`);
  }

  async use(plugin: IPlugin, options?: any): Promise<void> {
    await this.pluginRegistry.register(plugin, options);
  }

  async loadPluginsFrom(directory: string, options: { monitoring?: boolean } = {}): Promise<void> {
    const path = await import('path');
    const fs = await import('fs');
    const absolutePath = path.resolve(process.cwd(), directory);

    if (!fs.existsSync(absolutePath)) {
      log.info(`Creating plugin directory: ${absolutePath}`);
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    const load = async (pluginPath: string) => {
      try {
        const resolvedPath = require.resolve(pluginPath);
        if (require.cache[resolvedPath]) {
          delete require.cache[resolvedPath];
        }
        
        const module = await import(pluginPath);
        const PluginClass = module.default || Object.values(module)[0];
        
        if (typeof PluginClass === 'function') {
          await this.use(new PluginClass());
        }
      } catch (error) {
        log.error(`Failed to load plugin from ${pluginPath}:`, error);
      }
    };

    const items = fs.readdirSync(absolutePath);
    for (const item of items) {
      const itemPath = path.join(absolutePath, item);
      if (fs.statSync(itemPath).isDirectory() || item.endsWith('.ts') || item.endsWith('.js')) {
        await load(itemPath);
      }
    }

    if (options.monitoring) {
      const chokidar = await import('chokidar');
      chokidar.watch(absolutePath, { 
        ignoreInitial: true,
        depth: 0 
      }).on('add', async (filePath) => {
        log.info(`New plugin detected: ${filePath}`);
        await load(filePath);
      }).on('change', async (filePath) => {
        log.info(`Plugin change detected: ${filePath}`);
        await load(filePath);
      }).on('addDir', async (dirPath) => {
        log.info(`New plugin directory detected: ${dirPath}`);
        await load(dirPath);
      });
    }
  }

  async loadSkillsFrom(directory: string, options: { monitoring?: boolean } = {}): Promise<void> {
    const { MarkdownSkillLoader } = await import('../../skills/loaders/MarkdownSkillLoader');
    const skillLoader = new MarkdownSkillLoader();
    const path = await import('path');
    const absoluteDir = path.resolve(process.cwd(), directory);

    const skills = await skillLoader.loadSkills(absoluteDir);
    for (const skill of skills) {
      this.skills.register(skill);
    }

    if (options.monitoring) {
      skillLoader.watch(absoluteDir, 
        (skill: any) => this.skills.register(skill),
        (name: string) => this.skills.unregister(name)
      );
    }
    log.info(`Loaded ${skills.length} skills from ${directory}`);
  }

  async init(options: any = {}): Promise<void> {
    await this.lifecycle.transitionTo('INITIALIZING' as any);
    
    this.context = new Context(
      this.fullConfig.agent,
      this.fullConfig.runtime,
      this.tools,
      this.skills,
      this.providers,
      this.eventBus,
      this.consentManager
    );

    await this.lifecycle.transitionTo('READY' as any);
    log.info('Agent initialized');
  }

  async boot(options: any = {}): Promise<void> {
    const agentConfig = DATAULT_AGENT_CONFIG;

    const toolExecutor = new ToolExecutor(
      this.context,
      agentConfig.tools,
      this.eventBus,
      this.middlewares
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
      toolExecutor,
      this.sessionStore
    );

    for (const iface of this.interfaces.getAll()) {
      await iface.start(this.context);
      iface.onInput((input: string) => this.orchestrator.handleInput(input, { 
        sessionId: this.context.sessionId,
        metadata: { 
          interface: iface.name,
          isTrusted: iface.isTrusted 
        } 
      }));
    }

    log.info('Agent booted');
  }

  async run(options: any = {}): Promise<void> {
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

  private inputInterceptors: Array<(input: string, options?: any) => Promise<string | null>> = [];

  addInputInterceptor(fn: (input: string, options?: any) => Promise<string | null>): void {
    this.inputInterceptors.push(fn);
  }

  async handleInput(input: string): Promise<string> {
    if (!this.orchestrator) throw new Error('Agent not booted');
    return this.processInput(input);
  }

  async execute(input: string, options?: { model?: string; sessionId?: string; metadata?: Record<string, any>; [key: string]: any }): Promise<string> {
    if (!this.orchestrator) await this.boot();
   
    return this.processInput(input, options);
  }

  private async processInput(input: string, options?: any): Promise<string> {
    for (const interceptor of this.inputInterceptors) {
      const result = await interceptor(input, options);
      if (result !== null) {
        return result;
      }
    }
    return this.orchestrator.handleInput(input, options);
  }

  addMiddleware(fn: (call: ToolCall) => boolean | string | Promise<boolean | string>): void {
    this.middlewares.push(fn);
  }

  inspect(): Record<string, any> {
    return {
      config: this.config,
      lifecycle: this.lifecycle.getState(),
      tools: this.tools.list(),
      skills: this.skills.list(),
      providers: this.providers.listActive(),
      interfaces: this.interfaces.getAll().map(i => i.name),
      plugins: this.pluginRegistry.list()
    };
  }

  on(event: keyof AgentEvents, handler: (...args: any[]) => void): void {
    this.eventBus.on(event, handler);
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
