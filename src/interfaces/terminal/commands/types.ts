import { IContext } from '../../../types/Runtime';

export interface SlashCommand {
  name: string;
  description: string;
  execute(args: string[], context: CommandContext): Promise<string | null>;
}

export interface CommandContext {
  agentContext: IContext;
  cwd: string;
  exit: () => void;
  clearScreen: () => void;
}
