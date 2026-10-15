import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeveloperController } from './developer.controller.js';
import type { ChatService } from '../chat/chat.service.js';
import type { AssistantsService } from '../assistants/assistants.service.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

describe('DeveloperController - API as a Service (/developer)', () => {
  let controller: DeveloperController;
  let mockChatService: Partial<ChatService>;
  let mockAssistantsService: Partial<AssistantsService>;
  let mockWalletService: Partial<WalletService>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockChatService = {
      processChat: vi.fn().mockResolvedValue({
        conversationId: 'conv-123',
        messageId: 'msg-456',
        reply: 'This is an AI response grounded in business context.',
        model: 'gemini-3.5-flash-lite',
        provider: 'gemini',
        sources: [
          {
            chunkId: 'chunk-1',
            content: 'Company SLA is 99.9%',
            similarity: 0.95,
          },
        ],
        usage: {
          inputTokens: 100,
          outputTokens: 30,
          totalTokens: 130,
        },
        latencyMs: 350,
        requestId: 'req-abc',
      }),
    };

    mockAssistantsService = {
      getAssistants: vi.fn().mockResolvedValue([
        {
          id: 'asst-1',
          name: 'Tech Support',
          description: 'Technical assistant',
          model: 'gemini-3.5-flash-lite',
          modelParameters: { temperature: 0.7 },
          status: 'PUBLISHED',
          accessPolicy: 'PUBLIC',
          createdAt: new Date(),
        },
      ]),
      getAssistantById: vi.fn().mockResolvedValue({
        id: 'asst-1',
        name: 'Tech Support',
        description: 'Technical assistant',
        welcomeMessage: 'Hi! Ask me anything.',
        avatarUrl: null,
      }),
    };

    mockWalletService = {
      getBalance: vi.fn().mockResolvedValue({
        workspaceId: 'ws-100',
        currency: 'INR',
        totalBalanceMinorUnits: 5000,
        reservedAmountMinorUnits: 0,
        availableBalanceMinorUnits: 5000,
        formattedTotal: '₹50.00',
        formattedAvailable: '₹50.00',
      }),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-signed-jwt-token'),
      verify: vi.fn().mockReturnValue({
        type: 'embed_widget',
        assistantId: 'asst-1',
        workspaceId: 'ws-100',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('https://botnexa.onrender.com'),
    };

    controller = new DeveloperController(
      mockChatService as ChatService,
      mockAssistantsService as AssistantsService,
      mockWalletService as WalletService,
      mockJwtService as JwtService,
      mockConfigService as ConfigService,
    );
  });

  it('should process chat completion and wrap in dedicated payload with version "v1"', async () => {
    const mockReq = {
      apiKey: { workspaceId: 'ws-100', allowedAssistantIds: [] },
      workspaceId: 'ws-100',
    };

    const response = await controller.chatCompletionV1(mockReq, {
      version: 'v1',
      assistantId: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Hello Assistant',
    });

    expect(response.version).toBe('v1');
    expect(response.status).toBe('success');
    expect(response.timestamp).toBeDefined();
    expect(response.data.id).toContain('chatcmpl-msg-456');
    expect(response.data.object).toBe('chat.completion');
    expect(response.data.message.content).toBe(
      'This is an AI response grounded in business context.',
    );
    expect(response.data.citations).toHaveLength(1);
    expect(response.data.usage?.totalTokens).toBe(130);
  });

  it('should generate time-limited embed token and iframe snippet with expiry', async () => {
    const mockReq = {
      apiKey: { workspaceId: 'ws-100', allowedAssistantIds: [] },
      workspaceId: 'ws-100',
    };

    const response = await controller.generateEmbedTokenV1(mockReq, {
      version: 'v1',
      assistantId: 'asst-1',
      expiresInSeconds: 3600,
    });

    expect(response.version).toBe('v1');
    expect(response.status).toBe('success');
    expect(response.data.token).toBe('mock-signed-jwt-token');
    expect(response.data.expiresInSeconds).toBe(3600);
    expect(response.data.embedUrl).toContain('/embed/chat?token=mock-signed-jwt-token');
    expect(response.data.iframeHtml).toContain('<iframe');
    expect(response.data.widgetScript).toContain('<script');
  });

  it('should return models list wrapped in version "v1" envelope', async () => {
    const response = await controller.listModelsV1();

    expect(response.version).toBe('v1');
    expect(response.status).toBe('success');
    expect(response.data).toHaveLength(3);
    expect(response.data[0].id).toBe('gemini-3.5-flash-lite');
  });

  it('should return verified key scopes wrapped in version "v1" envelope', async () => {
    const mockReq = {
      apiKey: { scopes: ['chat', 'conversations'], allowedAssistantIds: ['asst-1'] },
      workspaceId: 'ws-100',
    };

    const response = await controller.verifySecret(mockReq);

    expect(response.version).toBe('v1');
    expect(response.status).toBe('success');
    expect(response.data.valid).toBe(true);
    expect(response.data.workspaceId).toBe('ws-100');
    expect(response.data.scopes).toEqual(['chat', 'conversations']);
  });
});
