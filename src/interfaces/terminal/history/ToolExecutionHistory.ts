import { ToolResult } from '../../../core/types/Tool';

export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result: ToolResult;
  timestamp: number;
  duration: number;
}

export class ToolExecutionHistory {
  private history: ToolExecutionRecord[] = [];
  private readonly maxLimit: number;

  constructor(maxLimit: number = 50) {
    this.maxLimit = maxLimit;
  }

  add(record: ToolExecutionRecord): void {
    this.history.unshift(record);
    if (this.history.length > this.maxLimit) {
      this.history.pop();
    }
  }

  getAll(): ToolExecutionRecord[] {
    return [...this.history];
  }

  get(id: string): ToolExecutionRecord | undefined {
    return this.history.find((r) => r.id === id);
  }

  clear(): void {
    this.history = [];
  }
}
