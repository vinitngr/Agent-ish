
import { Agent } from '../src/agent/core/Agent';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- Verifying Agent LLM Integration ---\n');

  // 1. Initialize Agent
  const agent = new Agent('./config');

  // 2. Register LLM Plugin
  console.log('Registering LLMProvider...');
  await agent.use(new LLMPlugin());

  // 3. Init & Boot (Correct order: init config first)
  console.log('Booting Agent...');
  // Usually framework calls register -> init -> boot
  // We need to call boot manually since use() registers but might not start services
  // Agent.ts init() just logs "Initializing..."
  // But LLMPlugin.register() calls llmService.initialize() internally.
  await agent.init();
  await agent.boot();

  // 4. Get Provider through Agent Registry
  // The LLMPlugin registers itself as 'llm'
  const llm = agent.providers.getLLM();
  
  if (!llm) {
    console.error('FAILED: LLM Provider not found in agent registry.');
    process.exit(1);
  }
  console.log(`SUCCESS: Found registered LLM provider: ${llm.name}`);

  // 5. Test Chat
  console.log('Sending test message via Agent Adapter using Default Provider...');
  try {
    const response = await llm.chat([
      { role: 'user', content: 'Say "Integration Successful" if you can hear me.' }
    ]);

    console.log('\n--- Agent Response ---');
    console.log(response.content);
    console.log('----------------------');
    if (response.usage) {
      console.log(`Tokens: ${response.usage.totalTokens}`);
    }

  } catch (error: any) {
    console.error('Chat failed:', error.message || error);
  }

  // 6. Shutdown
  await agent.shutdown();
}

main().catch(console.error);
