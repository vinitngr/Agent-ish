import { ModelConfig } from './types';

export const GEMINI_MODELS: ModelConfig[] = [
  { id: 'gemini-3-pro', providerId: 'gemini', contextWindow: 1000000, description: 'Gemini 3 Pro' },
  { id: 'gemini-3-flash', providerId: 'gemini', contextWindow: 1000000, description: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-pro', providerId: 'gemini', contextWindow: 1000000, description: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', providerId: 'gemini', contextWindow: 1000000, description: 'Gemini 2.5 Flash' },
];

export const OPENAI_MODELS: ModelConfig[] = [
  { id: 'gpt-5', providerId: 'openai', contextWindow: 256000, description: 'GPT-5' },
  { id: 'gpt-5-mini', providerId: 'openai', contextWindow: 128000, description: 'GPT-5 Mini' },
  { id: 'o3', providerId: 'openai', contextWindow: 200000, description: 'OpenAI o3 Reasoning' },
  { id: 'o4-mini', providerId: 'openai', contextWindow: 128000, description: 'OpenAI o4 Mini' },
];

export const ALL_SUPPORTED_MODELS: ModelConfig[] = [
  ...GEMINI_MODELS,
  ...OPENAI_MODELS,
];