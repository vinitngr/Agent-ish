import { Agent } from './agent/core/Agent';
import { CorePlugin } from './plugins/CorePlugin';
import { TerminalPlugin } from './plugins/TerminalPlugin';
import { SocketPlugin } from './plugins/SocketPlugin';
import { McpPlugin } from './plugins/McpPlugin';
import { logger } from './utils/logger';
import { LLMPlugin } from './plugins/LLMPlugin';
import minimist from 'minimist';

const log = logger.child('main');
async function main(): Promise<void> {
  const agent = new Agent('./config');

  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.use(new McpPlugin());
  // await agent.use(new TerminalPlugin());
  await agent.use(new SocketPlugin());
  
  await agent.loadPluginsFrom('./custom_plugins', { monitoring: true });
  
  await agent.init();
  await agent.boot();

  setupObservability(agent);
  setupSecurity(agent);
  setupShutdownHandlers(agent);

  if (!await handleCliExecution(agent)) {
    await agent.run();
  }
}

function setupObservability(agent: Agent): void {
  agent.on('tool:call:start', (call) => {
    log.info(`🎯 Executing tool: ${call.name}`);
  });

  const snapshot = agent.inspect();
  log.info(`Available Tools: ${snapshot.tools.join(', ')}`);
}

function setupSecurity(agent: Agent): void {
  agent.addMiddleware(async (call) => {
    if (call.name === 'delete_file') {
      log.warn(`⚠️ Blocked restricted tool: ${call.name}`);
      return false;
    }
    return true;
  });
}

async function handleCliExecution(agent: Agent): Promise<boolean> {
  const args = minimist(process.argv.slice(2));

  if (args.execute) {
    const prompt = typeof args.execute === 'string' ? args.execute : args._.join(' ');
    
    if (!prompt) {
      console.error('Error: Please provide a prompt after --execute');
      process.exit(1);
    }

    const options = {
      model: args.model
    };

    try {
      const result = await agent.execute(prompt, options);
      console.log(result);
      process.exit(0);
    } catch (error) {
      console.error('Execution failed:', error);
      process.exit(1);
    }
    return true;
  }
  return false;
}

function setupShutdownHandlers(agent: Agent): void {
  const handleShutdown = async (signal: string) => {
    log.info(`Received ${signal}`);
    await agent.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

main().catch((err) => {
  log.error('Fatal error:', err);
  process.exit(1);
});