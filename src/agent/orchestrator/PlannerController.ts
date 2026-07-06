import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { IPlanner, PlanResult } from './Planner';
import { ToolExecutor } from './ToolExecutor';
import { ExecutionConfig } from './ExecutionConfig';
import { Context } from '../runtime/Context';
import { ISessionStore, ISession } from '../runtime/SessionStore';
import { ExecutionState } from './ExecutionState';

const log = logger.child('planner-controller');

export class PlannerController {
  constructor(
    private planner: IPlanner,
    private toolExecutor: ToolExecutor,
    private eventBus: EventBus<AgentEvents>,
    private sessionStore: ISessionStore,
    private config: ExecutionConfig
  ) {}

  async run(session: ISession, context: Context, options?: Record<string, any>): Promise<string> {
    const maxIterations = this.config.limits.safety.maxIterations;
    const timeoutSeconds = this.config.limits.safety.maxRunTimeSeconds;
    const retryConfig = this.config.controller.retryLogic;

    const plannerModel = options?.model || this.config.models.roles.planner;
    const plannerOptions = {
      ...(options || {}),
      model: plannerModel,
      temperature: this.config.models.defaultParams.temperature,
    };

    const state = new ExecutionState();
    state.id = session.id;
    state.sessionId = session.id;
    state.session = session;
    state.options = plannerOptions;
    state.sources = context.get<any[]>('sources') || [];

    try {
      // Setup timeout for the execution loop
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutSeconds * 1000);
      });

      return await Promise.race([
        this.executionLoop(state, context, maxIterations, retryConfig),
        timeoutPromise
      ]);
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        log.error(`Run timed out after ${timeoutSeconds}s`);
        return `Error: Execution timed out after ${timeoutSeconds} seconds.`;
      }
      throw error;
    }
  }

  private async executionLoop(
    state: ExecutionState,
    context: Context,
    maxIterations: number,
    retryConfig: ExecutionConfig['controller']['retryLogic']
  ): Promise<string> {
    const session = state.session!;

    while (state.iteration < maxIterations) {
      state.iteration++;
      log.info(`Step ${state.iteration}/${maxIterations}`);

      const plan = await this.planWithRetry(session, state.options, retryConfig);

      if (plan.kind === 'error') {
        log.error(`Planning error: ${plan.error}`);
        this.eventBus.emit('planner:error' as any, session.id, plan.error);
        return `Error: ${plan.error}`;
      }

      if (plan.kind === 'response') {
        session.addMessage({
          role: 'assistant',
          content: plan.message || '',
          timestamp: new Date()
        });
        // await this.sessionStore.set(session); // Assume set exists or save
        return plan.message || '';
      }

      if (plan.kind === 'action' && plan.toolCalls) {
        this.eventBus.emit('orchestrator:act' as any, session.id, 'tool_calls');

        if (this.detectLoop(plan.toolCalls, state.recentToolCalls)) {
          log.warn('Loop detected: repeated identical tool calls');
          this.eventBus.emit('planner:loop_detected' as any, session.id, plan.toolCalls);
          return 'Error: Detected repeated tool calls. Stopping to prevent infinite loop.';
        }

        this.trackToolCalls(plan.toolCalls, state.recentToolCalls);

        session.addMessage({
          role: 'assistant',
          content: '',
          toolCalls: plan.toolCalls as any,
          timestamp: new Date()
        });

        // The python version expects executeBatch to return results array
        const results = await this.toolExecutor.executeBatch(
          plan.toolCalls,
          this.config.toolExecution as any
        );

        for (const res of results) {
          session.addMessage({
            role: 'tool',
            content: JSON.stringify(res.result),
            toolCallId: res.callId,
            metadata: {
              toolName: res.toolName,
              ...(res.metadata || {})
            },
            timestamp: new Date()
          });
        }

        this.eventBus.emit('orchestrator:observe' as any, session.id, results);
        
        if (this.planner.onToolResults) {
          await this.planner.onToolResults(session, state.options);
        }
      }
    }

    this.eventBus.emit('planner:max_iterations' as any, session.id, maxIterations);
    return 'Max iterations reached without final response.';
  }

  private async planWithRetry(
    session: ISession,
    options: Record<string, any>,
    retryConfig: ExecutionConfig['controller']['retryLogic']
  ): Promise<PlanResult> {
    let lastError: string | null = null;
    const fallbackModel = this.config.models.roles.fallback;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const currentOptions = { ...options };

        if (attempt > 0 && attempt === retryConfig.maxRetries) {
          log.warn(`Switching to fallback model: ${fallbackModel}`);
          currentOptions.model = fallbackModel;
        }

        const plan = await this.planner.plan(session as any, currentOptions);

        if (plan.kind === 'error' && this.isRetryable(plan.error, retryConfig)) {
          lastError = plan.error || 'Unknown error';
          const delay = this.getBackoffDelay(attempt, retryConfig);
          log.warn(`Retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
          this.eventBus.emit('planner:retry' as any, session.id, attempt + 1, plan.error);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return plan;
      } catch (e: any) {
        lastError = e.message || String(e);
        if (attempt < retryConfig.maxRetries) {
          const delay = this.getBackoffDelay(attempt, retryConfig);
          log.warn(`Exception during planning, retrying in ${delay}ms: ${lastError}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    return { kind: 'error', error: `All retries exhausted: ${lastError}` };
  }

  private isRetryable(error: string | undefined, retryConfig: ExecutionConfig['controller']['retryLogic']): boolean {
    if (!error) return false;
    return retryConfig.retryOn.some(code => error.includes(String(code)));
  }

  private getBackoffDelay(attempt: number, retryConfig: ExecutionConfig['controller']['retryLogic']): number {
    const base = retryConfig.baseDelayMs;
    if (retryConfig.backoff === 'exponential') return base * Math.pow(2, attempt);
    if (retryConfig.backoff === 'linear') return base * (attempt + 1);
    return base;
  }

  private detectLoop(currentCalls: any[], recentCalls: string[]): boolean {
    if (!this.config.limits.safety.preventRecursiveLoops) return false;

    const currentSignature = this.callsSignature(currentCalls);
    let consecutiveCount = 0;
    
    for (let i = recentCalls.length - 1; i >= 0; i--) {
      if (recentCalls[i] === currentSignature) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    return consecutiveCount >= 2; // Loop if seen twice consecutively previously
  }

  private trackToolCalls(calls: any[], recent: string[]): void {
    recent.push(this.callsSignature(calls));
    if (recent.length > 10) {
      recent.shift();
    }
  }

  private callsSignature(calls: any[]): string {
    const parts = calls.map(c => {
      const name = c.function?.name || c.name || '';
      const args = typeof c.function?.arguments === 'string' 
        ? c.function.arguments 
        : JSON.stringify(c.arguments || {});
      return `${name}:${args}`;
    });
    return parts.sort().join('|');
  }
}
