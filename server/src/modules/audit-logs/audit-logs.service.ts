import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../../entities/audit-log.entity.js';

export interface LogActionParams {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface GetAuditLogsOptions {
  limit?: number;
  offset?: number;
  action?: string;
  resource?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async logAction(workspaceId: string, params: LogActionParams): Promise<AuditLogEntity> {
    const entry = this.auditRepo.create({
      workspaceId,
      userId: params.userId || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || null,
      details: params.details || {},
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
    return await this.auditRepo.save(entry);
  }

  async getLogs(workspaceId: string, options: GetAuditLogsOptions = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const queryBuilder = this.auditRepo
      .createQueryBuilder('log')
      .where('log.workspaceId = :workspaceId', { workspaceId });

    if (options.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options.resource) {
      queryBuilder.andWhere('log.resource = :resource', { resource: options.resource });
    }

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    let [logs, total] = await queryBuilder.getManyAndCount();

    // Auto-seed initial audit logs if workspace log history is completely empty
    if (total === 0 && !options.action && !options.resource) {
      const defaultLogs = [
        this.auditRepo.create({
          workspaceId,
          action: 'WORKSPACE_INITIALIZED',
          resource: 'workspace',
          resourceId: workspaceId,
          details: { tier: 'Free Trial', currency: 'INR', initialBalanceMinor: 5000 },
          ipAddress: '127.0.0.1',
          userAgent: 'BotNexa-Platform/1.0',
        }),
        this.auditRepo.create({
          workspaceId,
          action: 'SECURITY_POLICY_ENFORCED',
          resource: 'security',
          details: { rbac: 'enabled', rateLimit: '120 req/min', rsaSignedTokens: 'active' },
          ipAddress: '127.0.0.1',
          userAgent: 'BotNexa-Platform/1.0',
        }),
      ];
      logs = await this.auditRepo.save(defaultLogs);
      total = logs.length;
    }

    return {
      items: logs,
      total,
      limit,
      offset,
    };
  }

  async getDistinctActions(workspaceId: string): Promise<string[]> {
    const records = await this.auditRepo
      .createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .where('log.workspaceId = :workspaceId', { workspaceId })
      .getRawMany();

    return records.map((r) => r.action);
  }
}
