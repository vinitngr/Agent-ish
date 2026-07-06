import { Agent } from '../src/agent/core/Agent';
import { ILLMProvider, LLMMessage, LLMResponse, LLMRequestOptions, ProviderConfig } from '../src/types/Provider';
import { ITool, ToolResult } from '../src/types/Tool';
import { IContext } from '../src/types/Runtime';

class MockLLM implements ILLMProvider {
  name = 'mock-llm';
  
  async initialize(config: ProviderConfig): Promise<void> {
    console.log('[MockLLM] Initialized');
  }

  async shutdown(): Promise<void> {
    console.log('[MockLLM] Shutdown');
  }
  
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const lastMsg = messages[messages.length - 1];
    console.log(`[MockLLM] Received message: ${JSON.stringify(lastMsg.content)}`);

    if (lastMsg.role === 'user') {
      return {
        content: 'I will use the test tool.',
        toolCalls: [{ id: 'call_1', name: 'test_tool', arguments: { value: 'hello' } }],
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
      };
    }
    
    if (lastMsg.role === 'tool') {
       return {
        content: 'The tool executed successfully. I am done.',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
       };
    }

    return { content: 'Unexpected state', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
  }
}

const testTool: ITool = {
  name: 'test_tool',
  description: 'A test tool',
  parameters: [{ name: 'value', type: 'string', description: 'A value', required: true }],
  execute: async (context: IContext, args: any): Promise<ToolResult> => { 
    console.log(`[TestTool] Executing with args: ${JSON.stringify(args)}`);
    return { success: true, data: `Processed: ${args.value}` }; 
  }
};

async function main() {
  const agent = new Agent();
  
  agent.context.providers.register('llm', new MockLLM());
  agent.context.providers.setDefault('llm', 'mock-llm');
  
  agent.context.tools.register(testTool);

  await agent.init();
  await agent.boot();

  console.log('--- Starting Agent Execution ---');
  const response = await agent.orchestrator.handleInput('Run the test tool');
  console.log('--- Agent Response ---');
  console.log(response);
  
  await agent.shutdown();
}

main().catch(console.error);
