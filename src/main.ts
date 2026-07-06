import { Agent } from './agent/core/Agent';
import { CorePlugin } from './plugins/CorePlugin';
import { SocketPlugin } from './plugins/SocketPlugin';
import { McpPlugin } from './plugins/McpPlugin';
import { logger } from './utils/logger';
import { LLMPlugin } from './plugins/LLMPlugin';
import minimist from 'minimist';
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin';
import { ShellCommandPlugin } from './plugins/ShellCommandPlugin';
import { ChatPipeline } from './agent/pipelines/ChatPipeline';
import { AgentPipeline } from './agent/pipelines/AgentPipeline';
import * as path from 'path';

const log = logger.child('main');

function resolveConfigPaths(): string {
  return path.resolve(process.cwd(), 'config');
}

async function createAgent(configDir: string): Promise<Agent> {
  log.info(`Initializing Agent...`);
  const agent = new Agent(configDir);

  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  await agent.use(new McpPlugin());
  await agent.use(new SocketPlugin());
  await agent.use(new SlashCommandPlugin());
  await agent.use(new ShellCommandPlugin({ allowedInterfaces: ['socket', 'terminal'] }));
  
  await agent.loadPluginsFrom('./custom_plugins', { monitoring: true });
  
  return agent;
}

async function setupAgent(agent: Agent, defaultMode: string = 'default'): Promise<void> {
  await agent.init();

  // Example of registering an extension:
  // agent.registerExtension("credentials", new GatewayCredentialClient());

  agent.registerMode("chat", new ChatPipeline());
  agent.registerMode("agent", new AgentPipeline());
  
  agent.setDefaultMode(defaultMode);

  setupSecurity(agent);

  await agent.boot();

  agent.on('tool:call:start', (call: any) => {
    log.debug(`🎯 Executing tool: ${call.name}`);
  });

  const snapshot = agent.inspect();
  log.info(`Available Tools: ${snapshot.tools.join(', ')}`);
}

function setupSecurity(agent: Agent): void {
  agent.addMiddleware(async (call: any) => {
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

async function main(): Promise<void> {
  const configDir = resolveConfigPaths();
  const agent = await createAgent(configDir);
  
  await setupAgent(agent, 'default');
  
  setupShutdownHandlers(agent);

  if (!await handleCliExecution(agent)) {
    await agent.run();
  }
}

main().catch((err) => {
  log.error('Fatal error:', err);
  process.exit(1);
});