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
import type { WorkspaceEntity } from './workspace.entity.js';
import type { AssistantEntity } from './assistant.entity.js';
import type { ChatLinkMode } from '../types/chat.type.js';

@Entity('chat_links')
export class ChatLinkEntity {
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

  @ManyToOne('AssistantEntity', 'chatLinks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assistantId' })
  assistant: Relation<AssistantEntity>;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({
    type: 'enum',
    enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'],
    default: 'PUBLIC',
  })
  mode: ChatLinkMode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secretToken: string | null;

  @Column({ type: 'jsonb', default: [] })
  allowedOrigins: string[];

  @Column({ type: 'int', default: 30 })
  rateLimitPerMinute: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
