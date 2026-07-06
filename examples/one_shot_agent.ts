import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { IPlanner, PlanResult } from '../src/agent/orchestrator/Planner';
import { Session } from '../src/agent/runtime/Session';

// ==========================================
// 1. THE LOGIC (The "One-Shot" Brain)
// ==========================================
class OpenAI_OneShotPlanner implements IPlanner {
  constructor(private context: any) {}

  async plan(session: Session): Promise<PlanResult> {
    // 1. Get user query
    const history = session.getHistory();
    const lastMsg = history[history.length - 1];
    console.log(`\n[Logic] User asked: "${lastMsg.content}"`);

    // 2. Select Provider
    // We try to get 'openai', or fallback to default
    // Note: ProviderRegistry.getLLM(name?) returns ILLMProvider
    const openai = this.context.providers.getLLM('openai') || this.context.providers.getLLM();
    
    if (!openai) {
      console.error('LLM provider not found! Check providers.json');
      return { kind: 'error', error: 'LLM Missing' };
    }

    // 3. One Shot Execution (Like an API call)
    console.log(`[Logic] Calling LLM (${openai.name})...`);
    
    const response = await openai.chat([{ role: 'user', content: lastMsg.content }]);

    // 4. Return Result immediately (Loop terminates)
    return { kind: 'response', message: response.content };
  }
}

// ==========================================
// 2. THE EXECUTION (The Script)
// ==========================================
async function main() {
  console.log('--- 🚀 Starting One-Shot Agent ---');

  // A. Init Core
  const agent = new Agent('./config');
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.init();
  await agent.boot();

  // B. Inject our Logic
  // We pass the internal context so the planner can access providers
  agent.setPlanner(new OpenAI_OneShotPlanner((agent as any).context));

  // C. Execute
  // This looks like a simple function call to the outside world
  const answer = await agent.handleInput('What is the capital of France?');
  
  console.log(`\n[Agent] Response: ${answer}`);
  console.log('--- Done ---');

  await agent.shutdown();
}

main().catch(console.error);
