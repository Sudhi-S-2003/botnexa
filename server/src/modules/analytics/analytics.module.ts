import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { UsageRecordEntity } from '../../entities/usage-record.entity.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ContextChunkEntity } from '../../entities/context-chunk.entity.js';
import { ConversationEntity } from '../../entities/conversation.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageRecordEntity,
      AssistantEntity,
      ContextChunkEntity,
      ConversationEntity,
      WalletEntity,
    ]),
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
