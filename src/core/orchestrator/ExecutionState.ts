import { SessionMessage } from '../../types/Runtime';
import { Session } from '../../agent/runtime/Session';

export class ExecutionState {
  id: string = '';
  sessionId: string = '';
  
  session: Session | null = null;
  
  iteration: number = 0;
  recentToolCalls: string[] = [];
  pendingPlan: Record<string, any> | null = null;
  
  events: Record<string, any>[] = [];
  sources: Record<string, any>[] = [];
  
  options: Record<string, any> = {};

  get isPaused(): boolean {
    return this.pendingPlan !== null;
  }

  serialize(): string {
    return JSON.stringify(this);
  }

  static deserialize(raw: string): ExecutionState {
    const data = JSON.parse(raw);
    const state = new ExecutionState();
    Object.assign(state, data);
    return state;
  }
}
