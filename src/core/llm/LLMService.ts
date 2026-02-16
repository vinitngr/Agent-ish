import { ProviderRegistry, registry } from './registry';
import { IConfigStore } from './config';
import { ILLMProvider, ModelConfig } from './interfaces';
import { ALL_SUPPORTED_MODELS } from './constants';

type ProviderFactory = (apiKey: string, models?: string[]) => ILLMProvider;

export interface ProviderStatus {
  id: string;
  name: string;
  status: 'active' | 'configured' | 'error';
  modelCount: number;
}

export interface LLMServiceOptions {
}

export class LLMService {
  private configStore: IConfigStore;
  private registry: ProviderRegistry;
  private providerFactories: Map<string, ProviderFactory> = new Map();

  constructor(
    configStore: IConfigStore, 
    registryInstance: ProviderRegistry = registry,
    options: LLMServiceOptions = {}
  ) {
    this.configStore = configStore;
    this.registry = registryInstance;
  }

  registerFactory(id: string, factory: ProviderFactory) {
    this.providerFactories.set(id, factory);
  }

  registerProvider(ProviderClass: any) {
    if (ProviderClass.id) {
        this.registerFactory(ProviderClass.id, (config, models) => new ProviderClass(config, models));
    } else {
        console.warn('Provider class missing static id property. Use registerFactory() instead.');
    }
  }

  async initialize(options: { watch?: boolean } = {}): Promise<void> {
    await this.loadAndRegisterProviders();

    if (options.watch !== false) {
      this.configStore.onConfigChange?.(() => {
        console.log('Reloading LLM providers due to config change...');
        this.loadAndRegisterProviders().catch(err => {
          console.error('Failed to reload LLM config:', err);
        });
      });
    }
  }

  private async loadAndRegisterProviders(): Promise<void> {
    const config = await this.configStore.loadConfig();
    
    for (const providerConfig of config.providers) {
      if (!providerConfig.enabled) continue;

      const apiKey = this.resolveApiKey(providerConfig.apiKey, providerConfig.apiKeyEnvVar);

      if (!apiKey) {
        console.warn(`Skipping provider ${providerConfig.id}: No API key found.`);
        continue;
      }

      const factory = this.providerFactories.get(providerConfig.id);
      if (factory) {
        const provider = factory(apiKey, providerConfig.models);
        this.registry.registerProvider(provider);
      } else {
        console.warn(`Unknown provider type: ${providerConfig.id}`);
      }
    }
  }

  private resolveApiKey(explicitKey?: string, envVar?: string): string | undefined {
    if (explicitKey) return explicitKey;
    if (envVar && process.env[envVar]) return process.env[envVar];
    return undefined;
  }

  getProvider(id: string): ILLMProvider | undefined {
    return this.registry.getProvider(id);
  }

  async getProviderStatus(): Promise<ProviderStatus[]> {
    const config = await this.configStore.loadConfig();
    const result: ProviderStatus[] = [];

    for (const pConfig of config.providers) {
      const activeProvider = this.registry.getProvider(pConfig.id);
      
      // Determine status
      // If it is in the registry, it is 'active'.
      // If it is in config but not registry, check why (disabled? no key?)
      
      let status: ProviderStatus['status'] = 'configured';
      if (activeProvider) {
        status = 'active';
      } else if (!pConfig.enabled) {
        // status remains configured (dormant)
      } else if (pConfig.enabled && !this.resolveApiKey(pConfig.apiKey, pConfig.apiKeyEnvVar)) {
        status = 'error'; // Missing key
      }

      let modelCount = 0;
      let name = pConfig.id; // Fallback name

      if (activeProvider) {
        try {
          const models = await activeProvider.listModels();
          modelCount = models.length;
          name = activeProvider.name;
        } catch (e) {
          status = 'error';
        }
      }

      result.push({
        id: pConfig.id,
        name,
        status,
        modelCount
      });
    }

    return result;
  }

  async listAllModels(): Promise<ModelConfig[]> {
    return this.registry.listAllModels();
  }

  async listActiveProviders(): Promise<string[]> {
    const models = await this.listAllModels();
    return Array.from(new Set(models.map(m => m.providerId)));
  }

  async getModelsByProvider(providerId: string): Promise<ModelConfig[]> {
    const models = await this.listAllModels();
    return models.filter(m => m.providerId === providerId);
  }

  async getDefaultModelId(): Promise<string | undefined> {
    const config = await this.configStore.loadConfig();
    return config.defaultModel;
  }

  async getFallbackModelIds(): Promise<string[]> {
    const config = await this.configStore.loadConfig();
    return config.fallbackModels || [];
  }

  async getDefaultModel(): Promise<ModelConfig | undefined> {
    const configDefaultId = await this.getDefaultModelId();
    const models = await this.listAllModels();
    
    if (configDefaultId) {
      const parts = configDefaultId.split(':');
      const providerId = parts[0];
      const modelId = parts.length > 1 ? parts[1] : parts[0];
      const found = models.find(m => m.providerId === providerId && m.id === modelId);
      if (found) return found;
    }

    return models.length > 0 ? models[0] : undefined;
  }

  listSupportedModels(): ModelConfig[] {
    return ALL_SUPPORTED_MODELS;
  }
}
