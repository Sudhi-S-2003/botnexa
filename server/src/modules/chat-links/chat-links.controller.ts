import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatLinksService } from './chat-links.service.js';
import { ChatService } from '../chat/chat.service.js';
import { CreateChatLinkDto } from './dto/create-chat-link.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Chat Links')
@Controller('chat-links')
export class ChatLinksController {
  constructor(
    private readonly linksService: ChatLinksService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create public or private chat link for an assistant' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChatLinkDto,
  ) {
    return await this.linksService.createChatLink(user.workspaceId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List chat links in active workspace' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return await this.linksService.getChatLinks(user.workspaceId);
  }

  @Get('assistant/:assistantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or create chat link for assistant' })
  async findByAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assistantId') assistantId: string,
  ) {
    return await this.linksService.getLinkForAssistant(user.workspaceId, assistantId);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke and disable a chat link' })
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.linksService.revokeChatLink(user.workspaceId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Permanently delete a chat link' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.linksService.deleteChatLink(user.workspaceId, id);
  }

  // PUBLIC / PROTECTED / PRIVATE CHAT LINK ENDPOINTS
  @Get('public/:slug')
  @ApiOperation({ summary: 'Resolve public, protected, or private chat link configuration and metadata' })
  async resolvePublic(
    @Param('slug') slug: string,
    @Query('token') secretToken?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return await this.linksService.resolvePublicLink(slug, secretToken, authHeader);
  }

  @Post('public/:slug/message')
  @ApiOperation({ summary: 'Send message to assistant via public, protected, or private chat link' })
  async sendPublicMessage(
    @Param('slug') slug: string,
    @Body() body: { message: string; conversationId?: string; token?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    const linkInfo = await this.linksService.resolvePublicLink(slug, body.token, authHeader);

    // Permission enforcement
    if (linkInfo.isPrivate) {
      if (linkInfo.requiresAuth || !linkInfo.authenticatedUser) {
        throw new UnauthorizedException(
          'Authentication required. Please sign in with your BotNexa account to message this private assistant.',
        );
      }
      if (linkInfo.userPermission === 'none') {
        throw new ForbiddenException(
          'Access Denied: You do not have permission to message this private assistant.',
        );
      }
      if (linkInfo.userPermission === 'view') {
        throw new ForbiddenException(
          'View-Only: You have read-only permissions for this assistant. Sending messages is disabled.',
        );
      }
    } else if (linkInfo.isProtected) {
      if (linkInfo.requiresToken) {
        throw new ForbiddenException(
          'Access Denied: Invalid or missing security access token for this protected chat link.',
        );
      }
    }

    if (linkInfo.userPermission !== 'chat') {
      throw new ForbiddenException(
        'Access Denied: You do not have permission to send messages on this link.',
      );
    }

    return await this.chatService.processChat(
      linkInfo.workspaceId || linkInfo.assistant?.workspaceId || '',
      {
        assistantId: linkInfo.assistant.id,
        message: body.message,
        conversationId: body.conversationId,
      },
      {
        chatLinkId: linkInfo.chatLinkId,
        isPublic: linkInfo.isPublic,
      },
    );
  }
}
