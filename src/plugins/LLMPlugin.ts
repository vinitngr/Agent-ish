
import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
import { LLMService, JsonFileConfigStore, GeminiProvider, OpenAIProvider } from '../core/llm';
import { AgentLLMAdapter } from '../integration/AgentLLMAdapter';
import * as path from 'path';

export class LLMPlugin implements IPlugin {
  name = 'llm-core';
  version = '1.0.0';

  async register(agent: Agent, options?: any): Promise<void> {
    const configPath = path.resolve(process.cwd(), 'config/providers.json');
    const store = new JsonFileConfigStore(configPath);
    const service = new LLMService(store);

    service.registerProvider(GeminiProvider);
    service.registerProvider(OpenAIProvider);

    const watch = agent.config.monitoring?.config !== false;
    await service.initialize({ watch });

    const adapter = new AgentLLMAdapter(service);
    agent.providers.register('llm', adapter);
    agent.providers.setDefault('llm', adapter.name);
  }
}
