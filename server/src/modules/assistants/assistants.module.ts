import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantsController } from './assistants.controller.js';
import { AssistantsService } from './assistants.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ContextEntity } from '../../entities/context.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssistantEntity, ContextEntity]),
    AuthModule,
  ],
  controllers: [AssistantsController],
  providers: [AssistantsService],
  exports: [AssistantsService],
})
export class AssistantsModule {}
