import { LifecycleState, LifecycleHook } from '../../types/Runtime';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';

const log = logger.child('lifecycle');

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.CREATED]: [LifecycleState.INITIALIZING],
  [LifecycleState.INITIALIZING]: [LifecycleState.READY, LifecycleState.STOPPED],
  [LifecycleState.READY]: [LifecycleState.RUNNING, LifecycleState.SHUTTING_DOWN],
  [LifecycleState.RUNNING]: [LifecycleState.SHUTTING_DOWN],
  [LifecycleState.SHUTTING_DOWN]: [LifecycleState.STOPPED],
  [LifecycleState.STOPPED]: [],
};

export class Lifecycle {
  private state: LifecycleState = LifecycleState.CREATED;
  private hooks: Map<LifecycleState, LifecycleHook[]> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  getState(): LifecycleState {
    return this.state;
  }

  onState(state: LifecycleState, hook: LifecycleHook): void {
    const hooks = this.hooks.get(state) || [];
    hooks.push(hook);
    this.hooks.set(state, hooks);
  }

  async transitionTo(target: LifecycleState): Promise<void> {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(target)) {
      throw new Error(
        `Invalid lifecycle transition: ${this.state} → ${target}`
      );
    }

    const previous = this.state;
    this.state = target;
    log.info(`${previous} → ${target}`);
    this.eventBus.emit('lifecycle:change', target, previous);

    const hooks = this.hooks.get(target) || [];
    for (const hook of hooks) {
      await hook(target);
    }
  }

  isRunning(): boolean {
    return this.state === LifecycleState.RUNNING;
  }

  isStopped(): boolean {
    return this.state === LifecycleState.STOPPED;
  }
}
