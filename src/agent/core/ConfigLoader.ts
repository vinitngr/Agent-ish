import * as fs from 'fs';
import * as path from 'path';
import { AgentConfig, RuntimeConfig, ProvidersConfig } from '../../types/Runtime';
import {
  agentConfigSchema,
  runtimeConfigSchema,
  providersConfigSchema,
  validate,
} from '../../utils/validation';
import { logger } from '../../utils/logger';

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
  }

  load(): FullConfig {
    log.info(`Loading config from ${this.configDir}`);

    const agent = this.loadFile<AgentConfig>('default.json', agentConfigSchema);
    const runtime = this.loadFile<RuntimeConfig>('runtime.json', runtimeConfigSchema);
    const providers = this.loadFile<ProvidersConfig>('providers.json', providersConfigSchema);

    log.info(`Config loaded: ${agent.agent.name} v${agent.agent.version}`);

    return { agent, runtime, providers };
  }

  private loadFile<T>(filename: string, schema: { parse: (data: unknown) => T }): T {
    const filePath = path.join(this.configDir, filename);

    if (!fs.existsSync(filePath)) {
      if (filename === 'providers.json') {
        throw new Error(
          `Config file not found: ${filePath}. This file is required for LLM provider credentials and is intentionally gitignored. Copy config/providers.example.json to config/providers.json and fill your secrets (or use env var placeholders like \${OPENAI_API_KEY}).`
        );
      }
      throw new Error(`Config file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

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
