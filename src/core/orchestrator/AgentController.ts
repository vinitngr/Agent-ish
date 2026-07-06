import { Context } from '../../agent/runtime/Context';
import { Session } from '../../agent/runtime/Session';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { ControllerConfig } from '../../types/AgentConfig';
import { IPlanner } from './Planner';
import { ToolExecutor, ExecutorResult } from './ToolExecutor';

const log = logger.child('agent-controller');

export class AgentController {
  private context: Context;
  private config: ControllerConfig;
  private planner: IPlanner;
  private toolExecutor: ToolExecutor;
  private eventBus: EventBus<AgentEvents>;

  constructor(
    context: Context,
    config: ControllerConfig,
    planner: IPlanner,
    toolExecutor: ToolExecutor,
    eventBus: EventBus<AgentEvents>
  ) {
    this.context = context;
    this.config = config;
    this.planner = planner;
    this.toolExecutor = toolExecutor;
    this.eventBus = eventBus;
  }

  setPlanner(planner: IPlanner): void {
    this.planner = planner;
  }

  async run(session: Session, input: string, metadata?: Record<string, any>): Promise<string> {
    log.info(`Starting execution for session ${session.id}`);

    session.addMessage({
      role: 'user',
      content: input,
      timestamp: new Date(),
    });

    let currentStep = 0;
    let consecutiveErrors = 0;
    const maxSteps = 10;

    while (currentStep < maxSteps) {
      currentStep++;
      log.debug(`Step ${currentStep}/${maxSteps}`);

      const plan = await this.planner.plan(session);

      if (plan.kind === 'error') {
        consecutiveErrors++;
        log.error(`Planning error: ${plan.error}`);
        if (consecutiveErrors >= this.config.maxConsecutiveErrors) {
          return `Error: Too many consecutive planning errors. Last error: ${plan.error}`;
        }
        continue;
      }
      consecutiveErrors = 0;

      if (plan.kind === 'response') {
        session.addMessage({
          role: 'assistant',
          content: plan.message,
          timestamp: new Date(),
        });
        return plan.message;
      }

      if (plan.kind === 'action') {
        this.eventBus.emit('orchestrator:act', session.id, 'tool_calls');

        // Inject interface metadata into tool calls
        if (metadata) {
          plan.toolCalls.forEach(call => {
            call.metadata = { ...call.metadata, ...metadata };
          });
        }

        session.addMessage({
          role: 'assistant',
          content: '',
          toolCalls: plan.toolCalls,
          timestamp: new Date()
        });

        const results: ExecutorResult[] = await this.toolExecutor.executeBatch(plan.toolCalls);

        for (const result of results) {
          session.addMessage({
            role: 'tool',
            content: JSON.stringify(result.result),
            timestamp: new Date(),
            toolCallId: result.callId,
            metadata: { toolName: result.toolName },
          });
        }

        this.eventBus.emit('orchestrator:observe', session.id, results as any);

        if (this.planner.onToolResults) {
          await this.planner.onToolResults(session);
        }
      }
    }

    const timeoutMsg = 'Max steps reached without final response.';
    log.warn(timeoutMsg);
    return timeoutMsg;
  }
}
