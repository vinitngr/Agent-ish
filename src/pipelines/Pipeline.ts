import { IPipelineStep, PipelineContext, PipelineDefinition, PipelineResult, PipelineStepConfig } from '../types/Pipeline';
import { IContext } from '../types/Runtime';
import { logger } from '../utils/logger';

const log = logger.child('pipeline');

export class Pipeline {
  readonly name: string;
  readonly description: string;
  private steps: IPipelineStep[] = [];

  constructor(definition: PipelineDefinition) {
    this.name = definition.name;
    this.description = definition.description;
  }

  addStep(step: IPipelineStep): void {
    this.steps.push(step);
    log.debug(`Added step: ${step.name} to pipeline: ${this.name}`);
  }

  getSteps(): IPipelineStep[] {
    return [...this.steps];
  }

  async execute(
    context: IContext,
    input: Record<string, unknown> = {}
  ): Promise<PipelineResult> {
    const start = Date.now();
    const pipelineContext: PipelineContext = {
      input,
      output: {},
      stepResults: new Map(),
      metadata: {},
    };

    log.info(`Starting pipeline: ${this.name}`);

    try {
      let ctx = pipelineContext;

      for (const step of this.steps) {
        log.debug(`Executing step: ${step.name}`);
        ctx = await step.execute(context, ctx);
        ctx.stepResults.set(step.name, ctx.output);
      }

      const duration = Date.now() - start;
      log.info(`Pipeline ${this.name} completed in ${duration}ms`);

      return {
        success: true,
        output: ctx.output,
        stepResults: ctx.stepResults,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error(`Pipeline ${this.name} failed: ${errorMsg}`);

      return {
        success: false,
        output: {},
        stepResults: pipelineContext.stepResults,
        duration,
        error: errorMsg,
      };
    }
  }
}
