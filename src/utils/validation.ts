import { z } from 'zod';

export const agentConfigSchema = z.object({
  agent: z.object({
    name: z.string(),
    version: z.string(),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    directory: z.string(),
  }),
  modules: z.object({
    tools: z.array(z.string()),
    skills: z.array(z.string()),
    interfaces: z.array(z.string()),
  }),
  monitoring: z.object({
    skills: z.boolean().optional(),
    config: z.boolean().optional(),
    plugins: z.boolean().optional(),
  }).optional(),
});

export const runtimeConfigSchema = z.object({
  maxConcurrency: z.number().min(1),
  timeout: z.number().min(0),
  retryAttempts: z.number().min(0),
  lazyLoad: z.boolean(),
  storage: z.object({
    memory: z.string(),
    logs: z.string(),
    cache: z.string(),
  }),
  showToolResults: z.boolean().default(true),
});

export const providersConfigSchema = z.any();

export const mcpConfigSchema = z.object({
  servers: z.record(z.object({
    url: z.string().url(),
    enabled: z.boolean(),
    headers: z.record(z.string()).optional(),
  })),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
