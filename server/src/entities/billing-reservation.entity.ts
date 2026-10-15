import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { ReservationStatus } from '../types/wallet.type.js';

@Entity('billing_reservations')
export class BillingReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  requestId: string;

  @Index()
  @Column({ type: 'uuid' })
  assistantId: string;

  @Column({ type: 'bigint' })
  reservedAmountMinorUnits: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'SETTLED', 'RELEASED', 'EXPIRED'],
    default: 'PENDING',
  })
  status: ReservationStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
