import { execSync } from 'child_process';
import { ConsentManager } from '../../../agent/consent/ConsentManager';
import { ConsentDecision } from '../../../types/Consent';
import { ConsentBox } from '../widgets/ConsentBox';
import { streamText, streamLines } from '../widgets/StreamText';
import { IContext } from '../../../types/Runtime';
import { AgentEvents } from '../../../utils/events';

const GRAY = '\x1b[90m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

export async function runTestDemo(consentManager: ConsentManager, context?: IContext): Promise<void> {



  console.log(`${DIM}──────${RESET}`);
  await streamText('Sure! Let me check your current working directory...');

  await sleep(100);

  const decision = await consentManager.check({
    toolName: 'system.pwd',
    args: {},
    description: 'Read the current working directory path',
  });

  if (decision === ConsentDecision.DENY) {
    console.log(`${DIM}──────${RESET}`);
    await streamText('Understood — I won\'t access the filesystem. Is there anything else I can help with?');

    return;
  }

  let cwd: string;
  try {
    cwd = execSync('pwd', { encoding: 'utf-8' }).trim();
  } catch {
    cwd = process.cwd();
  }



  if (context && context.eventBus) {
    context.eventBus.emit('tool:executed', 'system.pwd', {}, { success: true, data: cwd }, 45);
  }



  await sleep(200);

  await sleep(200);

  console.log(`${DIM}──────${RESET}`);
  await streamLines([
    `Got it! You're currently working in:`,
    `📂 ${cwd}`,
    ``,
    `This looks like a TOBI agent project. I can see the source`,
    `files are organized under src/ with the standard module layout.`,
    `Want me to explore any of these directories?`,
  ]);


}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
