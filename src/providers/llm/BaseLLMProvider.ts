import { ILLMProvider, ProviderConfig, LLMMessage, LLMResponse, LLMRequestOptions } from '../../types/Provider';

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract name: string;

  abstract initialize(config: ProviderConfig): Promise<void>;
  abstract chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
  abstract shutdown(): Promise<void>;
}
