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
  type Relation,
} from 'typeorm';
import type { WorkspaceEntity } from './workspace.entity.js';
import type { AssistantEntity } from './assistant.entity.js';
import type { MessageEntity } from './message.entity.js';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne('WorkspaceEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Index()
  @Column({ type: 'uuid' })
  assistantId: string;

  @ManyToOne('AssistantEntity', 'conversations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assistantId' })
  assistant: Relation<AssistantEntity>;

  @Column({ type: 'uuid', nullable: true })
  chatLinkId: string | null;

  @Column({ type: 'varchar', length: 255, default: 'New Conversation' })
  title: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany('MessageEntity', 'conversation')
  messages: Relation<MessageEntity>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
