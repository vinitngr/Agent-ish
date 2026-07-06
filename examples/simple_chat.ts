import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { IPlanner, PlanResult } from '../src/agent/orchestrator/Planner';
import { Session } from '../src/agent/runtime/Session';
import { logger } from '../src/utils/logger';

// Silence INFO logs to keep the TUI clean
logger.setLevel('warn');

class SimpleChatPlanner implements IPlanner {
  constructor(private context: any) {}

  async plan(session: Session): Promise<PlanResult> {
    const history = session.getHistory();
    
    const messages = history.map(m => ({
        role: m.role,
        content: m.content
    }));

    const llm = this.context.providers.getLLM();
    if (!llm) return { kind: 'error', error: 'No LLM' };

    console.log('[SimpleChatPlanner] Asking LLM (No tools)...');
    
    const response = await llm.chat(messages);

    return { kind: 'response', message: response.content };
  }
}

import { TerminalInterface } from '../src/interfaces/terminal/TerminalInterface';

async function main() {
  const agent = new Agent('./config');
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  
  const terminal = new TerminalInterface();
  agent.interfaces.register(terminal);

  await agent.init();
  await agent.boot();

  const context = (agent as any).context; 
  agent.setPlanner(new SimpleChatPlanner(context));

  await agent.run();
}

main().catch(console.error);
