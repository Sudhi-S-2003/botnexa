import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
  type Relation,
} from 'typeorm';
import type { WorkspaceMemberEntity } from './workspace-member.entity.js';
import type { AssistantEntity } from './assistant.entity.js';
import type { ContextEntity } from './context.entity.js';
import type { WalletEntity } from './wallet.entity.js';
import type { ApiKeyEntity } from './api-key.entity.js';
import type { WorkspaceSettings } from '../types/workspace.type.js';

@Entity('workspaces')
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'jsonb', default: {} })
  settings: WorkspaceSettings;

  @OneToMany('WorkspaceMemberEntity', 'workspace', { cascade: true })
  members: Relation<WorkspaceMemberEntity>[];

  @OneToMany('AssistantEntity', 'workspace')
  assistants: Relation<AssistantEntity>[];

  @OneToMany('ContextEntity', 'workspace')
  contexts: Relation<ContextEntity>[];

  @OneToOne('WalletEntity', 'workspace')
  wallet: Relation<WalletEntity>;

  @OneToMany('ApiKeyEntity', 'workspace')
  apiKeys: Relation<ApiKeyEntity>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
