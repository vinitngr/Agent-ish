import { Orchestrator } from '../orchestrator/Orchestrator';

export abstract class BasePipeline {
  name: string = '';
  description: string = '';
  
  abstract execute(orchestrator: Orchestrator, input: string, options?: Record<string, any>): Promise<string>;
}
