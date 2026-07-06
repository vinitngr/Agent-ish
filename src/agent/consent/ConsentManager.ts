import { ConsentDecision, ConsentRequest, ConsentPrompt } from '../../types/Consent';
import { logger } from '../../utils/logger';

const log = logger.child('consent');

export class ConsentManager {
  private sessionAllowed: Set<string> = new Set();
  private prompts: Map<string, ConsentPrompt> = new Map();

  setPrompt(interfaceName: string, fn: ConsentPrompt): void {
    this.prompts.set(interfaceName, fn);
    log.info(`Registered consent prompt for interface: ${interfaceName}`);
  }

  async check(request: ConsentRequest & { metadata?: Record<string, any> }): Promise<ConsentDecision> {
    // 1. Check if already allowed for session
    const isAllowed = Array.from(this.sessionAllowed).some(pattern => {
      if (pattern === '*') return true;
      if (request.toolName === pattern) return true;
      if (request.toolName.startsWith(pattern + '.')) return true;
      return false;
    });

    if (isAllowed) {
      log.debug(`Tool "${request.toolName}" allowed by pattern match`);
      return ConsentDecision.ALLOW;
    }

    // 2. Identify the interface from metadata
    const iface = request.metadata?.interface as string;
    const promptFn = iface ? this.prompts.get(iface) : undefined;

    if (!promptFn) {
      log.warn(`No consent prompt registered for interface "${iface || 'unknown'}", denying execution for security`);
      return ConsentDecision.DENY;
    }

    // 3. Prompt the user
    const decision = await promptFn(request);

    if (decision === ConsentDecision.ALLOW_SESSION) {
      this.sessionAllowed.add(request.toolName);
      log.info(`Tool "${request.toolName}" allowed for session (Interface: ${iface})`);
    }

    if (decision === ConsentDecision.DENY) {
      log.info(`Tool "${request.toolName}" denied by user (Interface: ${iface})`);
    }

    return decision;
  }

  isSessionAllowed(toolName: string): boolean {
    return Array.from(this.sessionAllowed).some(pattern => {
      if (pattern === '*') return true;
      if (toolName === pattern) return true;
      return toolName.startsWith(pattern + '.');
    });
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
