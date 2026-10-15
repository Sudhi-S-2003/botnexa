import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ChatService } from '../chat/chat.service.js';
import { AssistantsService } from '../assistants/assistants.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { ChatRequestDto } from '../chat/dto/chat-request.dto.js';

@ApiTags('External REST API (v1)')
@Controller('v1')
@UseGuards(ApiKeyGuard)
@ApiSecurity('x-api-key')
export class ApiV1Controller {
  constructor(
    private readonly chatService: ChatService,
    private readonly assistantsService: AssistantsService,
    private readonly walletService: WalletService,
  ) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'Send message to an assistant using workspace API Key' })
  async chatCompletion(@Req() req: any, @Body() dto: ChatRequestDto) {
    const { workspaceId, allowedAssistantIds } = req.apiKey;

    // Enforce API key assistant scoping if configured
    if (
      allowedAssistantIds &&
      allowedAssistantIds.length > 0 &&
      !allowedAssistantIds.includes(dto.assistantId)
    ) {
      throw new ForbiddenException('This API key is not authorized for the requested assistant');
    }

    return await this.chatService.processChat(workspaceId, dto);
  }

  @Get('assistants')
  @ApiOperation({ summary: 'List assistants authorized for this API key' })
  async listAssistants(@Req() req: any) {
    const { workspaceId, allowedAssistantIds } = req.apiKey;
    const assistants = await this.assistantsService.getAssistants(workspaceId);

    if (allowedAssistantIds && allowedAssistantIds.length > 0) {
      return assistants.filter((a) => allowedAssistantIds.includes(a.id));
    }
    return assistants;
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get workspace wallet balance via API' })
  async getWallet(@Req() req: any) {
    return await this.walletService.getBalance(req.workspaceId);
  }
}
