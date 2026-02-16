import { IEmbeddingProvider, ProviderConfig } from '../../types/Provider';

export abstract class BaseEmbeddingProvider implements IEmbeddingProvider {
  abstract name: string;

  abstract initialize(config: ProviderConfig): Promise<void>;
  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
  abstract shutdown(): Promise<void>;
}
