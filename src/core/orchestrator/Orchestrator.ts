import { Context } from '../../agent/runtime/Context';
import { Session } from '../../agent/runtime/Session';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { PlannerController } from './PlannerController';
import { ToolExecutor } from './ToolExecutor';
import { IPlanner } from './Planner';
import { ISessionStore } from '../../agent/runtime/SessionStore';
import { ExecutionConfig } from './ExecutionConfig';

const log = logger.child('orchestrator');

export class Orchestrator {
  private controller: PlannerController;
  private config: ExecutionConfig;

  constructor(
    private context: Context,
    private eventBus: EventBus<AgentEvents>,
    private planner: IPlanner,
    private toolExecutor: ToolExecutor,
    private sessionStore: ISessionStore,
    config?: ExecutionConfig
  ) {
    this.config = config || ExecutionConfig.default();
    
    this.controller = new PlannerController(
      this.planner,
      this.toolExecutor,
      this.eventBus,
      this.sessionStore,
      this.config
    );
  }

  setPlanner(planner: IPlanner): void {
    this.planner = planner;
    this.controller = new PlannerController(
      this.planner,
      this.toolExecutor,
      this.eventBus,
      this.sessionStore,
      this.config
    );
    log.info(`Orchestrator planner updated to: ${planner.constructor.name}`);
  }

  async handleInput(input: string, options?: { model?: string; sessionId?: string; metadata?: Record<string, any>; systemPrompt?: string; [key: string]: any }): Promise<string> {
    const explicitId = options?.sessionId || options?.session_id;
    const sessionResult = await this.getOrCreateSession(explicitId);
    const session = sessionResult.session;
    const isNewSession = sessionResult.isNew;

    if (options?.model) {
      session.metadata.model = options.model;
    }
    
    if (isNewSession) {
      this.eventBus.emit('session:created' as any, session.id);
    }

    this.eventBus.emit('orchestrator:request:start' as any, session.id, input);
    log.info(`Starting execution for session ${session.id}`);

    const systemPrompt = options?.systemPrompt;
    if (systemPrompt && isNewSession) {
      session.addMessage({ role: 'system', content: systemPrompt, timestamp: new Date() });
    }

    session.addMessage({ role: 'user', content: input, timestamp: new Date() });
    await this.sessionStore.set(session.id, session);

    try {
      const result = await this.controller.run(session, this.context, options);
      this.eventBus.emit('orchestrator:request:end' as any, session.id, true);
      return result;
    } catch (e: any) {
      this.eventBus.emit('orchestrator:request:end' as any, session.id, false, String(e));
      throw e;
    }
  }

  private async getOrCreateSession(explicitId?: string): Promise<{ session: Session, isNew: boolean }> {
    const id = explicitId || this.context.sessionId;
    let session = await this.sessionStore.get(id);
    
    if (!session) {
      session = new Session(id);
      await this.sessionStore.set(id, session);
      return { session: session as Session, isNew: true };
    }
    
    return { session: session as Session, isNew: false };
  }

  async listSessions(): Promise<string[]> {
    return this.sessionStore.list();
  }

  getPlanner(): IPlanner {
    return this.planner;
  }

  getSessionStore(): ISessionStore {
    return this.sessionStore;
  }
}
