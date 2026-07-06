const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export async function streamText(text: string, delayMs: number = 25): Promise<void> {
  process.stdout.write(`${MAGENTA}${BOLD} tobi ${DIM}›${RESET} `);

  for (const char of text) {
    process.stdout.write(char);
    await sleep(delayMs);
  }

  process.stdout.write(`${RESET}\n`);
}

export async function streamLines(lines: string[], delayMs: number = 25): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      process.stdout.write(`${MAGENTA}${BOLD} tobi ${DIM}›${RESET} `);
    } else {
      process.stdout.write(`       `);
    }

    for (const char of lines[i]) {
      process.stdout.write(char);
      await sleep(delayMs);
    }

    process.stdout.write(`${RESET}\n`); 
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
