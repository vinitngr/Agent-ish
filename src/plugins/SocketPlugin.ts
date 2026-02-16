import { IPlugin } from '../types/Plugin';
import { Agent } from '../agent/core/Agent';
import { SocketInterface } from '../interfaces/socket/SocketInterface';

export class SocketPlugin implements IPlugin {
  name = 'socket-interface';
  version = '1.0.0';
  private interface?: SocketInterface;

  async register(agent: Agent, options?: any): Promise<void> {
    const port = options?.port || 3000;
    this.interface = new SocketInterface(agent, port);
    await this.interface.start();
  }

  async shutdown(): Promise<void> {
    if (this.interface) {
      await this.interface.stop();
    }
  }
}
