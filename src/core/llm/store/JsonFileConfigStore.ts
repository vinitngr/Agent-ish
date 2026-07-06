import { AppLLMConfig, IConfigStore } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

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

  async onConfigChange(callback: () => void): Promise<void> {
    try {
      const chokidar = await import('chokidar');
      const watcher = chokidar.watch(this.configPath, {
        ignoreInitial: true,
        persistent: true
      });

      watcher.on('change', () => {
        console.log('Config change detected, reloading...');
        callback();
      });

      watcher.on('error', (error) => {
        console.error('Failed to setup config watch:', error);
      });
    } catch (error) {
      console.error('Failed to load chokidar:', error);
    }
  }
}
