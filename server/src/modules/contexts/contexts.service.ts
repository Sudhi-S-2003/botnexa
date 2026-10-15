import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextEntity } from '../../entities/context.entity.js';
import { ContextChunkEntity } from '../../entities/context-chunk.entity.js';
import { TextChunkerService } from './services/text-chunker.service.js';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { CreateContextDto } from './dto/create-context.dto.js';

@Injectable()
export class ContextsService {
  private readonly logger = new Logger(ContextsService.name);

  constructor(
    @InjectRepository(ContextEntity)
    private readonly contextRepo: Repository<ContextEntity>,
    @InjectRepository(ContextChunkEntity)
    private readonly chunkRepo: Repository<ContextChunkEntity>,
    private readonly chunkerService: TextChunkerService,
    private readonly aiFactory: AiProviderFactory,
  ) {}

  private formatContext(c: any): any {
    return {
      ...c,
      sourceType: (c.type || 'TEXT').toLowerCase(),
      totalChunks: c.totalChunks || c.chunks?.length || 0,
      status: (c.status || 'READY').toLowerCase(),
    };
  }

  async createContext(workspaceId: string, dto: CreateContextDto) {
    const context = this.contextRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description || '',
      type: dto.type || 'TEXT',
      status: 'PENDING',
      version: 1,
    });

    const saved = await this.contextRepo.save(context);

    // If initial raw content was provided, process and vectorize it immediately
    const textToProcess = (dto.rawContent || dto.rawText || '').trim();
    if (textToProcess.length > 0) {
      await this.processTextContent(workspaceId, saved.id, textToProcess);
    }

    const reloaded = await this.getContextById(workspaceId, saved.id);
    return reloaded;
  }

  async getContexts(workspaceId: string) {
    let list = await this.contextRepo.find({
      where: { workspaceId },
      relations: { chunks: true },
      order: { createdAt: 'DESC' },
    });

    // Auto-seed a default knowledge base if empty
    if (list.length === 0) {
      const defaultCtx = this.contextRepo.create({
        workspaceId,
        name: 'BotNexa SaaS & Support Knowledge',
        description: 'Default knowledge base containing platform overview, SLAs, and refund policies.',
        type: 'TEXT',
        status: 'READY',
        version: 1,
        totalChunks: 2,
      });
      const savedCtx = await this.contextRepo.save(defaultCtx);

      const chunk1 = this.chunkRepo.create({
        workspaceId,
        contextId: savedCtx.id,
        chunkIndex: 0,
        content: 'BotNexa is an enterprise-grade AI chatbot SaaS platform with multi-tenant isolation, real-time token metering, and pgvector dense knowledge search.',
        metadata: { charLength: 135 },
      });
      const chunk2 = this.chunkRepo.create({
        workspaceId,
        contextId: savedCtx.id,
        chunkIndex: 1,
        content: 'Refund Policy: Customers can request a full refund of unreserved wallet credits within 14 days of top-up. Support SLA offers 24-hour response on Standard and 1-hour response on Enterprise.',
        metadata: { charLength: 188 },
      });
      await this.chunkRepo.save([chunk1, chunk2]);
      savedCtx.chunks = [chunk1, chunk2];
      list = [savedCtx];
    }

    return list.map((c) => this.formatContext(c));
  }

  async getContextById(workspaceId: string, id: string) {
    const context = await this.contextRepo.findOne({
      where: { id, workspaceId },
      relations: { chunks: true },
    });

    if (!context) {
      throw new NotFoundException('Context not found in this workspace');
    }

    return this.formatContext(context);
  }

  async getContextChunks(workspaceId: string, contextId: string) {
    await this.getContextById(workspaceId, contextId);
    return await this.chunkRepo.find({
      where: { workspaceId, contextId },
      order: { chunkIndex: 'ASC' },
    });
  }

  /**
   * Process raw text, split into chunks, compute embeddings, and persist
   */
  async processTextContent(workspaceId: string, contextId: string, text: string) {
    await this.getContextById(workspaceId, contextId);
    await this.contextRepo.update({ id: contextId, workspaceId }, { status: 'PROCESSING' });

    try {
      // 1. Chunk text
      const chunks = this.chunkerService.chunkText(text);
      if (chunks.length === 0) {
        await this.contextRepo.update({ id: contextId, workspaceId }, { status: 'READY' });
        return await this.getContextById(workspaceId, contextId);
      }

      // 2. Generate embeddings using Gemini
      const chunkTexts = chunks.map((c) => c.content);
      const provider = this.aiFactory.getProvider('gemini');
      const embeddings = await provider.generateEmbeddings(chunkTexts);

      // 3. Persist chunks
      const chunkEntities = chunks.map((chunk, i) =>
        this.chunkRepo.create({
          workspaceId,
          contextId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: embeddings[i] || null,
          metadata: { charLength: chunk.content.length },
        }),
      );

      await this.chunkRepo.save(chunkEntities);

      // 4. Mark context READY with updated chunk count
      const totalCount = await this.chunkRepo.count({ where: { workspaceId, contextId } });
      await this.contextRepo.update(
        { id: contextId, workspaceId },
        {
          status: 'READY',
          totalChunks: totalCount,
        },
      );
      return await this.getContextById(workspaceId, contextId);
    } catch (err: any) {
      this.logger.error(`Error processing context ${contextId}: ${err.message}`);
      await this.contextRepo.update(
        { id: contextId, workspaceId },
        {
          status: 'FAILED',
          metadata: { error: err.message },
        },
      );
      return await this.getContextById(workspaceId, contextId);
    }
  }

  async deleteContext(workspaceId: string, id: string) {
    await this.getContextById(workspaceId, id);
    await this.chunkRepo.delete({ workspaceId, contextId: id });
    await this.contextRepo.delete({ id, workspaceId });
    return { success: true, message: 'Context and embeddings removed successfully' };
  }

  async createChunk(workspaceId: string, contextId: string, content: string) {
    const context = await this.getContextById(workspaceId, contextId);
    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new NotFoundException('Chunk content cannot be empty');
    }

    // Compute embedding
    let embedding: number[] | null = null;
    try {
      const provider = this.aiFactory.getProvider('gemini');
      const embeddings = await provider.generateEmbeddings([trimmed]);
      embedding = embeddings[0] || null;
    } catch (err: any) {
      this.logger.warn(`Failed to generate embedding for chunk: ${err.message}`);
    }

    const currentCount = await this.chunkRepo.count({ where: { workspaceId, contextId } });
    const chunk = this.chunkRepo.create({
      workspaceId,
      contextId,
      chunkIndex: currentCount,
      content: trimmed,
      embedding,
      metadata: { charLength: trimmed.length, manual: true },
    });

    const savedChunk = await this.chunkRepo.save(chunk);
    
    // Update context totalChunks
    await this.contextRepo.update(
      { id: contextId, workspaceId },
      {
        totalChunks: currentCount + 1,
        status: 'READY',
      },
    );

    return savedChunk;
  }

  async updateChunk(workspaceId: string, contextId: string, chunkId: string, content: string) {
    await this.getContextById(workspaceId, contextId);
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId, contextId, workspaceId },
    });
    if (!chunk) {
      throw new NotFoundException('Knowledge chunk not found');
    }

    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new NotFoundException('Chunk content cannot be empty');
    }

    chunk.content = trimmed;
    try {
      const provider = this.aiFactory.getProvider('gemini');
      const embeddings = await provider.generateEmbeddings([trimmed]);
      chunk.embedding = embeddings[0] || chunk.embedding;
    } catch (err: any) {
      this.logger.warn(`Failed to refresh embedding for chunk ${chunkId}: ${err.message}`);
    }

    chunk.metadata = {
      ...(chunk.metadata || {}),
      charLength: trimmed.length,
      updatedAt: new Date().toISOString(),
    };

    return await this.chunkRepo.save(chunk);
  }

  async deleteChunk(workspaceId: string, contextId: string, chunkId: string) {
    const context = await this.getContextById(workspaceId, contextId);
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId, contextId, workspaceId },
    });
    if (!chunk) {
      throw new NotFoundException('Knowledge chunk not found');
    }

    await this.chunkRepo.remove(chunk);
    const remaining = await this.chunkRepo.count({ where: { workspaceId, contextId } });
    await this.contextRepo.update({ id: contextId, workspaceId }, { totalChunks: remaining });

    return { success: true, message: 'Knowledge chunk deleted successfully' };
  }
}
