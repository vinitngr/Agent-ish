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
    const mainModel = options?.model || await this.service.getDefaultModelId() || this.defaultModel;
    const fallbacks = await this.service.getFallbackModelIds();
    const attempts = [mainModel, ...fallbacks];

    let lastError: any;

    for (const modelId of attempts) {
      try {
        return await this.executeChat(messages, modelId);
      } catch (error) {
        lastError = error;
        console.warn(`Model ${modelId} failed, trying next fallback... Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`All models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  private async executeChat(messages: LLMMessage[], modelSpec: string): Promise<LLMResponse> {
    let providerId = this.defaultProvider;
    let modelId = this.defaultModel;

    if (modelSpec.includes(':')) {
      const parts = modelSpec.split(':');
      providerId = parts[0];
      modelId = parts[1];
    } else {
      modelId = modelSpec;
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
