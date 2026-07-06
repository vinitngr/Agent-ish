import { Agent } from '../core/Agent';
import { IPlugin } from '../core/types/Plugin';
import { TerminalInterface } from '../interfaces/terminal/TerminalInterface';

export class TerminalPlugin implements IPlugin {
  name = 'terminal';
  version = '1.0.0';

  async register(agent: Agent, options?: any): Promise<void> {
    const iface = new TerminalInterface();
    agent.interfaces.register(iface);
  }
}
