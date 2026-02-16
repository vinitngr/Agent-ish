import { Server, Socket, createServer } from 'net';
import { BaseInterface } from '../base/Interface';
import { Agent } from '../../agent/core/Agent';
import { IContext } from '../../types/Runtime';
import { logger } from '../../utils/logger';

const log = logger.child('socket');

export class SocketInterface extends BaseInterface {
  name = 'socket';
  isTrusted: boolean = false;
  private server: Server;
  private port: number = 3000;
  private clients: Set<Socket> = new Set();
  private context?: IContext;

  constructor(agent: Agent, port: number = 3000, options: { isTrusted?: boolean } = {}) {
    super();
    this.port = port;
    this.isTrusted = options.isTrusted || false;
    this.server = createServer((socket) => this.handleConnection(socket));
    
    agent.interfaces.register(this);
  }

  async start(context: IContext): Promise<void> {
    this.context = context;
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        log.info(`Socket Interface listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.clients.forEach(socket => socket.destroy());
      this.clients.clear();
      this.server.close(() => resolve());
    });
  }

  private handleConnection(socket: Socket) {
    log.info('New client connected');
    this.clients.add(socket);

    let socketSessionId: string | undefined;

    socket.write('Welcome to Agent-ish Daemon! Type your request.\n');

    socket.on('data', async (data) => {
      const input = data.toString().trim();
      if (!input) return;
      
      if (input === '/exit') {
        socket.end('Goodbye!\n');
        return;
      }

      try {
        log.info(`Received command: ${input}`);
        // BaseInterface provides handleInput which triggers the agent middleware chain
        const result = await this.handleInput(input);
        socket.write(result + '\n\n');
      } catch (error) {
        socket.write(`Error: ${(error as Error).message}\n`);
      }
    });

    socket.on('close', () => {
      log.info('Client disconnected');
      this.clients.delete(socket);
    });
    
    socket.on('error', (err: any) => {
      if (err.code === 'ECONNRESET') {
        log.info('Client connection reset');
      } else {
        log.error('Socket error:', err);
      }
    });
  }
}
