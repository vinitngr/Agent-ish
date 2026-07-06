import { ToolExecutionHistory, ToolExecutionRecord } from '../../../agent/history/ToolExecutionHistory';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const WHITE = '\x1b[37m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BG_CYAN = '\x1b[46m';
const BLACK = '\x1b[30m';

export class ToolHistoryInspector {
  private history: ToolExecutionHistory;
  private records: ToolExecutionRecord[];
  private selectedIndex: number = 0;
  private renderedLines: number = 0;
  private resolve?: (value: void) => void;
  private showingDetails: boolean = false;

  constructor(history: ToolExecutionHistory) {
    this.history = history;
    this.records = history.getAll();
  }

  inspect(): Promise<void> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.selectedIndex = 0;
      this.records = this.history.getAll();

      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', this.onKeypress);

      this.render();
    });
  }

  private onKeypress = (data: Buffer): void => {
    const key = data.toString();

    // Esc or q to quit
    if (key === '\x1b' || key === 'q' || key === '\x03') {
      if (this.showingDetails) {
        this.showingDetails = false;
        this.render();
        return;
      }
      this.finish();
      return;
    }

    // Enter to toggle details
    if (key === '\r' || key === '\n') {
      if (this.records.length > 0) {
        this.showingDetails = !this.showingDetails;
        this.render();
      }
      return;
    }

    if (!this.showingDetails) {
      if (key === '\x1b[A') { // Up
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.render();
      } else if (key === '\x1b[B') { // Down
        this.selectedIndex = Math.min(this.records.length - 1, this.selectedIndex + 1);
        this.render();
      }
    }
  };

  private render(): void {
    this.clearRendered();

    const lines: string[] = [];

    if (this.showingDetails) {
      const record = this.records[this.selectedIndex];
      lines.push(`${BOLD}🔍 Tool Execution Details${RESET}`);
      lines.push(`${DIM}${'─'.repeat(50)}${RESET}`);
      lines.push(`${WHITE}ID:${RESET} ${GRAY}${record.id}${RESET}`);
      lines.push(`${WHITE}Tool:${RESET} ${CYAN}${record.toolName}${RESET}`);
      lines.push(`${WHITE}Time:${RESET} ${GRAY}${new Date(record.timestamp).toLocaleTimeString()}${RESET} (${record.duration}ms)`);
      lines.push('');
      lines.push(`${BOLD}Arguments:${RESET}`);
      lines.push(`${GRAY}${JSON.stringify(record.args, null, 2)}${RESET}`);
      lines.push('');
      lines.push(`${BOLD}Result:${RESET}`);
      const resultColor = record.result.success ? GREEN : RED;
      lines.push(`${resultColor}${JSON.stringify(record.result, null, 2)}${RESET}`);
      lines.push('');
      lines.push(`${DIM}Press Enter/Esc to go back${RESET}`);
    } else {
      lines.push(`${BOLD}📜 Recent Tool Executions${RESET}`);
      lines.push(`${DIM}${'─'.repeat(50)}${RESET}`);

      if (this.records.length === 0) {
        lines.push(`${GRAY}  No tools executed yet.${RESET}`);
      } else {
        const start = Math.max(0, this.selectedIndex - 5);
        const end = Math.min(this.records.length, start + 10);

        for (let i = start; i < end; i++) {
          const record = this.records[i];
          const statusIcon = record.result.success ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`;
          const time = new Date(record.timestamp).toLocaleTimeString();
          
          let prefix = '  ';
          let line = `${statusIcon} ${CYAN}${record.toolName}${RESET} ${DIM}${time}${RESET}`;

          if (i === this.selectedIndex) {
            prefix = `${BG_CYAN}${BLACK}▸ `;
            line = `${BG_CYAN}${BLACK}${record.toolName} (${record.duration}ms)${RESET}`;
          }

          lines.push(`${prefix}${line}`);
        }
      }
      lines.push(`${DIM}${'─'.repeat(50)}${RESET}`);
      lines.push(`${DIM}↑↓ navigate · Enter details · Esc quit${RESET}`);
    }

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

  private finish(): void {
    process.stdin.removeListener('data', this.onKeypress);
    process.stdin.setRawMode?.(false);
    this.clearRendered();
    this.resolve?.();
  }
}
