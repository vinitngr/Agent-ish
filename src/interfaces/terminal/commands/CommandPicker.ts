import { SlashCommand } from './types';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const WHITE = '\x1b[37m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BG_CYAN = '\x1b[46m';
const BLACK = '\x1b[30m';

export class CommandPicker {
  private commands: SlashCommand[];
  private filtered: SlashCommand[];
  private selectedIndex: number = 0;
  private query: string = '';
  private resolve?: (value: SlashCommand | null) => void;
  private renderedLines: number = 0;

  constructor(commands: SlashCommand[]) {
    this.commands = commands;
    this.filtered = [...commands];
  }

  pick(): Promise<SlashCommand | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.query = '';
      this.selectedIndex = 0;
      this.filtered = [...this.commands];

      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', this.onKeypress);

      this.render();
    });
  }

  private onKeypress = (data: Buffer): void => {
    const key = data.toString();

    if (key === '\x1b' || key === '\x03') {
      this.finish(null);
      return;
    }

    if (key === '\r' || key === '\n') {
      const selected = this.filtered[this.selectedIndex] || null;
      this.finish(selected);
      return;
    }

    if (key === '\x1b[A') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.render();
      return;
    }

    if (key === '\x1b[B') {
      this.selectedIndex = Math.min(this.filtered.length - 1, this.selectedIndex + 1);
      this.render();
      return;
    }

    if (key === '\x7f' || key === '\b') {
      this.query = this.query.slice(0, -1);
      this.filter();
      this.render();
      return;
    }

    if (key >= ' ' && key <= '~') {
      this.query += key;
      this.filter();
      this.render();
      return;
    }
  };

  private filter(): void {
    const q = this.query.toLowerCase();
    this.filtered = this.commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filtered.length - 1));
  }

  private render(): void {
    this.clearRendered();

    const lines: string[] = [];

    lines.push(`${DIM}  /${RESET}${WHITE}${this.query}${RESET}${DIM}▏${RESET}`);
    lines.push(`${DIM}  ${'─'.repeat(40)}${RESET}`);

    if (this.filtered.length === 0) {
      lines.push(`${GRAY}  No matching commands${RESET}`);
    } else {
      for (let i = 0; i < this.filtered.length; i++) {
        const cmd = this.filtered[i];
        if (i === this.selectedIndex) {
          lines.push(`${BG_CYAN}${BLACK}${BOLD}  ▸ /${cmd.name}${RESET}${BG_CYAN}${BLACK} — ${cmd.description} ${RESET}`);
        } else {
          lines.push(`${GRAY}    /${cmd.name}${DIM} — ${cmd.description}${RESET}`);
        }
      }
    }

    lines.push(`${DIM}  ↑↓ navigate · enter select · esc cancel${RESET}`);

    for (const line of lines) {
      process.stdout.write(line + '\n');
    }

    this.renderedLines = lines.length;
  }

  private clearRendered(): void {
    if (this.renderedLines > 0) {
      process.stdout.write(`\x1b[${this.renderedLines}A`);
      for (let i = 0; i < this.renderedLines; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      process.stdout.write(`\x1b[${this.renderedLines}A`);
    }
  }

  private finish(result: SlashCommand | null): void {
    process.stdin.removeListener('data', this.onKeypress);
    process.stdin.setRawMode?.(false);

    this.clearRendered();

    if (result) {
      process.stdout.write(`${DIM}  /${result.name}${RESET}\n`);
    }

    this.resolve?.(result);
  }
}
