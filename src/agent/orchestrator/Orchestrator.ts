import { Context } from '../runtime/Context';
import { Session } from '../runtime/Session';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { AgentController } from './AgentController';
import { ToolExecutor } from './ToolExecutor';
import { IPlanner } from './Planner';
import { DATAULT_AGENT_CONFIG } from '../../types/AgentConfig';
import { ISessionStore } from '../runtime/SessionStore';

const log = logger.child('orchestrator');

export class Orchestrator {
  private context: Context;
  private eventBus: EventBus<AgentEvents>;
  private controller: AgentController;

  constructor(
    context: Context, 
    eventBus: EventBus<AgentEvents>,
    planner: IPlanner,
    toolExecutor: ToolExecutor,
    private sessionStore: ISessionStore
  ) {
    this.context = context;
    this.eventBus = eventBus;

    const config = DATAULT_AGENT_CONFIG;
    
    this.controller = new AgentController(
      context, 
      config.controller, 
      planner, 
      toolExecutor, 
      eventBus
    );
  }

  setPlanner(planner: IPlanner): void {
    this.controller.setPlanner(planner);
  }

  async handleInput(input: string, options?: { model?: string; sessionId?: string; metadata?: Record<string, any> }): Promise<string> {
    const session = await this.getOrCreateSession(options?.sessionId);
    
    if (options?.model) {
      session.metadata.model = options.model;
    }

    return this.controller.run(session, input, options?.metadata);
  }

  private async getOrCreateSession(explicitId?: string): Promise<Session> {
    const id = explicitId || this.context.sessionId;
    let session = await this.sessionStore.get(id);
    
    if (!session) {
      session = new Session(id);
      await this.sessionStore.set(id, session);
    }
    
    return session;
  }

  async listSessions(): Promise<string[]> {
    return this.sessionStore.list();
  }
}
