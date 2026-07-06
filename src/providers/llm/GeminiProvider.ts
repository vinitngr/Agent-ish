import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import { CompletionRequest, CompletionResponse, CompletionChunk, ModelConfig, LLMMessage, ToolCall } from '../../core/llm/types';
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
    
    // Filter out system message and format others
    const contents: Content[] = [];
    
    for (const msg of request.messages) {
      if (msg.role === 'system') continue;
      
      const parts: Part[] = [];
      if (msg.role === 'tool') {
        parts.push({
          functionResponse: {
            name: (msg.toolCallId || 'unknown').replace(/\./g, '_'),
            response: { result: msg.content }
          }
        });
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          msg.toolCalls.forEach(tc => {
            parts.push({
              functionCall: {
                name: tc.name.replace(/\./g, '_'),
                args: tc.arguments
              }
            });
          });
        }
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        contents.push({ role: 'model', parts });
      } else {
        parts.push({ text: msg.content });
        contents.push({ role: 'user', parts });
      }
    }

    const result = await model.generateContent({ contents });
    const response = await result.response;
    
    const toolCalls: ToolCall[] = [];
    let text = '';
    
    const functionCalls = typeof response.functionCalls === 'function' 
      ? response.functionCalls() 
      : response.functionCalls;
      
    if (functionCalls && Array.isArray(functionCalls) && functionCalls.length > 0) {
      functionCalls.forEach((fc: any) => {
        toolCalls.push({
          id: fc.name, // Gemini doesn't use IDs, so we use the name
          name: fc.name.replace(/_/g, '.'), // Revert dots
          arguments: fc.args as Record<string, unknown>
        });
      });
    }
    
    try {
      text = response.text();
    } catch (e) {
      // Sometimes if it only returns a function call, text() throws an error
    }

    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: 0, 
        completionTokens: 0,
        totalTokens: 0,
      }
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<CompletionChunk> {
    const model = this.getModel(request);
    
    const contents: Content[] = [];
    for (const msg of request.messages) {
      if (msg.role === 'system') continue;
      
      const parts: Part[] = [];
      if (msg.role === 'tool') {
        parts.push({
          functionResponse: {
            name: (msg.toolCallId || 'unknown').replace(/\./g, '_'),
            response: { result: msg.content }
          }
        });
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          msg.toolCalls.forEach(tc => {
            parts.push({
              functionCall: {
                name: tc.name.replace(/\./g, '_'),
                args: tc.arguments
              }
            });
          });
        }
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        contents.push({ role: 'model', parts });
      } else {
        parts.push({ text: msg.content });
        contents.push({ role: 'user', parts });
      }
    }

    const result = await model.generateContentStream({ contents });
    
    let finalToolCalls: ToolCall[] = [];
    
    for await (const chunk of result.stream) {
      let chunkText = '';
      try {
        chunkText = chunk.text();
      } catch (e) {
        // No text in this chunk
      }
      
      const functionCalls = typeof chunk.functionCalls === 'function'
        ? chunk.functionCalls()
        : chunk.functionCalls;
        
      if (functionCalls && Array.isArray(functionCalls) && functionCalls.length > 0) {
        functionCalls.forEach((fc: any) => {
          finalToolCalls.push({
            id: fc.name,
            name: fc.name.replace(/_/g, '.'),
            arguments: fc.args as Record<string, unknown>
          });
        });
      }

      if (chunkText) {
        yield { content: chunkText, delta: chunkText };
      }
    }
    
    if (finalToolCalls.length > 0) {
      yield { toolCalls: finalToolCalls };
    }
  }

  private getModel(request: CompletionRequest): GenerativeModel {
    const modelId = request.model || 'gemini-2.5-flash';
    const config: any = { model: modelId };
    
    const systemMsg = request.messages.find(m => m.role === 'system');
    if (systemMsg) {
      config.systemInstruction = {
        role: 'system',
        parts: [{ text: systemMsg.content }]
      };
    }
    
    if (request.tools && request.tools.length > 0) {
      config.tools = [{
        functionDeclarations: request.tools.map(t => ({
          name: t.name.replace(/\./g, '_'),
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }
    
    return this.client.getGenerativeModel(config);
  }
}
