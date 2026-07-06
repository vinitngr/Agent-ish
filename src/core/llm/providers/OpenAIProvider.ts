
import OpenAI from 'openai';
import { BaseProvider } from './BaseProvider';
import { CompletionRequest, CompletionResponse, CompletionChunk, ModelConfig } from '../types';
import { OPENAI_MODELS } from '../constants';

export class OpenAIProvider extends BaseProvider {
  static id = 'openai';

  private client: OpenAI;

  constructor(apiKey: string, allowedModels?: string[]) {
    super('openai', 'OpenAI', allowedModels);
    this.client = new OpenAI({ apiKey });
  }

  get allModels(): ModelConfig[] {
    return OPENAI_MODELS;
  }

  async generate(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = request.messages.map(m => {
      const msg: any = {
        role: m.role,
        content: m.content || null, 
      };

      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }));
      }

      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }

      return msg;
    });

    const completion = await this.client.chat.completions.create({
      model: request.model || 'gpt-3.5-turbo',
      messages: messages as any,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<CompletionChunk> {
     const messages = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: request.model || 'gpt-3.5-turbo',
      messages: messages as any,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield {
          content,
          delta: content,
        };
      }
    }
  }
}
