import { IConfigStore, AppLLMConfig, ProviderConfig } from '../config';

export class EnvConfigStore implements IConfigStore {
  async loadConfig(): Promise<AppLLMConfig> {
    const providers: ProviderConfig[] = [];
    
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        id: 'openai',
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    if (process.env.GEMINI_API_KEY) {
      providers.push({
        id: 'gemini',
        enabled: true,
        apiKey: process.env.GEMINI_API_KEY
      });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        id: 'anthropic',
        enabled: true,
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }

    return {
      defaultModel: process.env.DEFAULT_LLM_MODEL || undefined,
      providers
    };
  }

  async saveConfig(config: AppLLMConfig): Promise<void> {
    throw new Error('EnvConfigStore is read-only. Use a custom store to persist changes.');
  }

  onConfigChange(callback: () => void): void {
  }
}
