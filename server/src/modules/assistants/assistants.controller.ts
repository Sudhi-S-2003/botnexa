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
import { AssistantsService } from './assistants.service.js';
import { CreateAssistantDto } from './dto/create-assistant.dto.js';
import { UpdateAssistantDto } from './dto/update-assistant.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Assistants')
@Controller('assistants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Create a new AI assistant' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssistantDto,
  ) {
    return await this.assistantsService.createAssistant(user.workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all assistants in active workspace' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return await this.assistantsService.getAssistants(user.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assistant by ID' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.assistantsService.getAssistantById(user.workspaceId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Update assistant configuration' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssistantDto,
  ) {
    return await this.assistantsService.updateAssistant(user.workspaceId, id, dto);
  }

  @Post(':id/publish')
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Publish assistant draft' })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.assistantsService.publishAssistant(user.workspaceId, id);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete assistant' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.assistantsService.deleteAssistant(user.workspaceId, id);
  }
}
