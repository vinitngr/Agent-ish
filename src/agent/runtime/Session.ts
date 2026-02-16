import { ISession, SessionMessage } from '../../types/Runtime';

export class Session implements ISession {
  readonly id: string;
  readonly createdAt: Date;
  metadata: Record<string, unknown>;
  history: SessionMessage[];

  constructor(id?: string) {
    this.id = id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.createdAt = new Date();
    this.metadata = {};
    this.history = [];
  }

  addMessage(message: SessionMessage): void {
    this.history.push(message);
  }

  getHistory(): SessionMessage[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.metadata = {};
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      metadata: this.metadata,
      messageCount: this.history.length,
    };
  }
}
