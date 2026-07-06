import { Agent } from '../Agent';
import { IPlugin } from '../types/Plugin';
import { EventBus } from '../utils/events';
import { logger } from '../utils/logger';

const log = logger.child('registry:plugin');

export class PluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  private eventBus: EventBus;
  private agent: Agent;

  constructor(agent: Agent, eventBus: EventBus) {
    this.agent = agent;
    this.eventBus = eventBus;
  }

  async register(plugin: IPlugin, options?: any): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      log.warn(`Plugin already registered: ${plugin.name}`);
      return;
    }

    try {
      log.info(`Registering plugin: ${plugin.name} v${plugin.version}`);
      await plugin.register(this.agent, options);
      this.plugins.set(plugin.name, plugin);
      this.eventBus.emit('plugin:registered', plugin.name);
    } catch (error) {
      log.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  get(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}
