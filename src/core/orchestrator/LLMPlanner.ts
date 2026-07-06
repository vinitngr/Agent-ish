import { Context } from '../../agent/runtime/Context';
import { Session } from '../../agent/runtime/Session';
import { IPlanner, PlanResult } from './Planner';
import { PlannerConfig } from '../../types/AgentConfig';
import { LLMMessage } from '../../types/Provider';
import { logger } from '../../utils/logger';
import { EventBus, AgentEvents } from '../../utils/events';

const log = logger.child('llm-planner');

export class LLMPlanner implements IPlanner {
  private context: Context;
  private config: PlannerConfig;
  private eventBus: EventBus<AgentEvents>;

  constructor(context: Context, config: PlannerConfig, eventBus: EventBus<AgentEvents>) {
    this.context = context;
    this.config = config;
    this.eventBus = eventBus;
  }

  async plan(session: Session): Promise<PlanResult> {
    const llm = this.context.providers.getLLM();
    if (!llm) {
      return { kind: 'error', error: 'No LLM provider configured' };
    }

    const model = session.metadata?.model as string | undefined;
    if (model) {
       log.info(`Using model override: ${model}`);
    }

    try {
      const messages = this.buildMessages(session);
      const tools = this.context.tools.getAll();
      
      const toolDefs = tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: this.toolParamsToSchema(t.parameters),
      }));

      log.info('Thinking...');
      this.eventBus.emit('orchestrator:think', session.id);
      
      const response = await llm.chat(messages, { 
        tools: toolDefs,
        model 
      });

      if (response.toolCalls && response.toolCalls.length > 0) {
        log.info(`Plan: Call tools ${response.toolCalls.map(c => c.name).join(', ')}`);
        return { kind: 'action', toolCalls: response.toolCalls };
      }

      log.info('Plan: Respond to user');
      return { kind: 'response', message: response.content };

    } catch (error) {
       const msg = error instanceof Error ? error.message : String(error);
       log.error(`Planning failed: ${msg}`);
       return { kind: 'error', error: msg };
    }
  }

  private buildMessages(session: Session): LLMMessage[] {
    const fullHistory = session.getHistory();
    const maxHistory = this.config.maxHistoryMessages || 30;
    
    if (fullHistory.length <= maxHistory) {
      return this.mapToLLMMessages(fullHistory);
    }
    
    let startIndex = 0;
    const messagesToKeep: typeof fullHistory = [];
    
    if (fullHistory.length > 0 && fullHistory[0].role === 'system') {
      messagesToKeep.push(fullHistory[0]);
      startIndex = 1;
    }
    
    const remainingSlots = maxHistory - messagesToKeep.length;
    const recentMessages = fullHistory.slice(Math.max(startIndex, fullHistory.length - remainingSlots));
    
    log.info(`Context sliding window triggered: truncated ${fullHistory.length - maxHistory} old messages.`);
    return this.mapToLLMMessages([...messagesToKeep, ...recentMessages]);
  }

  private mapToLLMMessages(messages: any[]): LLMMessage[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      toolCallId: m.metadata?.toolCallId as string | undefined,
    }));
  }

  private toolParamsToSchema(params: { name: string; type: string; description: string; required: boolean }[]): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const p of params) {
      properties[p.name] = {
        type: p.type,
        description: p.description,
      };
      if (p.required) {
        required.push(p.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }
}
