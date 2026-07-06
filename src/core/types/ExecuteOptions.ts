export interface AgentExecuteOptions {
  // 1. Session & Memory
  sessionId?: string;
  historyLimit?: number;
  
  // 2. AI Model Overrides
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  
  // 3. Prompting
  systemContext?: string;
  
  // 4. Tool Management
  allowedTools?: string[];
  disabledTools?: string[];
  maxToolResponseLength?: number;
  
  // 5. Safety & Budgets (The Orchestrator limits)
  maxIterations?: number;
  timeoutSeconds?: number;
  maxTokenBudget?: number;
  maxRetries?: number;
  
  // 6. UI Streaming
  onStep?: (stepInfo: { type: string, message?: string, tool?: string, result?: any }) => void;
  onStream?: (chunk: string) => void;
  
  // Dynamic extra options
  [key: string]: any;
}
