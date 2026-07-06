import { Context } from '../runtime/Context';
import { Session } from '../runtime/Session';
import { IPlanner, PlanResult } from './Planner';
import { PlannerConfig } from '../types/AgentConfig';
import { LLMMessage } from '../types/Provider';
import { logger } from '../utils/logger';
import { EventBus, AgentEvents } from '../utils/events';

import { AgentExecuteOptions } from '../types/ExecuteOptions';

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

  async plan(session: Session, options?: AgentExecuteOptions): Promise<PlanResult> {
    const llm = this.context.providers.getLLM();
    if (!llm) {
      return { kind: 'error', error: 'No LLM provider configured' };
    }

    const model = options?.model || session.metadata?.model as string | undefined;
    if (model) {
       log.info(`Using model override: ${model}`);
    }

    try {
      const messages = this.buildMessages(session, options);
      let tools = this.context.tools.getAll();
      const allowedTools = options?.allowedTools || session.metadata?.allowedTools as string[] | undefined;
      const disabledTools = options?.disabledTools;
      
      if (allowedTools) {
        tools = tools.filter(t => allowedTools.includes(t.name));
        log.debug(`Filtered tools to allowed list: ${allowedTools.join(', ')}`);
      }
      
      if (disabledTools) {
        tools = tools.filter(t => !disabledTools.includes(t.name));
        log.debug(`Disabled tools: ${disabledTools.join(', ')}`);
      }
      
      const toolDefs = tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: this.toolParamsToSchema(t.parameters),
      }));

      log.info('Thinking...');
      this.eventBus.emit('orchestrator:think', session.id);
      
      const requestOptions = {
        tools: toolDefs,
        model,
        temperature: options?.temperature,
        maxTokens: options?.maxOutputTokens
      };

      if (options?.onStream && typeof llm.chatStream === 'function') {
        const stream = llm.chatStream(messages, requestOptions);
        let fullContent = '';
        let finalToolCalls: any[] = [];

        for await (const chunk of stream) {
          if (chunk.content) {
            fullContent += chunk.content;
            options.onStream(chunk.content);
          }
          if (chunk.toolCalls) {
            finalToolCalls = chunk.toolCalls;
          }
        }

        if (finalToolCalls && finalToolCalls.length > 0) {
          log.info(`Plan: Call tools ${finalToolCalls.map(c => c.name).join(', ')}`);
          return { kind: 'action', toolCalls: finalToolCalls };
        }

        log.info('Plan: Respond to user');
        return { kind: 'response', message: fullContent };
      }

      const response = await llm.chat(messages, requestOptions);

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

  private buildMessages(session: Session, options?: AgentExecuteOptions): LLMMessage[] {
    const fullHistory = session.getHistory();
    const maxHistory = options?.historyLimit || this.config.maxHistoryMessages || 30;
    
    let baseMessages = [...fullHistory];
    
    // Inject custom systemContext if provided
    if (options?.systemContext) {
       const existingSystem = baseMessages.findIndex(m => m.role === 'system');
       if (existingSystem >= 0) {
           baseMessages[existingSystem] = { 
               ...baseMessages[existingSystem], 
               content: baseMessages[existingSystem].content + `\n\n${options.systemContext}` 
           };
       } else {
           baseMessages.unshift({ role: 'system', content: options.systemContext, timestamp: new Date() });
       }
    }
    
    if (baseMessages.length <= maxHistory) {
      return this.mapToLLMMessages(baseMessages);
    }
    
    let startIndex = 0;
    const messagesToKeep: typeof baseMessages = [];
    
    if (baseMessages.length > 0 && baseMessages[0].role === 'system') {
      messagesToKeep.push(baseMessages[0]);
      startIndex = 1;
    }
    
    const remainingSlots = maxHistory - messagesToKeep.length;
    const recentMessages = baseMessages.slice(Math.max(startIndex, baseMessages.length - remainingSlots));
    
    log.info(`Context sliding window triggered: truncated ${baseMessages.length - maxHistory} old messages.`);
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
