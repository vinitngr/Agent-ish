import { Agent } from '../src/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("🚀 Booting Agent with Streaming enabled...\n");

  const agent = new Agent();

  await agent.init();
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.boot();

  console.log("=======================================================");
  console.log("🌊 TEST: Streaming a short story chunk by chunk");
  console.log("=======================================================");

  process.stdout.write("Agent: ");
  
  const response = await agent.execute(
    "Write a very short 2-sentence story about a robot learning to paint.",
    { 
      model: 'gemini:gemini-3.5-flash',
      onStream: (chunk) => {
        process.stdout.write(chunk);
      }
    }
  );

  console.log("\n\n✅ FINAL AGGREGATED RESPONSE RETURNED:");
  console.log(response);
  
  process.exit(0);
}

run().catch(console.error);
