import { ISkill, SkillFactory } from '../../types/Skill';
import { EventBus, AgentEvents } from '../../utils/events';
import { logger } from '../../utils/logger';

const log = logger.child('registry:skill');

export class SkillRegistry {
  private skills: Map<string, ISkill> = new Map();
  private factories: Map<string, SkillFactory> = new Map();
  private eventBus: EventBus<AgentEvents>;

  constructor(eventBus: EventBus<AgentEvents>) {
    this.eventBus = eventBus;
  }

  register(skill: ISkill): void {
    if (this.skills.has(skill.name)) {
      log.warn(`Overwriting skill: ${skill.name}`);
    }
    this.skills.set(skill.name, skill);
    this.eventBus.emit('skill:registered', skill.name);
    log.info(`Registered skill: ${skill.name}`);
  }

  unregister(name: string): void {
    if (this.skills.has(name)) {
      this.skills.delete(name);
      this.eventBus.emit('skill:unregistered', name);
      log.info(`Unregistered skill: ${name}`);
    }
  }

  registerLazy(name: string, factory: SkillFactory): void {
    this.factories.set(name, factory);
    log.info(`Registered lazy skill: ${name}`);
  }

  async get(name: string): Promise<ISkill | undefined> {
    if (this.skills.has(name)) {
      return this.skills.get(name);
    }

    const factory = this.factories.get(name);
    if (factory) {
      const skill = await factory();
      this.skills.set(name, skill);
      this.factories.delete(name);
      this.eventBus.emit('skill:registered', name);
      return skill;
    }

    return undefined;
  }

  has(name: string): boolean {
    return this.skills.has(name) || this.factories.has(name);
  }

  list(): string[] {
    const eager = Array.from(this.skills.keys());
    const lazy = Array.from(this.factories.keys());
    return [...eager, ...lazy];
  }

  getAll(): ISkill[] {
    return Array.from(this.skills.values());
  }
}
