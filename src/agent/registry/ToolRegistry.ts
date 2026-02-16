import { ITool, ToolFactory } from '../../types/Tool';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';

const log = logger.child('registry:tool');

export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();
  private factories: Map<string, ToolFactory> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      log.warn(`Overwriting tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    this.eventBus.emit('tool:registered', tool.name);
    log.info(`Registered tool: ${tool.name}`);
  }

  unregister(name: string): void {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      this.eventBus.emit('tool:unregistered', name);
      log.info(`Unregistered tool: ${name}`);
    }
  }

  registerLazy(name: string, factory: ToolFactory): void {
    this.factories.set(name, factory);
    log.info(`Registered lazy tool: ${name}`);
  }

  async get(name: string): Promise<ITool | undefined> {
    if (this.tools.has(name)) {
      return this.tools.get(name);
    }

    const factory = this.factories.get(name);
    if (factory) {
      const tool = await factory();
      this.tools.set(name, tool);
      this.factories.delete(name);
      this.eventBus.emit('tool:registered', name);
      return tool;
    }

    return undefined;
  }

  has(name: string): boolean {
    return this.tools.has(name) || this.factories.has(name);
  }

  list(): string[] {
    const eager = Array.from(this.tools.keys());
    const lazy = Array.from(this.factories.keys());
    return [...eager, ...lazy];
  }

  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }
}
