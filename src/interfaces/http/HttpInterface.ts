import * as http from 'http';
import { BaseInterface } from '../../interfaces/base/Interface';
import { IContext } from '../../types/Runtime';
import { logger } from '../../utils/logger';

export class HttpInterface extends BaseInterface {
  name = 'http-raw';
  private server: http.Server | null = null;
  private port = 3000;

  async start(context: IContext): Promise<void> {
    await super.start(context);

    this.server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const { input } = JSON.parse(body);
            
            // handleInput now emits interface:input and interface:output events
            const result = await this.handleInput(input);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result }));
          } catch (err: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    return new Promise((resolve) => {
      this.server?.listen(this.port, () => {
        this.log.info(`HTTP Interface listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }
}
