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
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CreateEmbedTokenDto } from './dto/create-embed-token.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Generate a new API key (Raw secret returned only once)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return await this.apiKeysService.createApiKey(user.workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys in active workspace (Safe prefixes only)' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return await this.apiKeysService.getApiKeys(user.workspaceId);
  }

  @Post('embed-token')
  @ApiOperation({ summary: 'Generate signed embed token for web chat widget or iframe' })
  async generateEmbedToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmbedTokenDto,
  ) {
    return await this.apiKeysService.generateEmbedToken(user.workspaceId, dto);
  }

  @Patch(':id/revoke')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Revoke and permanently disable an API key' })
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.apiKeysService.revokeApiKey(user.workspaceId, id);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Revoke and delete an API key' })
  async deleteKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.apiKeysService.revokeApiKey(user.workspaceId, id);
  }
}
