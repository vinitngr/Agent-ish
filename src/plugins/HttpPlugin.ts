import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
import { HttpInterface } from '../interfaces/HttpInterface';

export class HttpPlugin implements IPlugin {
  name = 'http';
  version = '1.0.0';

  async register(agent: Agent): Promise<void> {
    const iface = new HttpInterface();
    agent.interfaces.register(iface);
  }
}
