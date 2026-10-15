import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiV1Controller } from './api-v1.controller.js';
import { DeveloperController } from './developer.controller.js';
import { ApiKeysService } from './api-keys.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { AssistantsModule } from '../assistants/assistants.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { ApiKeyEntity } from '../../entities/api-key.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyEntity]),
    AuthModule,
    ChatModule,
    AssistantsModule,
    WalletModule,
  ],
  controllers: [ApiKeysController, ApiV1Controller, DeveloperController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
