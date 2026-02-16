import { Context } from '../runtime/Context';
import { Session } from '../runtime/Session';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';
import { AgentController } from './AgentController';
import { ToolExecutor } from './ToolExecutor';
import { IPlanner } from './Planner';
import { DATAULT_AGENT_CONFIG } from '../../types/AgentConfig';

const log = logger.child('orchestrator');

export class Orchestrator {
  private context: Context;
  private eventBus: EventBus<AgentEvents>;
  private sessions: Map<string, Session> = new Map();
  
  private controller: AgentController;

  constructor(
    context: Context, 
    eventBus: EventBus<AgentEvents>,
    planner: IPlanner,
    toolExecutor: ToolExecutor
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

  async handleInput(input: string, options?: { model?: string }): Promise<string> {
    const session = this.getOrCreateSession();
    
    if (options?.model) {
      session.metadata.model = options.model;
    }

    return this.controller.run(session, input);
  }

  private getOrCreateSession(): Session {
    const id = this.context.sessionId;
    if (!this.sessions.has(id)) {
      this.sessions.set(id, new Session(id));
    }
    return this.sessions.get(id)!;
  }
}
