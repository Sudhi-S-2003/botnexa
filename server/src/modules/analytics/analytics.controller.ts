import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Analytics & Reporting')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get workspace high-level aggregated operational metrics' })
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    return await this.analyticsService.getOverview(user.workspaceId);
  }

  @Get('usage-chart')
  @ApiOperation({ summary: 'Get daily token and request consumption breakdown' })
  async getDailyUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    const daysCount = days ? Math.min(Math.max(Number(days), 1), 90) : 7;
    return await this.analyticsService.getDailyUsage(user.workspaceId, daysCount);
  }
}
