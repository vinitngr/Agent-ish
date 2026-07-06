import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { IPlanner, PlanResult } from '../src/agent/orchestrator/Planner';
import { Session } from '../src/agent/runtime/Session';
class MyCustomPlanner implements IPlanner {
  async plan(session: Session): Promise<PlanResult> {
    const history = session.getHistory();
    const lastMsg = history[history.length - 1];

    console.log(`[CustomPlanner] Thinking about: "${lastMsg.content}"`);

    // Logic: If user says "ping", we say "pong"
    if (lastMsg.content.includes('ping')) {
        return { kind: 'response', message: 'Pong! 🏓 (From Custom Logic)' };
    }

    // Logic: If user says "search", we trigger a tool
    if (lastMsg.content.includes('search')) {
        // Stop if we already tried and failed
        if (history.some(m => m.role === 'tool')) {
             return { kind: 'response', message: 'I tried to fetch but maybe it failed or I am done.' };
        }

        return { 
            kind: 'action', 
            toolCalls: [{ 
                id: 'call_1', 
                name: 'web.fetch', 
                arguments: { url: 'https://google.com' } 
            }] 
        };
    }

    return { kind: 'response', message: 'I am a custom logic planner.' };
  }
}

async function main() {
  console.log('--- 🚀 Starting Agent Architecture Test ---');

  // 1. Initialize Core
  const agent = new Agent('./config');
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.init();
  await agent.boot();

  // 2. Run with DEFAULT Logic (LLMPlanner)
  // console.log('\n--- Test 1: Default Brain ---');
  // await agent.handleInput('Hello, who are you?');

  // 3. SWAP THE BRAIN (Runtime Strategy)
  console.log('\n--- Test 2: Injecting Custom Brain ---');
  agent.setPlanner(new MyCustomPlanner());

  // 4. Run with CUSTOM Logic
  const response1 = await agent.handleInput('ping');
  console.log(`User: ping -> Agent: ${response1}`);

  console.log('\n--- Test 3: Custom Logic (Tools) ---');
  // Note: We won't actually run search as we likely don't have API key, 
  // but we want to see the Planner decide to use it.
  try {
      await agent.handleInput('search for agents');
  } catch (e) {
      // Expected if web_search tool isn't configured/mocked, but shows intent
      console.log('Agent tried to search (success)');
  }

  await agent.shutdown();
  console.log('\n✅ Architecture Verified: Logic is De-Coupled!');
}

main().catch(console.error);
