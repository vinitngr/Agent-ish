
import { LLMService } from '../src/core/llm/LLMService';
import { JsonFileConfigStore } from '../src/core/llm/store/JsonFileConfigStore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- LLM Provider System (Config-Driven) Verification ---');

  const configPath = path.resolve(process.cwd(), 'config/providers.json');
  console.log(`Loading config from: ${configPath}`);

  const configStore = new JsonFileConfigStore(configPath);
  const llmService = new LLMService(configStore);

  console.log('Initializing LLM Service...');
  await llmService.initialize();
  console.log('LLM Service initialized.');

  // 1. List All Supported Models (Static)
  const supportedModels = llmService.listSupportedModels();
  console.log('\n--- Supported Models (Metadata) ---');
  supportedModels.forEach(m => console.log(`- [${m.providerId}] ${m.id}`));

  // 2. List Configured/Active Models (Runtime)
  const activeModels = await llmService.listAllModels();
  console.log('\n--- Active Configured Models ---');
  if (activeModels.length === 0) {
    console.log('No models configured or enabled.');
  } else {
    activeModels.forEach(m => console.log(`- [${m.providerId}] ${m.id} (Context: ${m.contextWindow})`));
  }

  if (activeModels.length === 0) {
    console.error('No active models available for testing. Exiting.');
    return;
  }

  // 3. Test Generation
  // 3. Test Generation
  const testModel = activeModels[0];
  const provider = llmService.getProvider(testModel.providerId);

  if (provider) {
    console.log(`\n--- Testing Generation with ${testModel.id} ---`);
    const request = {
      model: testModel.id,
      messages: [{ role: 'user', content: 'Say hello in JSON.' }] as any,
    };

    try {
      const response = await provider.generate(request);
      console.log('Response:', response.content);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }
}

main().catch(console.error);
