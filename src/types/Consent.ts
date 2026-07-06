export enum ConsentDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  ALLOW_SESSION = 'allow_session',
}

export interface ConsentRequest {
  toolName: string;
  args: Record<string, unknown>;
  description: string;
}

export interface ConsentPrompt {
  (request: ConsentRequest): Promise<ConsentDecision>;
}