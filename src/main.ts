import { Agent } from './agent/core/Agent';
import { CorePlugin } from './plugins/CorePlugin';
import { TerminalPlugin } from './plugins/TerminalPlugin';
import { McpPlugin } from './plugins/McpPlugin';
import { logger } from './utils/logger';

import { LLMPlugin } from './plugins/LLMPlugin';
import { TerminalInterface } from '@interfaces/terminal/TerminalInterface';

const log = logger.child('main');

async function main(): Promise<void> {
  const agent = new Agent('./config');

  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());

  await agent.use(new McpPlugin());
  await agent.use(new TerminalPlugin());
  // await agent.use(new HttpPlugin());
  // await agent.loadPluginsFrom('./plugins');
  
  await agent.init();
  await agent.boot();

  process.on('SIGINT', async () => {
    log.info('Received SIGINT');
    await agent.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log.info('Received SIGTERM');
    await agent.shutdown();
    process.exit(0);
  });

  await agent.run();
}

main().catch((err) => {
  log.error('Fatal error:', err);
  process.exit(1);
});