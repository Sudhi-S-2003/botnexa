import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceEntity,
      WorkspaceMemberEntity,
      UserEntity,
      WalletEntity,
    ]),
    AuthModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
