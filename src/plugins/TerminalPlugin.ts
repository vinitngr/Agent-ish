import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
import { TerminalInterface } from '../interfaces/terminal/TerminalInterface';

export class TerminalPlugin implements IPlugin {
  name = 'terminal';
  version = '1.0.0';

  async register(agent: Agent): Promise<void> {
    const iface = new TerminalInterface();
    agent.interfaces.register(iface);
  }
}
