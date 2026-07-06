
import { Agent } from '../core/Agent';
import { IPlugin } from '../core/types/Plugin';
import { LLMService } from '../core/llm';
import { GeminiProvider } from '../providers/llm/GeminiProvider';
import { OpenAIProvider } from '../providers/llm/OpenAIProvider';
import { EnvConfigStore } from '../core/llm/store/EnvConfigStore';
import { AgentLLMAdapter } from '../core/llm/adapters/AgentLLMAdapter';

export class LLMPlugin implements IPlugin {
  name = 'llm-core';
  version = '1.0.0';

  async register(agent: Agent, options?: any): Promise<void> {
    const store = options?.store || new EnvConfigStore();
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
