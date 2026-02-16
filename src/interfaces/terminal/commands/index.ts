import { SlashCommand, CommandContext } from './types';

export const exitCommand: SlashCommand = {
  name: 'exit',
  description: 'Exit TOBI',
  async execute(_args, ctx) {
    ctx.exit();
    return null;
  },
};

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the terminal screen',
  async execute(_args, ctx) {
    ctx.clearScreen();
    return null;
  },
};

export const helpCommand: SlashCommand = {
  name: 'help',
  description: 'Show available commands',
  async execute(_args, _ctx) {
    return null;
  },
};

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Select or show the active LLM model',
  async execute(args, ctx) {
    if (args.length === 0) {
      const llm = ctx.agentContext.get<string>('activeModel');
      return `Active model: ${llm || 'none configured'}`;
    }

    const modelName = args[0];
    ctx.agentContext.set('activeModel', modelName);
    return `Model set to: ${modelName}`;
  },
};

export const defaultCommands: SlashCommand[] = [
  exitCommand,
  clearCommand,
  helpCommand,
  modelCommand,
];
