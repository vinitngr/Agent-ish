
export interface ProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  apiKeyEnvVar?: string;
  models?: string[];
}

export interface AppLLMConfig {
  providers: ProviderConfig[];
}


export interface IConfigStore {
  loadConfig(): Promise<AppLLMConfig>;
  saveConfig(config: AppLLMConfig): Promise<void>;
  onConfigChange(callback: () => void): void;
}

import * as fs from 'fs';
import * as path from 'path';

export class JsonFileConfigStore implements IConfigStore {
  private filePath: string;
  private configCache: AppLLMConfig | null = null;
  private changeCallback: (() => void) | undefined;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.watchFile();
  }

  private watchFile() {
    let fsWait: NodeJS.Timeout | null = null;
    fs.watch(this.filePath, (event, filename) => {
      if (filename) {
        if (fsWait) return;
        fsWait = setTimeout(() => {
          fsWait = null;
          console.log(`Config file ${filename} changed.`);
          this.configCache = null;
          this.changeCallback?.();
        }, 100);
      }
    });
  }

  onConfigChange(callback: () => void): void {
    this.changeCallback = callback;
  }

  async loadConfig(): Promise<AppLLMConfig> {
    if (this.configCache) return this.configCache;

    try {
      if (!fs.existsSync(this.filePath)) {
        return { providers: [] };
      }
      const data = await fs.promises.readFile(this.filePath, 'utf-8');
      this.configCache = JSON.parse(data) as AppLLMConfig;
      return this.configCache;
    } catch (error) {
      console.error('Failed to load LLM config:', error);
      return { providers: [] };
    }
  }

  async saveConfig(config: AppLLMConfig): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(this.filePath, JSON.stringify(config, null, 2), 'utf-8');
      this.configCache = config; // Update cache
    } catch (error) {
      console.error('Failed to save LLM config:', error);
      throw error;
    }
  }
}

