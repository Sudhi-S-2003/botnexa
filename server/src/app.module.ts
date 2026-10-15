import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './database/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { AssistantsModule } from './modules/assistants/assistants.module.js';
import { ContextsModule } from './modules/contexts/contexts.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { ChatLinksModule } from './modules/chat-links/chat-links.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    WorkspacesModule,
    AssistantsModule,
    ContextsModule,
    AiModule,
    WalletModule,
    ChatModule,
    ChatLinksModule,
    ApiKeysModule,
    AnalyticsModule,
    AuditLogsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
