
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppLLMConfig, IConfigStore } from '../config';

export class JsonFileConfigStore implements IConfigStore {
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async loadConfig(): Promise<AppLLMConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { providers: [] };
      }
      throw error;
    }
  }

  async saveConfig(config: AppLLMConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  onConfigChange(callback: () => void): void {
    const fsActual = require('fs');
    let debounceTimer: NodeJS.Timeout;

    try {
      if (!fsActual.existsSync(this.configPath)) {
         console.warn(`Config file ${this.configPath} does not exist yet. Hot-reload might not work until restart.`);
         return;
      }

      fsActual.watch(this.configPath, (eventType: string, filename: string) => {
        if (eventType === 'change' || eventType === 'rename') {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('Config change detected, reloading...');
            callback();
          }, 100);
        }
      });
    } catch (error) {
      console.error('Failed to setup config watch:', error);
    }
  }
}
