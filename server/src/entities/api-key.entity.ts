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
import type { ApiKeyStatus } from '../types/api-key.type.js';

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne('WorkspaceEntity', 'apiKeys', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  keyPrefix: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  keyHash: string;

  @Column({ type: 'text', nullable: true })
  encryptedSecret: string | null;

  @Column({ type: 'jsonb', default: [] })
  allowedAssistantIds: string[];

  @Column({ type: 'jsonb', default: ['chat', 'conversations'] })
  scopes: string[];

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'REVOKED'],
    default: 'ACTIVE',
  })
  status: ApiKeyStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
