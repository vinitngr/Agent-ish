import { Agent } from '../Agent';

export interface IPlugin {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  register(agent: Agent, options?: any): Promise<void>;
}
