import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  type Relation,
} from 'typeorm';
import type { WorkspaceEntity } from './workspace.entity.js';
import type { UserEntity } from './user.entity.js';
import type { UserRole } from '../types/auth.type.js';

@Entity('workspace_members')
@Unique(['workspaceId', 'userId'])
export class WorkspaceMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne('WorkspaceEntity', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne('UserEntity', 'memberships', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @Column({
    type: 'enum',
    enum: ['OWNER', 'ADMIN', 'MEMBER', 'EDITOR', 'VIEWER'],
    default: 'MEMBER',
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
