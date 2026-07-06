import { IContext } from './Runtime';

export interface PipelineContext {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  stepResults: Map<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface IPipelineStep {
  name: string;
  description: string;
  execute(
    context: IContext,
    pipelineContext: PipelineContext
  ): Promise<PipelineContext>;
}

export interface PipelineDefinition {
  name: string;
  description: string;
  steps: PipelineStepConfig[];
}

export interface PipelineStepConfig {
  name: string;
  module: string;
  config?: Record<string, unknown>;
  retries?: number;
  timeout?: number;
  dependsOn?: string[];
}

export interface PipelineResult {
  success: boolean;
  output: Record<string, unknown>;
  stepResults: Map<string, unknown>;
  duration: number;
  error?: string;
}
