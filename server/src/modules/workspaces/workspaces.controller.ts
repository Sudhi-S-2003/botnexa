import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  async createWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return await this.workspacesService.createWorkspace(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workspaces for authenticated user' })
  async getUserWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    return await this.workspacesService.getUserWorkspaces(user.userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active workspace details' })
  async getCurrentWorkspace(@CurrentUser() user: AuthenticatedUser) {
    return await this.workspacesService.getWorkspaceById(user.workspaceId, user.userId);
  }

  @Post('switch/:id')
  @ApiOperation({ summary: 'Switch active workspace context' })
  async switchWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetWorkspaceId: string,
  ) {
    return await this.workspacesService.switchWorkspace(user.userId, targetWorkspaceId);
  }

  @Patch('current')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update current workspace settings (OWNER/ADMIN only)' })
  async updateCurrentWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return await this.workspacesService.updateWorkspace(user.workspaceId, dto);
  }

  @Get('current/members')
  @ApiOperation({ summary: 'List members of the current workspace' })
  async getMembers(@CurrentUser() user: AuthenticatedUser) {
    return await this.workspacesService.getMembers(user.workspaceId);
  }

  @Post('current/members')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a new member to current workspace (OWNER/ADMIN only)' })
  async addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMemberDto,
  ) {
    return await this.workspacesService.addMember(user.workspaceId, dto);
  }

  @Patch('current/members/:userId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a member role in the workspace (OWNER/ADMIN only)' })
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') memberUserId: string,
    @Body('role') role: string,
  ) {
    return await this.workspacesService.updateMemberRole(user.workspaceId, memberUserId, role);
  }

  @Delete('current/members/:userId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove a member from the workspace (OWNER/ADMIN only)' })
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') memberUserId: string,
  ) {
    return await this.workspacesService.removeMember(user.workspaceId, memberUserId, user.userId);
  }
}
