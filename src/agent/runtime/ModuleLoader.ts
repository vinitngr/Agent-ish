import * as path from 'path';
import { logger } from '../../utils/logger';

const log = logger.child('module-loader');

export class ModuleLoader {
  private loaded: Map<string, unknown> = new Map();

  async load<T>(modulePath: string): Promise<T> {
    if (this.loaded.has(modulePath)) {
      return this.loaded.get(modulePath) as T;
    }

    try {
      const resolved = path.resolve(modulePath);
      log.debug(`Loading module: ${resolved}`);
      const mod = await import(resolved);
      const exported = mod.default || mod;
      this.loaded.set(modulePath, exported);
      log.info(`Loaded module: ${modulePath}`);
      return exported as T;
    } catch (err) {
      log.error(`Failed to load module: ${modulePath}`, err);
      throw new Error(`Module load failed: ${modulePath}`);
    }
  }

  async loadAll<T>(modulePaths: string[]): Promise<T[]> {
    const results: T[] = [];
    for (const p of modulePaths) {
      const mod = await this.load<T>(p);
      results.push(mod);
    }
    return results;
  }

  isLoaded(modulePath: string): boolean {
    return this.loaded.has(modulePath);
  }

  unload(modulePath: string): void {
    this.loaded.delete(modulePath);
  }

  clear(): void {
    this.loaded.clear();
  }
}
