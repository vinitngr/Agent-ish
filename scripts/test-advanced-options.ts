import { Agent } from '../src/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';

async function run() {
  console.log("🚀 Booting Agent with Advanced Options...");
  
  const agent = new Agent();
  agent.setLogLevel('warn'); // Keep logs quiet so we can see our custom onStep!

  await agent.init();
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());

  agent.tools.register({
    name: 'app.getMassiveData',
    description: 'Get a massive dump of data',
    parameters: [],
    execute: async () => {
      // 100,000 character string!
      return { success: true, data: "MASSIVEDATA ".repeat(10000) };
    }
  });

  await agent.boot();

  console.log("\n=======================================================");
  console.log("🧪 TEST 1: The 'onStep' callback and 'maxOutputTokens'");
  console.log("=======================================================");
  
  const response1 = await agent.execute(
    "What is 2+2? Keep it extremely short.",
    { 
      model: 'gemini:gemini-flash-latest',
      maxOutputTokens: 10,
      onStep: (stepInfo) => {
        if (stepInfo.type === 'think') {
          console.log(`[UI Spinner] 🤖 AI is thinking... (Message: ${stepInfo.message})`);
        } else if (stepInfo.type === 'action') {
          console.log(`[UI Spinner] 🔧 AI is calling tool: ${stepInfo.tool}`);
        }
      }
    }
  );
  console.log("\n✅ RESPONSE 1:", response1);

  console.log("\n=======================================================");
  console.log("🧪 TEST 2: System Prompt Override & Tool Truncation");
  console.log("=======================================================");
  
  const response2 = await agent.execute(
    "Call the app.getMassiveData tool and tell me what the first 5 words are.",
    {
      model: 'gemini:gemini-flash-latest',
      systemContext: "You are a pirate. Respond to everything like a pirate.",
      allowedTools: ['app.getMassiveData'], // Restrict tools
      maxToolResponseLength: 100, // TRUNCATE the 100,000 char response down to 100!
      onStep: (stepInfo) => {
        if (stepInfo.type === 'action') {
          console.log(`[UI Spinner] 🔧 AI calling: ${stepInfo.tool}`);
        }
      }
    }
  );
  console.log("\n✅ RESPONSE 2:", response2);

  console.log("\n=======================================================");
  console.log("🧪 TEST 3: Max Iterations limit");
  console.log("=======================================================");
  
  const response3 = await agent.execute(
    "Can you call the 'app.getMassiveData' tool? After that, call it again. And again.",
    {
      model: 'gemini:gemini-flash-latest',
      
      maxIterations: 1
      onStep: (stepInfo) => {
        console.log(`[UI Spinner] Loop triggered...`);
      }
    }
  );
  console.log("\n✅ RESPONSE 3:", response3);

  console.log("\n✅ All advanced options tested successfully!");
}

run().catch(console.error);
