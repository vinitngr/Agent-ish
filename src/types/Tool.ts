import { IContext } from './Runtime';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ITool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(context: IContext, args: Record<string, unknown>): Promise<ToolResult>;
}

export type ToolFactory = () => ITool | Promise<ITool>;
