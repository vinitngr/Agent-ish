import { ConsentDecision, ConsentRequest, ConsentPrompt } from '../../types/Consent';
import { logger } from '../../utils/logger';

const log = logger.child('consent');

export class ConsentManager {
  private sessionAllowed: Set<string> = new Set();
  private promptFn?: ConsentPrompt;

  setPrompt(fn: ConsentPrompt): void {
    this.promptFn = fn;
  }

  async check(request: ConsentRequest): Promise<ConsentDecision> {
    if (this.sessionAllowed.has(request.toolName)) {
      log.debug(`Tool "${request.toolName}" already allowed for session`);
      return ConsentDecision.ALLOW;
    }

    if (!this.promptFn) {
      log.warn('No consent prompt registered, auto-allowing');
      return ConsentDecision.ALLOW;
    }

    const decision = await this.promptFn(request);

    if (decision === ConsentDecision.ALLOW_SESSION) {
      this.sessionAllowed.add(request.toolName);
      log.info(`Tool "${request.toolName}" allowed for session`);
    }

    if (decision === ConsentDecision.DENY) {
      log.info(`Tool "${request.toolName}" denied by user`);
    }

    return decision;
  }

  isSessionAllowed(toolName: string): boolean {
    return this.sessionAllowed.has(toolName);
  }

  grantSession(toolName: string): void {
    this.sessionAllowed.add(toolName);
    log.info(`Tool "${toolName}" manually allowed for session`);
  }

  listAllowed(): string[] {
    return Array.from(this.sessionAllowed);
  }

  revokeSession(toolName: string): void {
    this.sessionAllowed.delete(toolName);
  }

  clearSession(): void {
    this.sessionAllowed.clear();
  }
}
