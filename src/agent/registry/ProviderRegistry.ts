import { ILLMProvider, IMemoryProvider, IEmbeddingProvider, ProviderConfig } from '../../types/Provider';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';

const log = logger.child('registry:provider');

type ProviderType = 'llm' | 'memory' | 'embeddings';

type ProviderInstance = ILLMProvider | IMemoryProvider | IEmbeddingProvider;

export class ProviderRegistry {
  private providers: Map<string, ProviderInstance> = new Map();
  private defaults: Map<ProviderType, string> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  register(type: ProviderType, provider: ProviderInstance): void {
    const key = `${type}:${provider.name}`;
    this.providers.set(key, provider);
    this.eventBus.emit('provider:registered', type, provider.name);
    log.info(`Registered ${type} provider: ${provider.name}`);
  }

  setDefault(type: ProviderType, name: string): void {
    this.defaults.set(type, name);
    log.info(`Default ${type} provider set to: ${name}`);
  }

  get<T extends ProviderInstance>(type: ProviderType, name?: string): T | undefined {
    const resolvedName = name || this.defaults.get(type);
    if (!resolvedName) return undefined;
    return this.providers.get(`${type}:${resolvedName}`) as T | undefined;
  }

  getLLM(name?: string): ILLMProvider | undefined {
    return this.get<ILLMProvider>('llm', name);
  }

  getMemory(name?: string): IMemoryProvider | undefined {
    return this.get<IMemoryProvider>('memory', name);
  }

  getEmbeddings(name?: string): IEmbeddingProvider | undefined {
    return this.get<IEmbeddingProvider>('embeddings', name);
  }

  list(type?: ProviderType): string[] {
    const entries = Array.from(this.providers.keys());
    if (type) {
      return entries
        .filter((k) => k.startsWith(`${type}:`))
        .map((k) => k.split(':')[1]);
    }
    return entries;
  }

  listActive(): { type: string; name: string }[] {
    return Array.from(this.providers.keys()).map(key => {
      const [type, name] = key.split(':');
      return { type, name };
    });
  }

  async shutdownAll(): Promise<void> {
    for (const [key, provider] of this.providers) {
      try {
        await provider.shutdown();
        log.info(`Shutdown provider: ${key}`);
      } catch (err) {
        log.error(`Error shutting down provider ${key}:`, err);
      }
    }
    this.providers.clear();
  }
}
