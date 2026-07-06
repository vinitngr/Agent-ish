import { Session } from './Session';

export interface ISessionStore {
  get(id: string): Promise<Session | null>;
  set(id: string, session: Session): Promise<void>;
  list(): Promise<string[]>;
  delete(id: string): Promise<void>;
}

export class MemorySessionStore implements ISessionStore {
  private sessions: Map<string, Session> = new Map();

  async get(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async set(id: string, session: Session): Promise<void> {
    this.sessions.set(id, session);
  }

  async list(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}
