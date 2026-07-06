type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';


export type LogHandler = (level: LogLevel, message: string, ...args: unknown[]) => void;

class Logger {
  private level: LogLevel = 'info';
  private namespace: string;
  private handler: LogHandler;

  constructor(namespace: string = 'agent') {
    this.namespace = namespace;
    this.handler = (level, msg, ...args) => {
        const timestamp = new Date().toISOString();
        const color = COLORS[level];
        const prefix = `${DIM}${timestamp}${RESET} ${color}[${level.toUpperCase()}]${RESET} ${DIM}(${this.namespace})${RESET}`;
        if (args.length > 0) {
            console.log(`${prefix} ${msg}`, ...args);
        } else {
            console.log(`${prefix} ${msg}`);
        }
    };
  }

  setHandler(handler: LogHandler): void {
      this.handler = handler;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  child(namespace: string): Logger {
    const child = new Logger(`${this.namespace}:${namespace}`);
    child.level = this.level;
    child.handler = this.handler;
    return child;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;
    this.handler(level, message, ...args);
  }
}

export const logger = new Logger('agent');
export { Logger, LogLevel };
