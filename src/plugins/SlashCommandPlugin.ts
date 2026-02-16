import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
import { logger } from '../utils/logger';

const log = logger.child('slash');

type CommandHandler = (args: string[], context: { agent: Agent, options?: any }) => Promise<string | void> | string | void;

export class SlashCommandPlugin implements IPlugin {
  name = 'slash-commands';
  version = '1.0.0';
  private commands: Map<string, CommandHandler> = new Map();

  async register(agent: Agent): Promise<void> {
    agent.addInputInterceptor(async (input: string, options?: any) => {
        if (!input.trim().startsWith('/')) return null;

        const [cmdName, ...args] = input.trim().slice(1).split(' ');
        
        if (this.commands.has(cmdName)) {
           const handler = this.commands.get(cmdName)!;
           try {
             const result = await handler(args, { agent, options });
             return typeof result === 'string' ? result : `Command /${cmdName} executed.`;
           } catch (err) {
             const msg = err instanceof Error ? err.message : String(err);
             return `Error: ${msg}`;
           }
        }
        
        return null;
    });

    this.registerCommands();
  }

  listCommands(): string[] {
    return Array.from(this.commands.keys());
  }
  
  private registerCommands() {
    this.addCommand('help', async () => {
      const cmds = this.listCommands().sort().map(c => `/${c}`).join(', ');
      return `Available commands: ${cmds}`;
    });

    this.addCommand('reset', async (_args, { agent, options }) => {
      const orchestrator = (agent as any).orchestrator;
      if (orchestrator) {
          const sessionId = options?.sessionId || (agent as any).context.sessionId;
          const sessions = (orchestrator as any).sessions;
          if (sessions && sessions.has(sessionId)) {
              const session = sessions.get(sessionId);
              const currentModel = session.metadata.model;
              session.clear();
              if (currentModel) session.metadata.model = currentModel;
              return 'Session history cleared.';
          }
      }
      return 'Session cleared.';
    });

    this.addCommand('new', async (_args, { options }) => {
        const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        if (options) {
            options.newSessionId = newId;
        }
        return `New session created: ${newId}`;
    });

    this.addCommand('sessions', async (_args, { agent }) => {
        const orchestrator = (agent as any).orchestrator;
        if (orchestrator && typeof (orchestrator as any).listSessions === 'function') {
            const sessions = await orchestrator.listSessions();
            return `Active sessions:\n${sessions.map((id: string) => `- ${id}`).join('\n')}`;
        }
        return 'Could not list sessions.';
    });

    this.addCommand('load', async (args, { options }) => {
        if (args.length === 0) return 'Usage: /load <session_id>';
        const targetId = args[0];
        if (options) {
            options.newSessionId = targetId;
        }
        return `Switched to session: ${targetId}`;
    });

    this.addCommand('model', async (args, { agent }) => {
      if (args.length === 0) return 'Usage: /model <provider:model>';
      const modelId = args[0];
      
      const orchestrator = (agent as any).orchestrator;
      if (orchestrator) {
          const sessionId = (agent as any).context.sessionId;
          const sessions = (orchestrator as any).sessions;
          if (sessions && sessions.has(sessionId)) {
             const session = sessions.get(sessionId);
             session.metadata.model = modelId;
             return `Model switched to: ${modelId}`;
          }
      }
      return `Model set to ${modelId}`;
    });

    this.addCommand('consent', async (_args, { agent }) => {
        const allowed = agent.consentManager.listAllowed();
        if (allowed.length === 0) return 'No tools currently allowed for this session.';
        return `Allowed tools (this session):\n${allowed.map(t => `- ${t}`).join('\n')}`;
    });

    this.addCommand('allow', async (args, { agent }) => {
        if (args.length === 0) return 'Usage: /allow <tool_name>';
        const toolName = args[0];
        agent.consentManager.grantSession(toolName);
        return `✅ Tool "${toolName}" is now allowed for this session.`;
    });

    this.addCommand('deny', async (args, { agent }) => {
        if (args.length === 0) return 'Usage: /deny <tool_name>';
        const toolName = args[0];
        agent.consentManager.revokeSession(toolName);
        return `❌ Tool "${toolName}" is now blocked.`;
    });

    this.addCommand('exit', async () => {
        return 'Goodbye!';
    });
  }

  addCommand(name: string, handler: CommandHandler) {
      this.commands.set(name, handler);
  }
}
