
import { LLMService, JsonFileConfigStore, OpenAIProvider } from '../src/core/llm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const configPath = path.resolve(process.cwd(), 'config/providers.json');
  const store = new JsonFileConfigStore(configPath);
  const llmService = new LLMService(store);
  
  llmService.registerProvider(OpenAIProvider);

  console.log('\n--- Manually adding Gemini to JSON via FS ---');
  let config = { providers: [] as any[] };
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  if (!config.providers.find(p => p.id === 'gemini')) {
    config.providers.push({
      id: 'gemini',
      enabled: true,
      apiKey: 'FAKE_KEY_FOR_TEST',
      models: []
    });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Gemini written to providers.json directly via FS.');
  }

  await llmService.initialize();
  console.log(await llmService.listAllModels()) 
  console.log('\n--- Status Check ---');
  const status = await llmService.getProviderStatus();
  console.table(status);

  console.log('\n--- Active Providers ---');
  console.log(await llmService.listActiveProviders());
}

main().catch(console.error);
