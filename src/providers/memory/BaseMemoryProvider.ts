import { IMemoryProvider, ProviderConfig, MemoryEntry, MemorySearchOptions } from '../../types/Provider';

export abstract class BaseMemoryProvider implements IMemoryProvider {
  abstract name: string;

  abstract initialize(config: ProviderConfig): Promise<void>;
  abstract store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
  abstract retrieve(id: string): Promise<MemoryEntry | null>;
  abstract search(options: MemorySearchOptions): Promise<MemoryEntry[]>;
  abstract delete(id: string): Promise<boolean>;
  abstract shutdown(): Promise<void>;
}
