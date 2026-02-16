import { ConsentRequest, ConsentDecision } from '../../../types/Consent';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const WHITE = '\x1b[37m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BG_YELLOW = '\x1b[43m';
const BLACK = '\x1b[30m';

interface ConsentOption {
  label: string;
  value: ConsentDecision;
  color: string;
  icon: string;
}

const OPTIONS: ConsentOption[] = [
  { label: 'Allow', value: ConsentDecision.ALLOW, color: GREEN, icon: '✓' },
  { label: 'Allow for session', value: ConsentDecision.ALLOW_SESSION, color: CYAN, icon: '✓✓' },
  { label: 'Deny', value: ConsentDecision.DENY, color: RED, icon: '✗' },
];

export class ConsentBox {
  private request: ConsentRequest;
  private selectedIndex: number = 0;
  private renderedLines: number = 0;
  private resolve?: (value: ConsentDecision) => void;

  constructor(request: ConsentRequest) {
    this.request = request;
  }

  prompt(): Promise<ConsentDecision> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.selectedIndex = 0;

      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', this.onKeypress);

      this.render();
    });
  }

  private onKeypress = (data: Buffer): void => {
    const key = data.toString();

    if (key === '\x03') {
      this.finish(ConsentDecision.DENY);
      return;
    }

    if (key === '\r' || key === '\n') {
      this.finish(OPTIONS[this.selectedIndex].value);
      return;
    }

    if (key === '\x1b[A') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.render();
      return;
    }

    if (key === '\x1b[B') {
      this.selectedIndex = Math.min(OPTIONS.length - 1, this.selectedIndex + 1);
      this.render();
      return;
    }
  };

  private render(): void {
    this.clearRendered();

    const lines: string[] = [];
    lines.push(`${BG_YELLOW}${BLACK}${BOLD}  🔒 TOOL CONSENT REQUIRED ${RESET}`);
    lines.push(`${DIM}  ${'─'.repeat(40)}${RESET}`);
    lines.push(`${WHITE}  Tool:${RESET} ${YELLOW}${BOLD}${this.request.toolName}${RESET}`);
    lines.push(`${WHITE}  Action:${RESET} ${DIM}${this.request.description}${RESET}`);

    const argStr = JSON.stringify(this.request.args, null, 0);
    if (argStr !== '{}') {
      lines.push(`${WHITE}  Args:${RESET} ${GRAY}${argStr}${RESET}`);
    }

    lines.push(`${DIM}  ${'─'.repeat(40)}${RESET}`);

    for (let i = 0; i < OPTIONS.length; i++) {
      const opt = OPTIONS[i];
      if (i === this.selectedIndex) {
        lines.push(`${opt.color}${BOLD}  ▸ ${opt.icon} ${opt.label}${RESET}`);
      } else {
        lines.push(`${GRAY}    ${opt.icon} ${opt.label}${RESET}`);
      }
    }

    lines.push(`${DIM}  ↑↓ navigate · enter select${RESET}`);

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

  private finish(decision: ConsentDecision): void {
    process.stdin.removeListener('data', this.onKeypress);
    process.stdin.setRawMode?.(false);

    this.clearRendered();

    const opt = OPTIONS.find((o) => o.value === decision)!;
    process.stdout.write(`${opt.color}  ${opt.icon} ${opt.label}: ${YELLOW}${this.request.toolName}${RESET}\n`);

    this.resolve?.(decision);
  }
}
