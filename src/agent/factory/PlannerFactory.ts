import { IPlanner } from '../orchestrator/Planner';
import { LLMPlanner } from '../orchestrator/LLMPlanner';
import { Context } from '../runtime/Context';
import { EventBus, AgentEvents } from '../../utils/events';
import { DATAULT_AGENT_CONFIG } from '../../types/AgentConfig';
import { logger } from '../../utils/logger';

const log = logger.child('planner-factory');

export type PlannerType = 'llm' | 'custom' | 'scripted';

export class PlannerFactory {
  constructor(
    private context: Context,
    private eventBus: EventBus<AgentEvents>
  ) {}

  createPlanner(type: PlannerType, config?: any): IPlanner {
    log.info(`Creating planner of type: ${type}`);

    switch (type) {
      case 'llm':
        return new LLMPlanner(
          this.context,
          config || DATAULT_AGENT_CONFIG.planner,
          this.eventBus
        );
      
      case 'scripted':
        throw new Error('ScriptedPlanner not implemented yet');

      case 'custom':
        throw new Error('Custom planner creation requires specific implementation');

      default:
        throw new Error(`Unknown planner type: ${type}`);
    }
  }
}
