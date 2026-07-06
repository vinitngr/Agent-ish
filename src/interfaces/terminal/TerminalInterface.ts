import { execSync } from 'child_process';
import { IContext } from '../../types/Runtime';
import { logger } from '../../utils/logger';
import { SlashCommand, CommandContext } from './commands/types';
import { defaultCommands } from './commands';
import { CommandPicker } from './commands/CommandPicker';
import { ConsentManager } from '../../agent/consent/ConsentManager';
import { ConsentBox } from './widgets/ConsentBox';
import { runTestDemo } from './demos/testDemo';
import { ToolExecutionHistory } from '../../agent/history/ToolExecutionHistory';
import { ToolHistoryInspector } from './widgets/ToolHistoryInspector';
import { ToolResult } from '../../types/Tool';
import * as fs from 'fs';
import * as path from 'path';
import { BaseInterface } from '@interfaces/base';

// const log = logger.child('terminal');

const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';
// const BG_TOBI = '\x1b[48;5;236m'; // Removed

const TOBI_ASCII = `
${CYAN}${BOLD}  ████████╗ ██████╗ ██████╗ ██╗
  ╚══██╔══╝██╔═══██╗██╔══██╗██║
     ██║   ██║   ██║██████╔╝██║
     ██║   ██║   ██║██╔══██╗██║
     ██║   ╚██████╔╝██████╔╝██║
     ╚═╝    ╚═════╝ ╚═════╝ ╚═╝${RESET}
`;

const DIVIDER = `${DIM}${'─'.repeat(50)}${RESET}`;

export class TerminalInterface extends BaseInterface {
  name = 'terminal';
  private running = false;
  private processing = false;
  private inputBuffer: string = '';
  private toolHistory: ToolExecutionHistory;
  private commands: Map<string, SlashCommand> = new Map();
  private cwd: string;
  constructor() {
    super();
    this.cwd = process.cwd();
    this.toolHistory = new ToolExecutionHistory();

    for (const cmd of defaultCommands) {
      this.commands.set(cmd.name, cmd);
    }
    
    // Register /tools command dynamically
    this.commands.set('tools', {
      name: 'tools',
      description: 'Inspect recent tool executions',
      execute: async () => {
        const inspector = new ToolHistoryInspector(this.toolHistory);
        await inspector.inspect();
        return '';
      }
    });
  }

  registerCommand(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  async start(context: IContext): Promise<void> {
    await super.start(context);
    this.running = true;

    // Register terminal-specific consent prompt
    this.context!.consentManager.setPrompt('terminal', async (request) => {
      const box = new ConsentBox(request);
      return box.prompt();
    });

    this.printBanner();
    
    // Redirect logs to file
    const logDir = path.join(this.cwd, 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const logFile = path.join(logDir, 'agent.log');
    
    logger.setHandler((level, msg, ...args) => {
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] [${level.toUpperCase()}] ${msg} ${args.length ? JSON.stringify(args) : ''}\n`;
        fs.appendFileSync(logFile, line);
    });

    this.log.info('Terminal interface started');

    if (this.context && this.context.eventBus) {
      this.context.eventBus.on('tool:executed', (name: string, args: Record<string, unknown>, result: ToolResult, duration: number) => {
        const id = Math.random().toString(36).slice(2, 9);
        this.toolHistory.add({
          id,
          toolName: name,
          args,
          result,
          timestamp: Date.now(),
          duration
        });

        if (this.context?.runtimeConfig.showToolResults === false) {
          return;
        }

        let outputStr = '';
        if (result.success) {
          const dataStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
          const singleLine = dataStr.replace(/\r?\n/g, ' ').trim();
          
          if (singleLine.length > 80) {
            outputStr = `${DIM}${GRAY}⚙ ${name} → ${singleLine.slice(0, 80)}...${RESET}`;
          } else {
            outputStr = `${DIM}${GRAY}⚙ ${name} → ${singleLine}${RESET}`;
          }
        } else {
          outputStr = `${DIM}${RED}✘ ${name} → ${result.error}${RESET}`;
        }
        
        // Move cursor to start of line, clear it, print output
        process.stdout.write(`\r\x1b[K${outputStr}\n`);

        if (!this.processing) {
          this.showPromptPrefix();
          process.stdout.write(this.inputBuffer);
        }
      });
    }

    this.prompt();
  }

  async stop(): Promise<void> {
    this.running = false;
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
    console.log('');
    console.log(`${DIM}  Session ended. Goodbye! 👋${RESET}\n`);
    this.log.info('Terminal interface stopped');
  }

  private printBanner(): void {
    console.clear();
    console.log(TOBI_ASCII);
    console.log(`${DIM}  Your modular AI agent framework${RESET}`);
    console.log(`${DIM}  Type ${WHITE}/${DIM} for commands · ${WHITE}!cmd${DIM} to run shell${RESET}`);
    console.log(`${DIVIDER}\n`);
  }
// ...
  private getCommandContext(): CommandContext {
    return {
      agentContext: this.context!,
      cwd: this.cwd,
      exit: () => {
        this.stop().then(() => process.exit(0));
      },
      clearScreen: () => {
        this.printBanner();
      },
    };
  }

  private showPromptPrefix(): void {
    process.stdout.write(`${GREEN}${BOLD}  you ${DIM}›${RESET} `);
  }

  private prompt(): void {
    if (!this.running) return;

    this.inputBuffer = '';
    this.showPromptPrefix();

    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once('data', (data) => this.onFirstChar(data));
  }

  private onFirstChar(data: Buffer): void {
    const char = data.toString();

    if (char === '\x03') {
      this.stop().then(() => process.exit(0));
      return;
    }

    if (char === '\r' || char === '\n') {
      process.stdout.write('\n');
      this.prompt();
      return;
    }

    // / as first char → open picker immediately
    if (char === '/') {
      process.stdout.write('\n');
      this.openPicker();
      return;
    }

    // ! as first char → switch to shell mode
    if (char === '!') {
      process.stdout.write('!');
      this.readRestOfLine((line) => {
        this.handleShellCommand(line.trim());
        this.prompt();
      });
      return;
    }

    process.stdout.write(char);
    this.readRestOfLine(async (fullInput) => {
      this.inputBuffer = '';
      fullInput = fullInput.trim();
      
      if (!fullInput) {
        this.prompt();
        return;
      }

      this.processing = true;

      if (fullInput.toLowerCase() === 'test' && this.context) {
        await runTestDemo(this.context.consentManager, this.context);
        this.processing = false;
        this.prompt();
        return;
      }

      try {
        const response = await this.handleInput(fullInput);
        console.log(`${DIM}──────${RESET}`);
        console.log(`${MAGENTA}${BOLD} tobi ${DIM}›${RESET} ${response}\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${YELLOW}  ⚠  ${msg}${RESET}\n`);
      }

      this.processing = false;
      this.prompt();
    }, char);
  }

  private readRestOfLine(callback: (line: string) => void, initialChar: string = ''): void {
    let buffer = initialChar;

    const onData = (data: Buffer): void => {
      const char = data.toString();

      // Ctrl+C
      if (char === '\x03') {
        process.stdin.removeListener('data', onData);
        this.stop().then(() => process.exit(0));
        return;
      }

      // Enter
      if (char === '\r' || char === '\n') {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode?.(false);
        process.stdout.write('\n');
        callback(buffer);
        return;
      }

      // Backspace
      if (char === '\x7f' || char === '\b') {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          process.stdout.write('\b \b');
        }
       
        return;
      }

      // Regular char
      if (char >= ' ' && char <= '~') {
        buffer += char;
        process.stdout.write(char);
      }
    };

    process.stdin.on('data', onData);
  }

  private async openPicker(): Promise<void> {
    const picker = new CommandPicker(Array.from(this.commands.values()));
    const selected = await picker.pick();

    if (selected) {
      if (selected.name === 'help') {
        this.openPicker();
        return;
      }

      try {
        const result = await selected.execute([], this.getCommandContext());
        if (result) {
          console.log(`${GRAY}  ${result}${RESET}\n`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${YELLOW}  ⚠  Command error: ${msg}${RESET}\n`);
      }
    }

    this.prompt();
  }

  private handleShellCommand(cmd: string): void {
    if (!cmd) {
      console.log(`${YELLOW}  ⚠  Usage: !<command>${RESET}\n`);
      return;
    }

    try {
      console.log(`${DIM}  $ ${cmd}${RESET}`);
      const output = execSync(cmd, {
        cwd: this.cwd,
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (output.trim()) {
        const lines = output.trim().split('\n');
        for (const line of lines) {
          console.log(`${GRAY}  ${line}${RESET}`);
        }
      }
      console.log('');
    } catch (err: any) {
      const stderr = err.stderr?.trim() || err.message;
      console.log(`${YELLOW}  ⚠  ${stderr}${RESET}\n`);
    }
  }
}
