
export interface ProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  apiKeyEnvVar?: string;
  models?: string[];
}

export interface AppLLMConfig {
  defaultModel?: string;
  fallbackModels?: string[];
  providers: ProviderConfig[];
}


export interface IConfigStore {
  loadConfig(): Promise<AppLLMConfig>;
  saveConfig(config: AppLLMConfig): Promise<void>;
  onConfigChange(callback: () => void): void;
}


