export class ModelRoles {
  planner: string = 'gpt-4';
  reasoner: string = 'gpt-4';
  finalResponder: string = 'gpt-4';
  fallback: string = 'gpt-3.5-turbo';
}

export class DefaultModelParams {
  temperature: number = 0.2;
  maxTokens: number = 4096;
  topP: number = 1.0;
  stream: boolean = false;
}

export class ModelsConfig {
  roles = new ModelRoles();
  defaultParams = new DefaultModelParams();
}

export class SafetyLimits {
  maxIterations: number = 12;
  maxTotalTokens: number = 64000;
  maxRunTimeSeconds: number = 180;
  preventRecursiveLoops: boolean = true;
}

export class BudgetLimits {
  maxCostPerRequest: number = 0.15;
  monthlyLimitUsd: number = 500.0;
  stopOnBudgetExceeded: boolean = true;
}

export class LimitsConfig {
  safety = new SafetyLimits();
  budget = new BudgetLimits();
}

export class RetryConfig {
  maxRetries: number = 3;
  backoff: 'exponential' | 'linear' | 'none' = 'exponential';
  retryOn: number[] = [429, 500, 503];
  baseDelayMs: number = 1000;
}

export class ContextManagementConfig {
  strategy: 'sliding_window' | 'none' = 'sliding_window';
  keepSystemPrompt: boolean = true;
  summaryThreshold: number = 0.8;
}

export class ControllerConfig {
  retryLogic = new RetryConfig();
  contextManagement = new ContextManagementConfig();
}

export class ToolExecutionConfig {
  defaultTimeoutMs: number = 30000;
  maxRetries: number = 2;
  retryDelayMs: number = 500;
  parallelEnabled: boolean = true;
  maxParallel: number = 5;
}

export class ExecutionConfig {
  models = new ModelsConfig();
  limits = new LimitsConfig();
  controller = new ControllerConfig();
  toolExecution = new ToolExecutionConfig();
  extra: Record<string, any> = {};

  static default(): ExecutionConfig {
    return new ExecutionConfig();
  }
}
