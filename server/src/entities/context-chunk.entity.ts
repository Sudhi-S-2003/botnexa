import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import type { ContextEntity } from './context.entity.js';
import { VectorTransformer } from '../database/vector.transformer.js';

@Entity('context_chunks')
export class ContextChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Index()
  @Column({ type: 'uuid' })
  contextId: string;

  @ManyToOne('ContextEntity', 'chunks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contextId' })
  context: Relation<ContextEntity>;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // pgvector vector column (supports 3072 dims for gemini-embedding-001 or 1536/768 dims)
  @Column({
    type: 'text',
    nullable: true,
    transformer: VectorTransformer,
  })
  embedding: number[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
