import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { IPlanner, PlanResult } from '../src/agent/orchestrator/Planner';
import { Session } from '../src/agent/runtime/Session';

// ==========================================
// 1. THE LOGIC (The "Math" Brain)
// ==========================================
class MathPlanner implements IPlanner {
  constructor(private context: any) {}

  async plan(session: Session): Promise<PlanResult> {
    const history = session.getHistory();
    const lastMsg = history[history.length - 1];

    // --- STEP 1: CHECK IF WE NEED TOOL ---
    // If the last message was from a tool, it means we just finished adding.
    if (lastMsg.role === 'tool') {
        // We have the answer, now tell the user.
        console.log('[Logic] Tool returned result. Synthesizing answer...');
        
        // For this demo, we can just return it or ask LLM.
        const llm = this.context.providers.getLLM();
        if (!llm) return { kind: 'error', error: 'No LLM' };

        const response = await llm.chat([
            ...history, 
            { role: 'user', content: 'Given the tool result above, answer my original question.' }
        ]);
        
        return { kind: 'response', message: response.content };
    }

    // --- STEP 2: DECIDE TO USE TOOL ---
    // If user asks to add, we call the tool.
    if (lastMsg.content.includes('add')) {
        console.log('[Logic] User wants to add. Calling tool...');
        
        return {
            kind: 'action',
            toolCalls: [{
                id: 'call_math_1',
                name: 'math_add', // Underscore instead of dot
                arguments: { a: 50, b: 100 } // Hardcoded for demo, normally extracted by LLM
            }]
        };
    }

    // Default response if no intent matched
    return { kind: 'response', message: "I can only add numbers." };
  }
}

// ==========================================
// 2. THE EXECUTION
// ==========================================
async function main() {
  console.log('--- 🚀 Starting Tool-User Agent ---');

  const agent = new Agent('./config');
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.init();

  // --- REGISTER CUSTOM TOOL ---
  // We can register tools programmatically!
  agent.tools.register({
    name: 'math_add',
    description: 'Adds two numbers',
    parameters: [
        { name: 'a', type: 'number', description: 'First number', required: true },
        { name: 'b', type: 'number', description: 'Second number', required: true }
    ],
    execute: async (context: any, args: any) => {
        console.log(`[Tool] Executing math.add(${args.a}, ${args.b})...`);
        return { success: true, data: Number(args.a) + Number(args.b) };
    }
  });

  await agent.boot();

  // Inject Logic
  agent.setPlanner(new MathPlanner((agent as any).context));

  // Run
  console.log('User: Please add 50 and 100.');
  const response = await agent.handleInput('Please add 50 and 100');
  
  console.log(`\n[Agent] Response: ${response}`);
  console.log('--- Done ---');

  await agent.shutdown();
}

main().catch(console.error);
