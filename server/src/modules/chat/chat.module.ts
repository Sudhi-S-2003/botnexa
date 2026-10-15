import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ContextsModule } from '../contexts/contexts.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ConversationEntity } from '../../entities/conversation.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssistantEntity, ConversationEntity, MessageEntity]),
    AuthModule,
    AiModule,
    ContextsModule,
    WalletModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
