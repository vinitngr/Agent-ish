import { IInterface } from '../../types/Runtime';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';

const log = logger.child('registry:interface');

export class InterfaceRegistry {
  private interfaces: Map<string, IInterface> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  register(iface: IInterface): void {
    if (this.interfaces.has(iface.name)) {
      log.warn(`Overwriting interface: ${iface.name}`);
    }
    this.interfaces.set(iface.name, iface);
    this.eventBus.emit('interface:registered', iface.name);
    log.info(`Registered interface: ${iface.name}`);
  }

  get(name: string): IInterface | undefined {
    return this.interfaces.get(name);
  }

  has(name: string): boolean {
    return this.interfaces.has(name);
  }

  list(): string[] {
    return Array.from(this.interfaces.keys());
  }

  getAll(): IInterface[] {
    return Array.from(this.interfaces.values());
  }
}
