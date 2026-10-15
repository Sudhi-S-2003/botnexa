import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  ManyToMany,
  JoinTable,
  type Relation,
} from 'typeorm';
import type { WorkspaceEntity } from './workspace.entity.js';
import type { ContextEntity } from './context.entity.js';
import type { ChatLinkEntity } from './chat-link.entity.js';
import type { ConversationEntity } from './conversation.entity.js';
import type {
  AssistantStatus,
  AssistantAccessPolicy,
  ModelParameters,
} from '../types/assistant.type.js';

@Entity('assistants')
export class AssistantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne('WorkspaceEntity', 'assistants', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', default: 'Hello! How can I help you today?' })
  welcomeMessage: string;

  @Column({ type: 'text', default: 'You are a helpful and accurate AI assistant.' })
  systemPrompt: string;

  @Column({ type: 'varchar', length: 50, default: 'gemini' })
  provider: string;

  @Column({ type: 'varchar', length: 100, default: 'gemini-3.5-flash-lite' })
  model: string;

  @Column({ type: 'jsonb', default: {} })
  modelParameters: ModelParameters;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  })
  status: AssistantStatus;

  @Column({
    type: 'enum',
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PRIVATE',
  })
  accessPolicy: AssistantAccessPolicy;

  @Column({ type: 'jsonb', default: [] })
  allowedDomains: string[];

  @Column({ type: 'int', default: 30 })
  rateLimitPerMinute: number;

  @Column({ type: 'int', default: 500000 })
  dailyTokenLimit: number;

  @Column({ type: 'bigint', default: 0 })
  spendingLimitMinorUnits: number;

  @ManyToMany('ContextEntity', 'assistants')
  @JoinTable({
    name: 'assistant_contexts',
    joinColumn: { name: 'assistantId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contextId', referencedColumnName: 'id' },
  })
  contexts: Relation<ContextEntity>[];

  @OneToMany('ChatLinkEntity', 'assistant')
  chatLinks: Relation<ChatLinkEntity>[];

  @OneToMany('ConversationEntity', 'assistant')
  conversations: Relation<ConversationEntity>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
