
import { ILLMProvider, ModelConfig } from './interfaces';

export class ProviderRegistry {
  private providers: Map<string, ILLMProvider> = new Map();

  registerProvider(provider: ILLMProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider with ID '${provider.id}' is already registered. Overwriting.`);
    }
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  async listAllModels(): Promise<ModelConfig[]> {
    const allModels: ModelConfig[] = [];
    for (const provider of this.providers.values()) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to list models for provider '${provider.id}':`, error);
      }
    }
    return allModels;
  }
}

export const registry = new ProviderRegistry();
