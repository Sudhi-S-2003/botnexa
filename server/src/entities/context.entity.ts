import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { WorkspaceEntity } from './workspace.entity.js';
import type { ContextChunkEntity } from './context-chunk.entity.js';
import type { AssistantEntity } from './assistant.entity.js';
import type { ContextType, ContextStatus } from '../types/context.type.js';

@Entity('contexts')
export class ContextEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, (ws) => ws.contexts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['DOCUMENT', 'FAQ', 'TEXT', 'JSON', 'URL'],
    default: 'TEXT',
  })
  type: ContextType;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED', 'DISABLED'],
    default: 'PENDING',
  })
  status: ContextStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'int', default: 0 })
  totalChunks: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany('ContextChunkEntity', 'context')
  chunks: Relation<ContextChunkEntity>[];

  @ManyToMany('AssistantEntity', 'contexts')
  assistants: Relation<AssistantEntity>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
