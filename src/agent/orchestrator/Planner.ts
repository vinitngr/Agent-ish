import { Session } from '../runtime/Session';
import { ToolCall } from '../../types/Provider';

export type PlanResult =
  | { kind: 'action'; toolCalls: ToolCall[] }
  | { kind: 'response'; message: string }
  | { kind: 'error'; error: string };

export interface IPlanner {
  plan(session: Session): Promise<PlanResult>;
  onToolResults?(session: Session): Promise<void>;
}
