import { Server, Socket, createServer } from 'net';
import { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';

const log = logger.child('socket');

export class SocketInterface {
  private server: Server;
  private agent: Agent;
  private port: number = 3000;
  private clients: Set<Socket> = new Set();

  constructor(agent: Agent, port: number = 3000) {
    this.agent = agent;
    this.port = port;
    this.server = createServer((socket) => this.handleConnection(socket));
  }

  async start(): Promise<void> {
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
        const options: any = { 
          interface: 'socket', 
          sessionId: socketSessionId 
        };
        const result = await this.agent.execute(input, options);
        
        if (options.newSessionId) {
          socketSessionId = options.newSessionId;
          socket.write(`[SESSION] Switched to: ${socketSessionId}\n`);
          log.info(`Socket connection switched to session: ${socketSessionId}`);
        }

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
