import { ToolCall } from '../../types/Provider';
import { ToolResult } from '../../types/Tool';
import { Context } from '../../agent/runtime/Context';
import { ToolConfig } from '../../types/AgentConfig';
import { logger } from '../../utils/logger';
import { EventBus, AgentEvents } from '../../utils/events';

const log = logger.child('tool-executor');

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

export interface ExecutorResult {
  callId: string;
  toolName: string;
  result: ToolResult;
}

export class ToolExecutor {
  private context: Context;
  private config: ToolConfig;
  private eventBus: EventBus<AgentEvents>;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private middlewares: Array<(call: ToolCall) => boolean | string | Promise<boolean | string>> = [];

  constructor(
    context: Context,
    config: ToolConfig,
    eventBus: EventBus<AgentEvents>,
    middlewares: Array<(call: ToolCall) => boolean | string | Promise<boolean | string>> = []
  ) {
    this.context = context;
    this.config = config;
    this.eventBus = eventBus;
    this.middlewares = middlewares;
  }

  async executeBatch(calls: ToolCall[]): Promise<ExecutorResult[]> {
    return Promise.all(calls.map(call => this.execute(call)));
  }

  async execute(call: ToolCall): Promise<ExecutorResult> {
    const toolName = call.name;
    const callId = call.id;
    
    if (this.isCircuitOpen(toolName)) {
      const msg = `Circuit breaker open for tool: ${toolName}`;
      log.warn(msg);
      return { callId, toolName, result: { success: false, error: msg } };
    }

    let attempt = 0;
    let lastError: any;

    while (attempt <= this.config.maxRetries) {
      try {
        if (attempt > 0) {
          log.info(`Retrying tool ${toolName} (Attempt ${attempt + 1}/${this.config.maxRetries + 1})...`);
          await this.delay(this.config.retryDelay * attempt); 
        }

        const result = await this.executeSingle(call);
        this.resetCircuit(toolName);
        return { callId, toolName, result };

      } catch (error) {
        lastError = error;
        attempt++;
        log.warn(`Tool execution failed: ${toolName} - ${error}`);
      }
    }

    this.recordFailure(toolName);
    const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
    return { callId, toolName, result: { success: false, error: `Max retries exceeded. Last error: ${errorMsg}` } };
  }

  private async executeSingle(call: ToolCall): Promise<ToolResult> {
    for (const middleware of this.middlewares) {
      const allowed = await middleware(call);
      if (allowed !== true) {
        const reason = typeof allowed === 'string' ? allowed : `Execution of ${call.name} denied by security middleware or user consent.`;
        log.warn(`Tool execution blocked: ${call.name} (Reason: ${reason})`);
        return {
          success: false,
          error: reason
        };
      }
    }

    const start = Date.now();
    const tool = await this.context.tools.get(call.name);

    if (!tool) {
      throw new Error(`Tool not found: ${call.name}`);
    }

    const result = await Promise.race([
      tool.execute(this.context, call.arguments),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
      )
    ]);

    const duration = Date.now() - start;
    this.eventBus.emit('tool:executed', call.name, call.arguments, result, duration);
    log.info(`Tool ${call.name} executed successfully in ${duration}ms`);
    
    return result;
  }


  private isCircuitOpen(toolName: string): boolean {
    const state = this.circuitBreakers.get(toolName);
    if (!state) return false;

    if (state.isOpen) {
        if (Date.now() - state.lastFailure > this.config.circuitBreakerResetTime) {
            log.info(`Circuit breaker half-open for tool: ${toolName}`);
            return false; 
        }
        return true;
    }
    return false;
  }

  private recordFailure(toolName: string) {
    let state = this.circuitBreakers.get(toolName);
    if (!state) {
        state = { failures: 0, lastFailure: 0, isOpen: false };
        this.circuitBreakers.set(toolName, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold) {
        state.isOpen = true;
        log.warn(`Circuit breaker OPENED for tool: ${toolName}`);
    }
  }

  private resetCircuit(toolName: string) {
    if (this.circuitBreakers.has(toolName)) {
        this.circuitBreakers.delete(toolName);
        log.info(`Circuit breaker reset for tool: ${toolName}`);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
