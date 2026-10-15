import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContextsService } from './contexts.service.js';
import { CreateContextDto } from './dto/create-context.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Knowledge & Contexts')
@Controller('contexts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContextsController {
  constructor(private readonly contextsService: ContextsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Create a new business knowledge context' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContextDto,
  ) {
    return await this.contextsService.createContext(user.workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all contexts in active workspace' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return await this.contextsService.getContexts(user.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get context and chunks by ID' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.contextsService.getContextById(user.workspaceId, id);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'Get chunk list for a context' })
  async getChunks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.contextsService.getContextChunks(user.workspaceId, id);
  }

  @Post(':id/chunks')
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Create a new chunk with vector embedding in context' })
  async createChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contextId: string,
    @Body('content') content: string,
  ) {
    return await this.contextsService.createChunk(user.workspaceId, contextId, content);
  }

  @Patch(':id/chunks/:chunkId')
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Update text content and refresh vector embedding of a chunk' })
  async updateChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contextId: string,
    @Param('chunkId') chunkId: string,
    @Body('content') content: string,
  ) {
    return await this.contextsService.updateChunk(user.workspaceId, contextId, chunkId, content);
  }

  @Delete(':id/chunks/:chunkId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete an individual chunk from context' })
  async deleteChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contextId: string,
    @Param('chunkId') chunkId: string,
  ) {
    return await this.contextsService.deleteChunk(user.workspaceId, contextId, chunkId);
  }

  @Post(':id/content')
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Append and vectorize text content into an existing context' })
  async appendContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return await this.contextsService.processTextContent(user.workspaceId, id, text);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete context and associated embeddings' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.contextsService.deleteContext(user.workspaceId, id);
  }
}
