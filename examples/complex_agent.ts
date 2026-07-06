import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { IPlanner, PlanResult } from '../src/agent/orchestrator/Planner';
import { Session } from '../src/agent/runtime/Session';
import { AgentConfig } from '../src/types/Runtime';

// --- 1. Complex Logic Planner ---
class ResearchPlanner implements IPlanner {
  constructor(private context: any) {}

  async plan(session: Session): Promise<PlanResult> {
    const history = session.getHistory();
    const lastMsg = history[history.length - 1];
    
    // Step 1: PLAN (Think)
    // We can ask LLM to reason first without taking action
    const llm = this.context.providers.getLLM();
    if (!llm) return { kind: 'error', error: 'No LLM' };
    
    console.log('[Planner] Thinking...');
    // Simulated thinking... 
    // const plan = await llm.chat([{ role: 'system', content: 'You are a planner. Output JSON plan.' }, ...history]);
    
    // Step 2: DECIDE (Action)
    // If we haven't searched yet, search.
    const hasSearched = history.some(m => m.role === 'tool' && m.metadata?.toolName === 'web.fetch');
    
    if (!hasSearched && lastMsg.content.includes('research')) {
        return {
            kind: 'action',
            toolCalls: [{
                id: 'call_1',
                name: 'web.fetch',
                arguments: { url: 'https://example.com' }
            }]
        };
    }

    // Step 3: SYNTHESIS (Final Answer)
    // Once we have data, we synthesize.
    console.log('[Planner] Synthesizing final answer...');
    
    // To Stream: We would return a special result type here, e.g.
    // kind: 'stream', stream: llm.stream(...) 
    // Current architecture supports string response (awaited).
    
    const finalAnswer = await llm.chat([
        ...history, 
        { role: 'system', content: 'Synthesize the tool results into a final answer.' }
    ]);

    return { kind: 'response', message: finalAnswer.content };
  }
}

async function main() {
  // --- 2. Initialize Agent ---
  const agent = new Agent('./config');
  
  // --- 3. Override Default Config (Controller Settings) ---
  // You can set max steps, retry limits here manually if exposed, 
  // or modify the config file directly.
  // agent.config.controller.maxSteps = 20; 
  // agent.config.tools.maxRetries = 5;

  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.init();
  await agent.boot();

  // --- 4. Set Complex Planner ---
  agent.setPlanner(new ResearchPlanner((agent as any).context));

  // --- 5. Run ---
  console.log('User: Research agents for me.');
  const response = await agent.handleInput('Please research agents.');
  console.log(`Agent: ${response}`);

  await agent.shutdown();
}

main().catch(console.error);
