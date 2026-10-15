import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextsController } from './contexts.controller.js';
import { ContextsService } from './contexts.service.js';
import { TextChunkerService } from './services/text-chunker.service.js';
import { RetrievalService } from './services/retrieval.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ContextEntity } from '../../entities/context.entity.js';
import { ContextChunkEntity } from '../../entities/context-chunk.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContextEntity, ContextChunkEntity]),
    AuthModule,
    AiModule,
  ],
  controllers: [ContextsController],
  providers: [ContextsService, TextChunkerService, RetrievalService],
  exports: [ContextsService, RetrievalService, TextChunkerService],
})
export class ContextsModule {}
