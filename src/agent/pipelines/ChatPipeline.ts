import { BasePipeline } from './BasePipeline';
import { Orchestrator } from '../../core/orchestrator/Orchestrator';
import { logger } from '../../utils/logger';

const log = logger.child('pipeline:chat');

export class ChatPipeline extends BasePipeline {
  name = 'chat';
  description = 'Lightweight conversational pipeline without heavy tool execution logic.';

  async execute(orchestrator: Orchestrator, input: string, options?: Record<string, any>): Promise<string> {
    log.info('Running via ChatPipeline (Lightweight mode)');
    
    const planner = orchestrator.getPlanner();
    const sessionStore = orchestrator.getSessionStore();
    
    const sessionId = options?.sessionId || options?.session_id || 'default_chat';
    let session = await sessionStore.get(sessionId);
    if (!session) {
      session = new (require('../runtime/Session').Session)(sessionId);
      await sessionStore.set(sessionId, session!);
    }
    
    const activeSession = session!;
    
    activeSession.addMessage({ role: 'user', content: input, timestamp: new Date() });
    
    try {
      const result = await planner.plan(activeSession, options);
      if (result.kind === 'response') {
        activeSession.addMessage({ role: 'assistant', content: result.message || '', timestamp: new Date() });
        await sessionStore.set(sessionId, activeSession);
        return result.message || '';
      } else if (result.kind === 'action') {
        return "I tried to use tools, but I'm in Chat mode! I can only talk.";
      } else {
        return `Error: ${result.error}`;
      }
    } catch (e: any) {
      return `Chat Error: ${e.message}`;
    }
  }
}
