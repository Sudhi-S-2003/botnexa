import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import pgvector from 'pgvector';
import { AiProviderFactory } from '../../ai/ai-provider.factory.js';
import type { VectorSearchResult } from '../../../types/context.type.js';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly aiFactory: AiProviderFactory,
  ) {}

  /**
   * Perform pgvector cosine similarity search across authorized context chunks
   */
  async retrieveRelevantChunks(
    workspaceId: string,
    contextIds: string[],
    queryText: string,
    limit: number = 4,
    minSimilarity: number = 0.5,
  ): Promise<VectorSearchResult[]> {
    if (!contextIds || contextIds.length === 0 || !queryText.trim()) {
      return [];
    }

    try {
      // 1. Generate query embedding using Gemini embedding model
      const provider = this.aiFactory.getProvider('gemini');
      const embeddings = await provider.generateEmbeddings([queryText]);
      if (!embeddings || embeddings.length === 0) {
        return [];
      }

      const queryVector = pgvector.toSql(embeddings[0]);

      // 2. Query PostgreSQL with pgvector cosine distance operator (<=>)
      const rawResults: any[] = await this.dataSource.query(
        `
        SELECT 
          id, 
          "contextId", 
          content, 
          metadata, 
          (1 - (embedding::vector <=> $1::vector)) AS similarity
        FROM context_chunks
        WHERE "workspaceId" = $2
          AND "contextId" = ANY($3::uuid[])
          AND embedding IS NOT NULL
        ORDER BY embedding::vector <=> $1::vector ASC
        LIMIT $4;
        `,
        [queryVector, workspaceId, contextIds, limit],
      );

      // 3. Filter by similarity threshold
      return rawResults
        .filter((r) => Number(r.similarity) >= minSimilarity)
        .map((r) => ({
          chunkId: r.id,
          contextId: r.contextId,
          content: r.content,
          metadata: r.metadata || {},
          similarity: Number(r.similarity),
        }));
    } catch (err: any) {
      this.logger.error(`Vector retrieval error: ${err.message}`);
      // Fallback: substring / ILIKE keyword search if vector extension is unavailable
      return await this.fallbackKeywordSearch(workspaceId, contextIds, queryText, limit);
    }
  }

  private async fallbackKeywordSearch(
    workspaceId: string,
    contextIds: string[],
    queryText: string,
    limit: number,
  ): Promise<VectorSearchResult[]> {
    const rawResults: any[] = await this.dataSource.query(
      `
      SELECT id, "contextId", content, metadata
      FROM context_chunks
      WHERE "workspaceId" = $1
        AND "contextId" = ANY($2::uuid[])
        AND content ILIKE $3
      LIMIT $4;
      `,
      [workspaceId, contextIds, `%${queryText}%`, limit],
    );

    return rawResults.map((r) => ({
      chunkId: r.id,
      contextId: r.contextId,
      content: r.content,
      metadata: r.metadata || {},
      similarity: 0.75, // synthetic score for keyword match
    }));
  }
}
