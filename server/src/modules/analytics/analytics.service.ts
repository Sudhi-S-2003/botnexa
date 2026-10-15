import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UsageRecordEntity } from '../../entities/usage-record.entity.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ContextChunkEntity } from '../../entities/context-chunk.entity.js';
import { ConversationEntity } from '../../entities/conversation.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UsageRecordEntity)
    private readonly usageRepo: Repository<UsageRecordEntity>,
    @InjectRepository(AssistantEntity)
    private readonly assistantRepo: Repository<AssistantEntity>,
    @InjectRepository(ContextChunkEntity)
    private readonly chunkRepo: Repository<ContextChunkEntity>,
    @InjectRepository(ConversationEntity)
    private readonly convRepo: Repository<ConversationEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getOverview(workspaceId: string) {
    const [assistantsCount, chunksCount, conversationsCount, wallet] = await Promise.all([
      this.assistantRepo.count({ where: { workspaceId } }),
      this.chunkRepo.count({ where: { workspaceId } }),
      this.convRepo.count({ where: { workspaceId } }),
      this.walletRepo.findOne({ where: { workspaceId } }),
    ]);

    // Aggregate tokens and costs from usage_records
    const stats = await this.usageRepo
      .createQueryBuilder('u')
      .select('COUNT(u.id)', 'totalQueries')
      .addSelect('COALESCE(SUM(u.totalTokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(u.inputTokens), 0)', 'promptTokens')
      .addSelect('COALESCE(SUM(u.outputTokens), 0)', 'completionTokens')
      .addSelect('COALESCE(SUM(u.customerChargeMinorUnits), 0)', 'totalCostMinor')
      .where('u.workspaceId = :workspaceId', { workspaceId })
      .getRawOne();

    const totalQueries = Number(stats?.totalQueries || 0);
    const totalTokens = Number(stats?.totalTokens || 0);
    const promptTokens = Number(stats?.promptTokens || 0);
    const completionTokens = Number(stats?.completionTokens || 0);
    const totalCostMinor = Number(stats?.totalCostMinor || 0);

    const totalBal = Number(wallet?.balance || 0);
    const reservedBal = Number(wallet?.reservedAmount || 0);
    const availableBal = Math.max(0, totalBal - reservedBal);

    return {
      workspaceId,
      assistantsCount,
      chunksCount,
      conversationsCount,
      totalQueries,
      totalTokens,
      promptTokens,
      completionTokens,
      totalCostMinor,
      totalCostFormatted: `₹${(totalCostMinor / 100).toFixed(2)}`,
      walletBalance: {
        totalMinor: totalBal,
        availableMinor: availableBal,
        reservedMinor: reservedBal,
        formattedAvailable: `₹${(availableBal / 100).toFixed(2)}`,
      },
    };
  }

  async getDailyUsage(workspaceId: string, days: number = 7) {
    const rawData: Array<{
      date: string | Date;
      queries: number;
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      costMinor: number;
    }> = await this.dataSource.query(
      `
      SELECT 
        TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') AS date,
        COUNT(id)::int AS queries,
        COALESCE(SUM("totalTokens"), 0)::int AS "totalTokens",
        COALESCE(SUM("inputTokens"), 0)::int AS "promptTokens",
        COALESCE(SUM("outputTokens"), 0)::int AS "completionTokens",
        COALESCE(SUM("customerChargeMinorUnits"), 0)::int AS "costMinor"
      FROM usage_records
      WHERE "workspaceId" = $1
        AND "createdAt" >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE("createdAt")
      ORDER BY date ASC;
      `,
      [workspaceId, days],
    );

    // Build map of actual database records indexed by date YYYY-MM-DD
    const usageMap = new Map<string, { queries: number; totalTokens: number; promptTokens: number; completionTokens: number; costMinor: number }>();
    if (Array.isArray(rawData)) {
      for (const row of rawData) {
        const dateKey = typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0];
        usageMap.set(dateKey, {
          queries: Number(row.queries || 0),
          totalTokens: Number(row.totalTokens || 0),
          promptTokens: Number(row.promptTokens || 0),
          completionTokens: Number(row.completionTokens || 0),
          costMinor: Number(row.costMinor || 0),
        });
      }
    }

    // Generate unbroken calendar sequence for requested time window
    const timeline = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const match = usageMap.get(dateKey);
      timeline.push({
        date: dateKey,
        queries: match ? match.queries : 0,
        totalTokens: match ? match.totalTokens : 0,
        promptTokens: match ? match.promptTokens : 0,
        completionTokens: match ? match.completionTokens : 0,
        costMinor: match ? match.costMinor : 0,
      });
    }

    return timeline;
  }
}
