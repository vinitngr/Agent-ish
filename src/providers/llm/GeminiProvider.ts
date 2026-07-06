
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import { CompletionRequest, CompletionResponse, CompletionChunk, ModelConfig, LLMMessage } from '../../core/llm/types';
import { GEMINI_MODELS } from '../../core/llm/constants';

export class GeminiProvider extends BaseProvider {
  static id = 'gemini';

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, allowedModels?: string[]) {
    super('gemini', 'Google Gemini', allowedModels);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  get allModels(): ModelConfig[] {
    return GEMINI_MODELS;
  }

  async generate(request: CompletionRequest): Promise<CompletionResponse> {
    const model = this.getModel(request);
    const content = request.messages.map((m: LLMMessage) => m.content).join('\n');
    
    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      usage: {
        promptTokens: 0, 
        completionTokens: 0,
        totalTokens: 0,
      }
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<CompletionChunk> {
    const model = this.getModel(request);
    const content = request.messages.map((m: LLMMessage) => m.content).join('\n'); 

    const result = await model.generateContentStream(content);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      yield {
        content: text,
        delta: text,
      };
    }
  }

  private getModel(request: CompletionRequest): GenerativeModel {
    const modelId = request.model || 'gemini-2.5-flash';
    return this.client.getGenerativeModel({ model: modelId });
  }
}
