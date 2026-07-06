import { PipelineDefinition, PipelineResult } from '../types/Pipeline';
import { IContext } from '../types/Runtime';
import { EventBus, AgentEvents } from '../utils/events';
import { Pipeline } from './Pipeline';
import { logger } from '../utils/logger';

const log = logger.child('pipeline-runner');

export class PipelineRunner {
  private pipelines: Map<string, Pipeline> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  register(pipeline: Pipeline): void {
    this.pipelines.set(pipeline.name, pipeline);
    log.info(`Registered pipeline: ${pipeline.name}`);
  }

  async run(
    name: string,
    context: IContext,
    input: Record<string, unknown> = {}
  ): Promise<PipelineResult> {
    const pipeline = this.pipelines.get(name);

    if (!pipeline) {
      throw new Error(`Pipeline not found: ${name}`);
    }

    this.eventBus.emit('pipeline:start', name);

    try {
      const result = await pipeline.execute(context, input);
      this.eventBus.emit('pipeline:complete', name, result.duration);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.eventBus.emit('pipeline:error', name, error);
      throw error;
    }
  }

  list(): string[] {
    return Array.from(this.pipelines.keys());
  }

  get(name: string): Pipeline | undefined {
    return this.pipelines.get(name);
  }
}
