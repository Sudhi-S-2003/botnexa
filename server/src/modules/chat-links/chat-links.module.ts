import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLinksController } from './chat-links.controller.js';
import { ChatLinksService } from './chat-links.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { ChatLinkEntity } from '../../entities/chat-link.entity.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { UserEntity } from '../../entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatLinkEntity,
      AssistantEntity,
      WorkspaceEntity,
      WorkspaceMemberEntity,
      UserEntity,
    ]),
    AuthModule,
    ChatModule,
  ],
  controllers: [ChatLinksController],
  providers: [ChatLinksService],
  exports: [ChatLinksService],
})
export class ChatLinksModule {}
