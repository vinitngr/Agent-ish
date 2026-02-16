import { Agent } from '../agent/core/Agent';

export interface IPlugin {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  register(agent: Agent): Promise<void>;
}
