import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { PricingService } from './pricing.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { WalletTransactionEntity } from '../../entities/wallet-transaction.entity.js';
import { BillingReservationEntity } from '../../entities/billing-reservation.entity.js';
import { UsageRecordEntity } from '../../entities/usage-record.entity.js';
import { PricingConfigEntity } from '../../entities/pricing-config.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      BillingReservationEntity,
      UsageRecordEntity,
      PricingConfigEntity,
    ]),
    AuthModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, PricingService],
  exports: [WalletService, PricingService],
})
export class WalletModule {}
