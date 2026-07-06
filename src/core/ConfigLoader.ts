import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AgentConfig, RuntimeConfig, ProvidersConfig } from './types/Runtime';
import {
  agentConfigSchema,
  runtimeConfigSchema,
  providersConfigSchema,
  validate,
} from './utils/validation';
import { logger } from './utils/logger';

const log = logger.child('config');

export interface FullConfig {
  agent: AgentConfig;
  runtime: RuntimeConfig;
  providers: ProvidersConfig;
}

export class ConfigLoader {
  private configDir: string;

  constructor(configDir: string) {
    this.configDir = path.resolve(configDir);
    
    const envPath = path.join(process.cwd(), '.env');
    const localEnvPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath });
    }
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  load(): FullConfig {
    log.info(`Loading config from ${this.configDir} (with .env support)`);

    const agent = this.loadFile<AgentConfig>('default.json', agentConfigSchema, {
      agent: { name: 'agent-ish', version: '1.0.0' },
      logging: { level: 'warn', directory: './logs' },
      modules: { tools: [], interfaces: ['terminal'] },
      monitoring: { config: true, plugins: false }
    });

    const runtime = this.loadFile<RuntimeConfig>('runtime.json', runtimeConfigSchema, {
      maxConcurrency: 5,
      timeout: 30000,
      retryAttempts: 3,
      lazyLoad: false,
      storage: { memory: 'in-memory', logs: 'file', cache: 'file' },
      showToolResults: true
    });

    const providers = this.loadFile<ProvidersConfig>('providers.json', providersConfigSchema, {
      llm: { default: null, adapters: {} },
      memory: { default: null, adapters: {} },
      embeddings: { default: null, adapters: {} }
    });

    log.info(`Config loaded: ${agent.agent.name} v${agent.agent.version}`);

    return { agent, runtime, providers };
  }

  private loadFile<T>(filename: string, schema: { parse: (data: unknown) => T }, defaultConfig: any): T {
    const filePath = path.join(this.configDir, filename);

    let parsed = defaultConfig;

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        parsed = JSON.parse(raw);
      } catch (error) {
        log.warn(`Failed to parse ${filename}, falling back to defaults. Error: ${error}`);
      }
    } else {
      log.debug(`Config file not found: ${filePath}, using defaults.`);
    }

    const envOverridden = this.applyEnvOverrides(parsed);

    return validate(schema as any, envOverridden);
  }

  private applyEnvOverrides(config: Record<string, unknown>): Record<string, unknown> {
    const result = { ...config };

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
          result[key] = envValue;
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.applyEnvOverrides(value as Record<string, unknown>);
      }
    }

    return result;
  }
}
