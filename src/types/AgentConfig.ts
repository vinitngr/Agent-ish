export interface PlannerConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  maxSteps: number;
  stopSequences?: string[];
  maxHistoryMessages?: number;
}

export interface ToolConfig {
  maxRetries: number;
  timeout: number; 
  retryDelay: number;
  circuitBreakerThreshold: number; 
  circuitBreakerResetTime: number; 
}

export interface ControllerConfig {
  mode: 'auto' | 'manual'; 
  maxConsecutiveErrors: number;
}

export interface AgentConfig {
  name: string;
  version: string;
  description: string;
  monitoring?: MonitoringConfig;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
}
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
}

export interface MonitoringConfig {
  skills?: boolean;
  config?: boolean;
  plugins?: boolean;
}

export interface AdvancedAgentConfig {
  planner: PlannerConfig;
  tools: ToolConfig;
  controller: ControllerConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
}

export const DATAULT_AGENT_CONFIG: AdvancedAgentConfig = {
  planner: {
    model: 'gpt-4',
    maxSteps: 10,
    temperature: 0,
  },
  tools: {
    maxRetries: 2,
    timeout: 10000,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 60000,
  },
  controller: {
    mode: 'auto',
    maxConsecutiveErrors: 3,
  },
  logging: {
    level: 'info',
    format: 'pretty',
  },
  monitoring: {
    skills: true,
    config: true,
    plugins: false
  }
};
