import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  Check,
  type Relation,
} from 'typeorm';
import type { WorkspaceEntity } from './workspace.entity.js';
import type { WalletStatus } from '../types/wallet.type.js';

@Entity('wallets')
@Check(`"balance" >= 0`)
@Check(`"reservedAmount" >= 0`)
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  workspaceId: string;

  @OneToOne('WorkspaceEntity', 'wallet', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  // Stored in integer minor units (paise/cents). 10000 = ₹100.00
  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ type: 'bigint', default: 0 })
  reservedAmount: number;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  })
  status: WalletStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
