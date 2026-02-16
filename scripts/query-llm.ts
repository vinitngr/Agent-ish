
import { LLMService } from '../src/core/llm/LLMService';
import { JsonFileConfigStore } from '../src/core/llm/store/JsonFileConfigStore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
      params[key] = value;
      if (value) i++; 
    }
  }
  return params;
}

async function main() {
  const args = parseArgs();
  const modelArg = args['model'];
  const prompt = args['prompt'] || args['query'];

  if (!modelArg || !prompt) {
    console.error('Usage: npx tsx scripts/query.ts --model <provider>:<model> --prompt "<text>"');
    console.error('Example: npx tsx scripts/query.ts --model openai:gpt-4o --prompt "Hello world"');
    process.exit(1);
  }

  const [providerId, modelId] = modelArg.split(':');

  if (!providerId || !modelId) {
    console.error('Error: Model must be in format "provider:model" (e.g., openai:gpt-4o)');
    process.exit(1);
  }

  const configPath = path.resolve(process.cwd(), 'config/providers.json');
  const configStore = new JsonFileConfigStore(configPath);
  const llmService = new LLMService(configStore);
  
  try {
    await llmService.initialize();
  } catch (err) {
    console.error('Failed to initialize LLM Service:', err);
    process.exit(1);
  }

  const provider = llmService.getProvider(providerId);
  if (!provider) {
    console.error(`Error: Provider '${providerId}' not found or not enabled.`);
    console.log('Available Configured Providers:', (await llmService.listAllModels()).map(m => m.providerId).filter((v, i, a) => a.indexOf(v) === i));
    process.exit(1);
  }

  console.log(`\nQuerying ${providerId} (${modelId})...\n`);
  const startTime = Date.now();

  try {
    const response = await provider.generate({
      model: modelId,
      messages: [{ role: 'user', content: prompt }]
    });

    const duration = Date.now() - startTime;
    console.log('--- Response ---');
    console.log(response.content);
    console.log('\n----------------');
    console.log(`Tokens: ${response.usage?.totalTokens} | Time: ${duration}ms`);

  } catch (error: any) {
    console.error('Generation Error:', error.message || error);
  }
}

main().catch(console.error);


// npx tsx scripts/query.ts --model openai:gpt-4o --prompt "What is the capital of France?"