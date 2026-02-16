import { ILLMProvider, LLMMessage, LLMResponse, LLMRequestOptions, ProviderConfig } from '../types/Provider';
import { LLMService, CompletionRequest } from '../core/llm';

export class AgentLLMAdapter implements ILLMProvider {
  name = 'llm-service-adapter';
  private service: LLMService;
  private defaultProvider = 'openai';
  private defaultModel = 'gpt-4o';

  constructor(service: LLMService) {
    this.service = service;
  }

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.options?.defaultProvider) this.defaultProvider = config.options.defaultProvider as string;
    if (config.options?.defaultModel) this.defaultModel = config.options.defaultModel as string;
  }

  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    let providerId = this.defaultProvider;
    let modelId = this.defaultModel;

    if (options?.model) {
      if (options.model.includes(':')) {
        const parts = options.model.split(':');
        providerId = parts[0];
        modelId = parts[1];
      } else {
        modelId = options.model;
      }
    } else {
        const defaultModel = await this.service.getDefaultModel();
        if (defaultModel) {
            providerId = defaultModel.providerId;
            modelId = defaultModel.id;
        } else {
             throw new Error('No active LLM providers found. Please check config/providers.json and ensure at least one provider is enabled with a valid API key.');
        }
    }

    const provider = this.service.getProvider(providerId);
    if (!provider) throw new Error(`Provider '${providerId}' not found.`);

    const request: CompletionRequest = {
      model: modelId,
      messages: messages.map(m => ({ 
        role: m.role as any,
        content: m.content,
        toolCalls: m.toolCalls,
        toolCallId: m.toolCallId
      })),
    };

    const response = await provider.generate(request);

    return {
      content: response.content,
      usage: response.usage
    };
  }

  async shutdown(): Promise<void> {}
}
