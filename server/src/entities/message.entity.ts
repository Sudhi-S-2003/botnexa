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
import type { ConversationEntity } from './conversation.entity.js';
import type { MessageRole } from '../types/ai.type.js';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Index()
  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne('ConversationEntity', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Relation<ConversationEntity>;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system'],
    default: 'user',
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  @Column({ type: 'int', default: 0 })
  latencyMs: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'jsonb', default: [] })
  retrievedSources: Array<{ chunkId: string; content: string; similarity: number }>;

  @CreateDateColumn()
  createdAt: Date;
}
