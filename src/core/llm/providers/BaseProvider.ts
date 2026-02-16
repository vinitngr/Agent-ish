
import { ILLMProvider, ModelConfig } from '../interfaces';
import { CompletionRequest, CompletionResponse, CompletionChunk } from '../types';

export abstract class BaseProvider implements ILLMProvider {
  id: string;
  name: string;
  protected allowedModels: Set<string>;

  constructor(id: string, name: string, allowedModels?: string[]) {
    this.id = id;
    this.name = name;
    this.allowedModels = allowedModels ? new Set(allowedModels) : new Set();
  }

  abstract get allModels(): ModelConfig[];

  async listModels(): Promise<ModelConfig[]> {
     if (this.allowedModels.size > 0) {
       return this.allModels.filter(m => this.allowedModels.has(m.id));
     }
     return this.allModels;
  }
  abstract generate(request: CompletionRequest): Promise<CompletionResponse>;

  async *stream(request: CompletionRequest): AsyncGenerator<CompletionChunk> {
    throw new Error('Streaming not implemented for this provider.');
  }

  protected getModelId(request: CompletionRequest): string {
    return request.model || '';
  }

  async chat(messages: any[], options?: any): Promise<any> {
    const request: CompletionRequest = {
      model: options?.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolCallId: m.toolCallId
      })),
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      tools: options?.tools?.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }))
    };

    const response = await this.generate(request);

    return {
      content: response.content,
      toolCalls: (response as any).toolCalls || [],
      usage: response.usage
    };
  }
}
