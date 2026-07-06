import { Agent } from '../src/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('----------------------------------------');
  console.log('🤖 Starting Gemini Test Script');
  console.log('----------------------------------------');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ ERROR: GEMINI_API_KEY is missing from .env');
    console.log('Please add it to the .env file in the root directory.');
    process.exit(1);
  }

  // Pass a dummy config path, we don't strictly need config files for basic execution
  const agent = new Agent('./config');
  agent.setLogLevel('info');
  
  console.log('1. Loading Plugins...');
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  
  console.log('2. Initializing Agent...');
  await agent.init();
  
  console.log('3. Booting Agent...');
  await agent.boot();
  
  console.log('\n✅ Agent Ready! Executing prompt via Gemini...');
  const prompt = "Please use your system tool to read the contents of the package.json file in the current directory and tell me what the name and version of this project are.";
  console.log(`\nPrompt: "${prompt}"\n`);
  
  try {
    const result = await agent.execute(prompt, {
      model: 'gemini:gemini-flash-latest' // Use latest model
    });
    
    console.log('----------------------------------------');
    console.log('🌟 GEMINI RESPONSE:');
    console.log('----------------------------------------');
    console.log(result);
    console.log('----------------------------------------');
    
  } catch (err: any) {
    console.error('❌ Error executing prompt:');
    console.error(err.message || err);
  } finally {
    await agent.shutdown();
    process.exit(0);
  }
}

main().catch(console.error);
