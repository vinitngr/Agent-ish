import { Agent } from '../core/Agent';
import { IPlugin } from '../core/types/Plugin';
import { logger } from '../core/utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const log = logger.child('shell');

export interface ShellPluginOptions {
  allowedInterfaces?: string[];
  blockOnUnknownInterface?: boolean;
}

export class ShellCommandPlugin implements IPlugin {
  name = 'shell-commands';
  version = '1.0.0';
  private allowedInterfaces: string[];
  private blockOnUnknown: boolean;

  constructor(options: ShellPluginOptions = {}) {
    this.allowedInterfaces = options.allowedInterfaces || ['socket'];
    this.blockOnUnknown = options.blockOnUnknownInterface ?? true;
  }

  async register(agent: Agent): Promise<void> {
    agent.addInputInterceptor(async (input: string, options?: any) => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('!')) return null;

      const currentInterface = options?.interface;
      
      if (!this.allowedInterfaces.includes(currentInterface)) {
        log.warn(`Shell command blocked for interface: ${currentInterface || 'unknown'}`);
        return this.blockOnUnknown ? `Access denied: Shell commands are not allowed on this interface.` : null;
      }

      const command = trimmed.slice(1).trim();
      if (!command) return 'Error: No command provided after !';

      log.info(`Executing shell: ${command}`);
      
      try {
        const { stdout, stderr } = await execAsync(command);
        let response = stdout || '';
        if (stderr) response += `\n[STDERR]\n${stderr}`;
        return response || 'Command executed (no output).';
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`Shell execution error: ${msg}`);
        return `Shell Error: ${msg}`;
      }
    });
  }
}
