import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Chat Engine')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('completions')
  @ApiOperation({ summary: 'Send message to assistant with RAG context retrieval and token accounting' })
  async chatCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ) {
    return await this.chatService.processChat(user.workspaceId, dto);
  }

  @Post('message')
  @ApiOperation({ summary: 'Send message to assistant (UI Playground alias)' })
  async chatMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ) {
    return await this.chatService.processChat(user.workspaceId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List recent conversations' })
  async getConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('assistantId') assistantId?: string,
  ) {
    return await this.chatService.getConversations(user.workspaceId, assistantId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get all messages in a conversation' })
  async getMessages(@Param('id') conversationId: string) {
    return await this.chatService.getConversationMessages(conversationId);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Rename or update conversation title' })
  async updateConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body('title') title: string,
  ) {
    return await this.chatService.updateConversation(user.workspaceId, conversationId, title || 'New Conversation');
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation and all associated messages' })
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return await this.chatService.deleteConversation(user.workspaceId, conversationId);
  }

  @Delete('conversations/:id/messages')
  @ApiOperation({ summary: 'Clear all messages in a conversation' })
  async clearMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return await this.chatService.clearConversationMessages(user.workspaceId, conversationId);
  }

  @Get('conversations/:id/export')
  @ApiOperation({ summary: 'Export full conversation transcript with metadata' })
  async exportConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return await this.chatService.exportConversation(user.workspaceId, conversationId);
  }
}
