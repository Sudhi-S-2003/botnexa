import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ConversationEntity } from '../../entities/conversation.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { RetrievalService } from '../contexts/services/retrieval.service.js';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { WalletService } from '../wallet/wallet.service.js';
import { PricingService } from '../wallet/pricing.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import type { ChatCompletionResponse } from '../../types/chat.type.js';
import type { ChatMessage } from '../../types/ai.type.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(AssistantEntity)
    private readonly assistantRepo: Repository<AssistantEntity>,
    @InjectRepository(ConversationEntity)
    private readonly convRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
    private readonly retrievalService: RetrievalService,
    private readonly aiFactory: AiProviderFactory,
    private readonly walletService: WalletService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Central Chat Engine Pipeline executing end-to-end chat completion
   */
  async processChat(
    workspaceId: string,
    dto: ChatRequestDto,
    options: { chatLinkId?: string; isPublic?: boolean } = {},
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Resolve Assistant
    const assistant = await this.assistantRepo.findOne({
      where: { id: dto.assistantId, ...(options.isPublic ? {} : { workspaceId }) },
      relations: { contexts: true },
    });

    if (!assistant) {
      throw new NotFoundException('Assistant not found or not accessible');
    }

    if (options.isPublic && assistant.accessPolicy !== 'PUBLIC' && !options.chatLinkId) {
      throw new ForbiddenException('This assistant is private and cannot be accessed via public links');
    }

    const effectiveWorkspaceId = assistant.workspaceId;

    // 2. Resolve Conversation
    let conversation: ConversationEntity;
    if (dto.conversationId) {
      const existing = await this.convRepo.findOne({
        where: { id: dto.conversationId, assistantId: assistant.id },
      });
      if (!existing) {
        throw new NotFoundException('Conversation not found');
      }
      conversation = existing;
    } else {
      // Create new conversation
      conversation = this.convRepo.create({
        workspaceId: effectiveWorkspaceId,
        assistantId: assistant.id,
        chatLinkId: options.chatLinkId || null,
        title: dto.message.slice(0, 40) + '...',
      });
      conversation = await this.convRepo.save(conversation);
    }

    // 3. Load Recent Conversation Messages (Last 6 messages)
    const recentMessages = await this.msgRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      take: 6,
    });
    recentMessages.reverse();

    // 4. Retrieve Authorized Business Context via pgvector
    const contextIds = assistant.contexts?.map((c) => c.id) || [];
    const retrievedSources = await this.retrievalService.retrieveRelevantChunks(
      effectiveWorkspaceId,
      contextIds,
      dto.message,
      4,
      0.45,
    );

    // 5. Estimate Cost and Atomically Reserve Funds
    const estimatedCost = this.pricingService.estimateMaxCost(
      assistant.model,
      assistant.modelParameters?.maxOutputTokens ?? 2048,
    );

    await this.walletService.reserveFunds(
      effectiveWorkspaceId,
      assistant.id,
      requestId,
      estimatedCost,
    );

    // 6. Assemble Prompt Messages
    const chatMessages: ChatMessage[] = recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    chatMessages.push({ role: 'user', content: dto.message });

    // 7. Invoke AI Provider
    let generationResult;
    try {
      const provider = this.aiFactory.getProvider(assistant.provider);
      generationResult = await provider.generate({
        provider: assistant.provider,
        model: assistant.model,
        systemInstruction: assistant.systemPrompt,
        messages: chatMessages,
        contextChunks: retrievedSources.map((s) => ({
          content: s.content,
          source: s.contextId,
        })),
        temperature: assistant.modelParameters?.temperature ?? 0.7,
        maxOutputTokens: assistant.modelParameters?.maxOutputTokens ?? 2048,
      });
    } catch (error: any) {
      // Release reservation on AI provider error so workspace is NOT charged
      await this.walletService.releaseReservation(requestId);
      this.logger.error(`AI generation failure for ${requestId}: ${error.message}`);
      throw error;
    }

    // 8. Settle Billing
    const settlement = await this.walletService.settleReservation(
      requestId,
      generationResult.usage,
      assistant.model,
      assistant.provider,
      conversation.id,
    );

    // 9. Persist Messages (User + Assistant)
    const userMsg = this.msgRepo.create({
      workspaceId: effectiveWorkspaceId,
      conversationId: conversation.id,
      role: 'user',
      content: dto.message,
    });

    const assistantMsg = this.msgRepo.create({
      workspaceId: effectiveWorkspaceId,
      conversationId: conversation.id,
      role: 'assistant',
      content: generationResult.text,
      inputTokens: generationResult.usage.inputTokens,
      outputTokens: generationResult.usage.outputTokens,
      latencyMs: generationResult.latencyMs || Date.now() - startTime,
      model: assistant.model,
      retrievedSources: retrievedSources.map((s) => ({
        chunkId: s.chunkId,
        content: s.content.slice(0, 100),
        similarity: s.similarity,
      })),
    });

    await this.msgRepo.save([userMsg, assistantMsg]);

    const costMinor = settlement?.customerCharge ?? Math.max(1, Math.ceil((generationResult.usage.totalTokens / 1_000_000) * 40));

    // 10. Return Response
    return {
      conversationId: conversation.id,
      messageId: assistantMsg.id,
      reply: generationResult.text,
      model: assistant.model,
      provider: assistant.provider,
      message: {
        id: assistantMsg.id,
        role: 'assistant',
        content: generationResult.text,
        createdAt: assistantMsg.createdAt,
      },
      citations: retrievedSources.map((s) => ({
        chunkId: s.chunkId,
        snippet: s.content,
        similarity: s.similarity,
        contextId: s.contextId,
      })),
      usage: {
        ...generationResult.usage,
        estimatedCostMinor: costMinor,
        customerChargeMinorUnits: costMinor,
        chargeFormatted: `₹${(costMinor / 100).toFixed(4)}`,
      },
      wallet: settlement?.newBalance != null ? {
        balance: settlement.newBalance,
        reservedAmount: settlement.reservedAmount,
      } : undefined,
      sources: retrievedSources.map((s) => ({
        chunkId: s.chunkId,
        content: s.content,
        similarity: s.similarity,
      })),
      latencyMs: Date.now() - startTime,
      requestId,
    };
  }

  async getConversationMessages(conversationId: string) {
    return await this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getConversations(workspaceId: string, assistantId?: string) {
    return await this.convRepo.find({
      where: {
        workspaceId,
        ...(assistantId ? { assistantId } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async updateConversation(workspaceId: string, conversationId: string, title: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found in active workspace');
    }
    conv.title = title.trim();
    return await this.convRepo.save(conv);
  }

  async deleteConversation(workspaceId: string, conversationId: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found in active workspace');
    }
    // Delete all associated messages
    await this.msgRepo.delete({ conversationId });
    await this.convRepo.remove(conv);
    return { success: true, message: 'Conversation deleted successfully' };
  }

  async clearConversationMessages(workspaceId: string, conversationId: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found in active workspace');
    }
    await this.msgRepo.delete({ conversationId });
    return { success: true, message: 'Conversation messages cleared successfully' };
  }

  async exportConversation(workspaceId: string, conversationId: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found in active workspace');
    }
    const messages = await this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return {
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      totalMessages: messages.length,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        latencyMs: m.latencyMs,
        model: m.model,
        createdAt: m.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };
  }
}
