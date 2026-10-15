import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditLogsService } from './audit-logs.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Query workspace security and activity audit logs' })
  async getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    return await this.auditLogsService.getLogs(user.workspaceId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      action,
      resource,
    });
  }

  @Get('actions')
  @ApiOperation({ summary: 'List all unique audit actions recorded for workspace' })
  async getActions(@CurrentUser() user: AuthenticatedUser) {
    return await this.auditLogsService.getDistinctActions(user.workspaceId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Create a custom audit log entry' })
  async createLog(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      action: string;
      resource: string;
      resourceId?: string;
      details?: Record<string, any>;
    },
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    return await this.auditLogsService.logAction(user.workspaceId, {
      userId: user.userId,
      action: body.action,
      resource: body.resource,
      resourceId: body.resourceId,
      details: body.details,
      ipAddress,
      userAgent,
    });
  }
}
