export type ContextType = 'DOCUMENT' | 'FAQ' | 'TEXT' | 'JSON' | 'URL';
export type ContextStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'DISABLED';

export interface ContextChunkPayload {
  chunkIndex: number;
  content: string;
  metadata?: Record<string, any>;
  embedding: number[];
}

export interface VectorSearchResult {
  chunkId: string;
  contextId: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}
