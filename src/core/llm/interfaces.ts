
import { CompletionRequest, CompletionResponse, CompletionChunk, ModelConfig } from './types';

export * from './types';

export interface ILLMProvider {
  readonly id: string;
  name: string;
  listModels(): Promise<ModelConfig[]>;
  generate(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncGenerator<CompletionChunk>;
}