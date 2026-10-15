import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pricing_configs')
export class PricingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  provider: string; // 'gemini' | 'openai' | 'anthropic'

  @Index()
  @Column({ type: 'varchar', length: 100 })
  model: string; // e.g. 'gemini-3.5-flash-lite'

  // Cost in minor units per 1,000,000 tokens (e.g. 1000 = ₹10.00 / 1M tokens)
  @Column({ type: 'bigint' })
  inputTokenCostPerMillion: number;

  @Column({ type: 'bigint' })
  outputTokenCostPerMillion: number;

  @Column({ type: 'int', default: 20 })
  platformMarkupPercent: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  effectiveFrom: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
