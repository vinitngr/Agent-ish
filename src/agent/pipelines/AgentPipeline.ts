import { BasePipeline } from './BasePipeline';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { logger } from '../../utils/logger';

const log = logger.child('pipeline:agent');

export class AgentPipeline extends BasePipeline {
  name = 'agent';
  description = 'Standard autonomous agent pipeline with full tool execution and retry logic.';

  async execute(orchestrator: Orchestrator, input: string, options?: Record<string, any>): Promise<string> {
    log.info('Running via AgentPipeline (Full autonomy mode)');
    return orchestrator.handleInput(input, options);
  }
}
