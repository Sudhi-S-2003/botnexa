import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('usage_records')
export class UsageRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Index()
  @Column({ type: 'uuid' })
  assistantId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  conversationId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  requestId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'bigint', nullable: true })
  providerCostMinorUnits: number | null;

  @Column({ type: 'bigint', default: 0 })
  customerChargeMinorUnits: number;

  @Column({ type: 'varchar', length: 50, default: 'v1' })
  pricingVersion: string;

  @Column({ type: 'varchar', length: 50, default: 'SETTLED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
