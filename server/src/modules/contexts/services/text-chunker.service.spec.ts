import { describe, it, expect, beforeEach } from 'vitest';
import { TextChunkerService } from './text-chunker.service.js';

describe('TextChunkerService - Semantic Knowledge Chunking', () => {
  let service: TextChunkerService;

  beforeEach(() => {
    service = new TextChunkerService();
  });

  it('should return empty array for empty or whitespace text', () => {
    expect(service.chunkText('')).toEqual([]);
    expect(service.chunkText('   ')).toEqual([]);
  });

  it('should return single chunk if text is smaller than maxChunkSize', () => {
    const text = 'BotNexa is a multi-tenant AI platform.';
    const result = service.chunkText(text, 100);

    expect(result).toHaveLength(1);
    expect(result[0].chunkIndex).toBe(0);
    expect(result[0].content).toBe(text);
  });

  it('should break text into multiple overlapping chunks at sentence or space boundaries', () => {
    const paragraph1 = 'BotNexa provides conversational AI for modern SaaS applications. ';
    const paragraph2 = 'PostgreSQL pgvector delivers vector embeddings for knowledge retrieval. ';
    const paragraph3 = 'Prepaid wallet accounting guarantees strict zero-overdraft protection for multi-tenant billing.';
    const fullText = paragraph1.repeat(3) + paragraph2.repeat(3) + paragraph3.repeat(3);

    const result = service.chunkText(fullText, 200, 30);

    expect(result.length).toBeGreaterThan(1);
    // Verify each chunk has an index
    result.forEach((chunk, idx) => {
      expect(chunk.chunkIndex).toBe(idx);
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });
});
