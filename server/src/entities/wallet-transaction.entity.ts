import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { TransactionType } from '../types/wallet.type.js';

@Entity('wallet_transactions')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Index()
  @Column({ type: 'uuid' })
  walletId: string;

  @Column({
    type: 'enum',
    enum: ['CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'],
  })
  type: TransactionType;

  // Amount in minor currency units (paise/cents)
  @Column({ type: 'bigint' })
  amountMinorUnits: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
