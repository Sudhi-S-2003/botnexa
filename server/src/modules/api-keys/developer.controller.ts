import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ChatService } from '../chat/chat.service.js';
import { AssistantsService } from '../assistants/assistants.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { DeveloperChatRequestDto } from './dto/developer-chat-request.dto.js';
import { CreateEmbedTokenDto } from './dto/create-embed-token.dto.js';
import { EmbedChatDto } from './dto/embed-chat.dto.js';
import { DEFAULT_JWT_SECRET } from '../../types/auth.type.js';

export interface DeveloperEnvelope<T> {
  version: 'v1';
  status: 'success' | 'error';
  timestamp: string;
  data: T;
}

export interface EmbedTokenPayload {
  type: 'embed_widget';
  assistantId: string;
  workspaceId: string;
  allowedOrigins?: string[];
  exp: number;
}

@ApiTags('Developer API-as-a-Service (/developer)')
@Controller('developer')
export class DeveloperController {
  constructor(
    private readonly chatService: ChatService,
    private readonly assistantsService: AssistantsService,
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private wrap<T>(data: T): DeveloperEnvelope<T> {
    return {
      version: 'v1',
      status: 'success',
      timestamp: new Date().toISOString(),
      data,
    };
  }

  // ==========================================
  // 1. Authenticated Developer Completion APIs
  // ==========================================

  @Post('v1/chat/completions')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Developer Chat Completion (v1)',
    description: 'Query an AI assistant using your workspace API Key Secret. Returns a dedicated structure with version "v1".',
  })
  @ApiResponse({ status: 200, description: 'Successful completion wrapped in version v1 payload' })
  async chatCompletionV1(@Req() req: any, @Body() dto: DeveloperChatRequestDto) {
    return this.executeChatCompletion(req, dto);
  }

  @Post('chat/completions')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Developer Chat Completion (Default / Latest)',
    description: 'Alias for /developer/v1/chat/completions with version "v1" structure.',
  })
  async chatCompletion(@Req() req: any, @Body() dto: DeveloperChatRequestDto) {
    return this.executeChatCompletion(req, dto);
  }

  private async executeChatCompletion(req: any, dto: DeveloperChatRequestDto) {
    const { workspaceId, allowedAssistantIds } = req.apiKey;

    if (
      allowedAssistantIds &&
      allowedAssistantIds.length > 0 &&
      !allowedAssistantIds.includes(dto.assistantId)
    ) {
      throw new ForbiddenException(
        'This API key secret is not authorized to query the specified assistant',
      );
    }

    const result = await this.chatService.processChat(workspaceId, {
      assistantId: dto.assistantId,
      message: dto.message,
      conversationId: dto.conversationId,
    });

    return this.wrap({
      id: `chatcmpl-${result.messageId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      assistantId: dto.assistantId,
      conversationId: result.conversationId,
      message: {
        role: 'assistant',
        content: result.reply,
      },
      citations: (result.sources || []).map((s) => ({
        chunkId: s.chunkId,
        snippet: s.content,
        similarity: s.similarity,
      })),
      usage: result.usage
        ? {
            promptTokens: result.usage.inputTokens,
            completionTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
            costMinorUnits: Math.max(1, Math.ceil((result.usage.totalTokens / 1_000_000) * 40)),
            currency: 'INR',
          }
        : null,
      latencyMs: result.latencyMs,
    });
  }

  // ==========================================
  // 2. Generate Ephemeral Scoped Client Token (For React / SPAs)
  // ==========================================

  @Post('v1/client/tokens')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mint Ephemeral Scoped Client Token for React Frontends & SPAs',
    description:
      'Generates a short-lived (e.g. 15m), assistant-scoped JWT token for client-side applications (React, Next.js, mobile apps, or widgets) so the master API secret is NEVER exposed to browsers. Frontend connects directly using Authorization: Bearer <client_token>.',
  })
  async generateClientTokenV1(@Req() req: any, @Body() dto: CreateEmbedTokenDto) {
    return this.executeGenerateClientToken(req, dto);
  }

  @Post('v1/client-tokens')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mint Ephemeral Scoped Client Token (Alias)',
  })
  async generateClientTokenAlias(@Req() req: any, @Body() dto: CreateEmbedTokenDto) {
    return this.executeGenerateClientToken(req, dto);
  }

  private async executeGenerateClientToken(req: any, dto: CreateEmbedTokenDto) {
    const { workspaceId, allowedAssistantIds } = req.apiKey;

    if (
      allowedAssistantIds &&
      allowedAssistantIds.length > 0 &&
      !allowedAssistantIds.includes(dto.assistantId)
    ) {
      throw new ForbiddenException(
        'This API key is not authorized to create client tokens for this assistant',
      );
    }

    const assistant = await this.assistantsService.getAssistantById(workspaceId, dto.assistantId);
    const expiresInSeconds = dto.expiresInSeconds || 900; // 15 minutes default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const payload = {
      type: 'client_token',
      assistantId: assistant.id,
      workspaceId,
      allowedOrigins: dto.allowedOrigins || [],
    };

    const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
    const token = this.jwtService.sign(payload, {
      secret: masterKey,
      expiresIn: expiresInSeconds,
    });

    return this.wrap({
      token,
      tokenType: 'Bearer',
      assistantId: assistant.id,
      assistantName: assistant.name,
      expiresInSeconds,
      expiresAt,
      allowedOrigins: dto.allowedOrigins || [],
      usageInstructions:
        'Pass header Authorization: Bearer <token> directly from React/frontend to /developer/v1/chat/completions',
    });
  }

  // ==========================================
  // 3. Generate Time-Limited Embed Token / Snippets
  // ==========================================

  @Post('v1/embed/token')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Time-Limited AI Chat Embed Token & Snippets',
    description: 'Generates a signed, time-limited token using your API key secret for iframe or floating chat widget embedding on external websites.',
  })
  async generateEmbedTokenV1(@Req() req: any, @Body() dto: CreateEmbedTokenDto) {
    return this.executeGenerateEmbedToken(req, dto);
  }

  @Post('embed/token')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiSecurity('x-api-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Time-Limited AI Chat Embed Token (Alias)',
  })
  async generateEmbedToken(@Req() req: any, @Body() dto: CreateEmbedTokenDto) {
    return this.executeGenerateEmbedToken(req, dto);
  }

  private async executeGenerateEmbedToken(req: any, dto: CreateEmbedTokenDto) {
    const workspaceId = req.apiKey?.workspaceId || req.user?.workspaceId;
    const allowedAssistantIds = req.apiKey?.allowedAssistantIds;

    if (
      allowedAssistantIds &&
      allowedAssistantIds.length > 0 &&
      !allowedAssistantIds.includes(dto.assistantId)
    ) {
      throw new ForbiddenException(
        'This API key secret is not authorized to create embed tokens for this assistant',
      );
    }

    const assistant = await this.assistantsService.getAssistantById(workspaceId, dto.assistantId);

    const expiresInSeconds = dto.expiresInSeconds || 86400; // 24 hours default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const payload: EmbedTokenPayload = {
      type: 'embed_widget',
      assistantId: assistant.id,
      workspaceId,
      allowedOrigins: dto.allowedOrigins || [],
    } as any;

    const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
    const token = this.jwtService.sign(payload, {
      secret: masterKey,
      expiresIn: expiresInSeconds,
    });

    // Determine host base URL for iframe / widget script
    const clientBaseUrl =
      this.configService.get<string>('CLIENT_PUBLIC_URL') || 'https://botnexa.onrender.com';

    const embedUrl = `${clientBaseUrl}/embed/chat?token=${token}`;
    const iframeHtml = `<iframe src="${embedUrl}" width="400" height="620" frameborder="0" allow="clipboard-write" style="border: none; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);"></iframe>`;
    const widgetScript = `<script src="${clientBaseUrl}/embed-widget.js" data-token="${token}" data-position="bottom-right" defer></script>`;

    return this.wrap({
      token,
      assistantId: assistant.id,
      assistantName: assistant.name,
      expiresInSeconds,
      expiresAt,
      embedUrl,
      iframeHtml,
      widgetScript,
    });
  }

  // ==========================================
  // 3. Embedded Widget Public APIs (Token Auth)
  // ==========================================

  @Get('v1/embed/info')
  @ApiOperation({ summary: 'Get assistant display metadata for embedded iframe or widget' })
  async getEmbedInfo(@Query('token') token: string, @Req() req: any) {
    return this.executeGetEmbedInfo(token, req);
  }

  @Get('embed/info')
  @ApiOperation({ summary: 'Get assistant display metadata (alias)' })
  async getEmbedInfoAlias(@Query('token') token: string, @Req() req: any) {
    return this.executeGetEmbedInfo(token, req);
  }

  private async executeGetEmbedInfo(token: string, req: any) {
    if (!token) {
      throw new UnauthorizedException('Embed token is required in query (?token=...)');
    }

    let payload: EmbedTokenPayload;
    try {
      const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
      payload = this.jwtService.verify(token, { secret: masterKey });
    } catch {
      throw new UnauthorizedException('Embed token has expired or is invalid');
    }

    if (payload.type !== 'embed_widget') {
      throw new UnauthorizedException('Invalid embed token type');
    }

    // Origin verification if configured
    this.verifyOrigin(req, payload.allowedOrigins);

    const assistant = await this.assistantsService.getAssistantById(
      payload.workspaceId,
      payload.assistantId,
    );

    return this.wrap({
      assistantId: assistant.id,
      name: assistant.name,
      description: assistant.description,
      avatarUrl: assistant.avatarUrl,
      welcomeMessage: assistant.welcomeMessage || 'Hello! How can I help you today?',
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });
  }

  @Post('v1/embed/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message from embedded chat via embed token (v1 chat route)' })
  async sendEmbedChat(@Body() dto: EmbedChatDto, @Req() req: any) {
    return this.executeSendEmbedMessage(dto, req);
  }

  @Post('embed/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message from embedded chat via embed token (chat route alias)' })
  async sendEmbedChatAlias(@Body() dto: EmbedChatDto, @Req() req: any) {
    return this.executeSendEmbedMessage(dto, req);
  }

  @Post('v1/embed/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message from embedded iframe or widget via embed token' })
  async sendEmbedMessage(@Body() dto: EmbedChatDto, @Req() req: any) {
    return this.executeSendEmbedMessage(dto, req);
  }

  @Post('embed/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message from embedded iframe or widget (alias)' })
  async sendEmbedMessageAlias(@Body() dto: EmbedChatDto, @Req() req: any) {
    return this.executeSendEmbedMessage(dto, req);
  }

  private async executeSendEmbedMessage(dto: EmbedChatDto, req: any) {
    const rawToken =
      dto.token ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7).trim()
        : null) ||
      (req.query?.token as string);

    if (!rawToken) {
      throw new UnauthorizedException('Embed token is required');
    }

    let payload: EmbedTokenPayload;
    try {
      const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
      payload = this.jwtService.verify(rawToken, { secret: masterKey });
    } catch {
      throw new UnauthorizedException('Embed token has expired. Please refresh your widget.');
    }

    if (payload.type !== 'embed_widget') {
      throw new UnauthorizedException('Invalid token type for embedding');
    }

    // Origin verification
    this.verifyOrigin(req, payload.allowedOrigins);

    const result = await this.chatService.processChat(payload.workspaceId, {
      assistantId: payload.assistantId,
      message: dto.message,
      conversationId: dto.conversationId,
    });

    const replyText = result.reply || (result as any).message || 'Response received.';

    return {
      version: 'v1',
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        id: `embedmsg-${result.messageId}`,
        conversationId: result.conversationId,
        reply: replyText,
        message: {
          role: 'assistant',
          content: replyText,
        },
        citations: (result.sources || []).map((s) => ({
          chunkId: s.chunkId,
          snippet: s.content,
          similarity: s.similarity,
        })),
        usage: result.usage
          ? {
              totalTokens: result.usage.totalTokens,
            }
          : null,
      },
      reply: replyText,
      conversationId: result.conversationId,
      message: replyText,
    };
  }

  private verifyOrigin(req: any, allowedOrigins?: string[]) {
    if (!allowedOrigins || allowedOrigins.length === 0) return;

    const origin = req.headers['origin'] || req.headers['referer'];
    if (!origin) return;

    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedHost = new URL(allowed).hostname;
        const incomingHost = new URL(origin).hostname;
        return incomingHost === allowedHost || incomingHost.endsWith(`.${allowedHost}`);
      } catch {
        return allowed === origin;
      }
    });

    if (!isAllowed) {
      throw new ForbiddenException(
        `Embedding from origin '${origin}' is not authorized for this token`,
      );
    }
  }

  // ==========================================
  // 4. Utility / Metadata APIs
  // ==========================================

  @Get('v1/assistants')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'List authorized assistants (v1)' })
  async listAssistantsV1(@Req() req: any) {
    return this.executeListAssistants(req);
  }

  @Get('assistants')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'List authorized assistants' })
  async listAssistants(@Req() req: any) {
    return this.executeListAssistants(req);
  }

  private async executeListAssistants(req: any) {
    const { workspaceId, allowedAssistantIds } = req.apiKey;
    const assistants = await this.assistantsService.getAssistants(workspaceId);

    const filtered =
      allowedAssistantIds && allowedAssistantIds.length > 0
        ? assistants.filter((a) => allowedAssistantIds.includes(a.id))
        : assistants;

    const formatted = filtered.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      temperature: a.modelParameters?.temperature || 0.7,
      status: a.status,
      isPublic: a.accessPolicy === 'PUBLIC',
      createdAt: a.createdAt,
    }));

    return this.wrap(formatted);
  }

  @Get('v1/models')
  @ApiOperation({ summary: 'List available AI models (v1)' })
  async listModelsV1() {
    return this.wrap([
      {
        id: 'gemini-3.5-flash-lite',
        provider: 'gemini',
        name: 'Google Gemini 3.5 Flash Lite',
        type: 'chat',
        contextWindow: 1048576,
        isDefault: true,
      },
      {
        id: 'gemini-embedding-001',
        provider: 'gemini',
        name: 'Google Gemini Embedding 001',
        type: 'embedding',
        dimensions: 3072,
        isDefault: true,
      },
      {
        id: 'mock-model-v1',
        provider: 'mock',
        name: 'Mock Test Provider',
        type: 'chat',
        contextWindow: 4096,
        isDefault: false,
      },
    ]);
  }

  @Get('models')
  @ApiOperation({ summary: 'List available AI models' })
  async listModels() {
    return this.listModelsV1();
  }

  @Get('v1/wallet')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Get workspace wallet balance via Developer API (v1)' })
  async getWalletV1(@Req() req: any) {
    const balance = await this.walletService.getBalance(req.workspaceId);
    return this.wrap(balance);
  }

  @Get('wallet')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Get workspace wallet balance via Developer API' })
  async getWallet(@Req() req: any) {
    return this.getWalletV1(req);
  }

  @Post('v1/verify')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify API Key Secret validity & retrieve scopes' })
  async verifySecret(@Req() req: any) {
    return this.wrap({
      valid: true,
      workspaceId: req.workspaceId,
      scopes: req.apiKey.scopes,
      allowedAssistantIds: req.apiKey.allowedAssistantIds,
    });
  }
}
