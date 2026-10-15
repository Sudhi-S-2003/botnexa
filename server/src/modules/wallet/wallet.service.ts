import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { WalletTransactionEntity } from '../../entities/wallet-transaction.entity.js';
import { BillingReservationEntity } from '../../entities/billing-reservation.entity.js';
import { UsageRecordEntity } from '../../entities/usage-record.entity.js';
import { PricingService } from './pricing.service.js';
import type { WalletBalanceSummary } from '../../types/wallet.type.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly txRepo: Repository<WalletTransactionEntity>,
    @InjectRepository(BillingReservationEntity)
    private readonly reservationRepo: Repository<BillingReservationEntity>,
    @InjectRepository(UsageRecordEntity)
    private readonly usageRepo: Repository<UsageRecordEntity>,
    private readonly pricingService: PricingService,
    private readonly dataSource: DataSource,
  ) {}

  async getBalance(workspaceId: string): Promise<WalletBalanceSummary> {
    let wallet = await this.walletRepo.findOne({ where: { workspaceId } });
    if (!wallet) {
      wallet = this.walletRepo.create({
        workspaceId,
        currency: 'INR',
        balance: 0,
        reservedAmount: 0,
        status: 'ACTIVE',
      });
      wallet = await this.walletRepo.save(wallet);
    }

    const total = Number(wallet.balance || 0);
    const reserved = Number(wallet.reservedAmount || 0);
    const available = Math.max(0, total - reserved);

    let lifetimeSpent = 0;
    try {
      const usageSum = await this.usageRepo
        .createQueryBuilder('usage')
        .select('COALESCE(SUM(usage.customerChargeMinorUnits), 0)', 'total')
        .where('usage.workspaceId = :workspaceId', { workspaceId })
        .getRawOne();
      lifetimeSpent = Number(usageSum?.total || 0);
    } catch {
      lifetimeSpent = 0;
    }

    return {
      id: wallet.id,
      workspaceId,
      currency: wallet.currency,
      balance: total,
      reservedAmount: reserved,
      availableBalance: available,
      lifetimeSpent,
      status: wallet.status || 'ACTIVE',
      totalBalanceMinorUnits: total,
      reservedAmountMinorUnits: reserved,
      availableBalanceMinorUnits: available,
      formattedTotal: `₹${(total / 100).toFixed(2)}`,
      formattedAvailable: `₹${(available / 100).toFixed(2)}`,
    };
  }

  async creditWallet(
    workspaceId: string,
    amountMinorUnits: number,
    referenceId: string,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey || `credit-${workspaceId}-${Date.now()}`;

    // Prevent duplicate credit via idempotency key
    const existingTx = await this.txRepo.findOne({ where: { idempotencyKey: key } });
    if (existingTx) {
      return { success: true, message: 'Transaction already processed', transaction: existingTx };
    }

    return await this.dataSource.transaction(async (manager) => {
      // Row lock the wallet
      const wallets: WalletEntity[] = await manager.query(
        `SELECT * FROM wallets WHERE "workspaceId" = $1 FOR UPDATE`,
        [workspaceId],
      );

      let wallet = wallets[0];
      if (!wallet) {
        wallet = manager.create(WalletEntity, {
          workspaceId,
          currency: 'INR',
          balance: 0,
          reservedAmount: 0,
          status: 'ACTIVE',
        });
        wallet = await manager.save(wallet);
      }

      const newBalance = Number(wallet.balance) + amountMinorUnits;
      await manager.query(
        `UPDATE wallets SET "balance" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [newBalance, wallet.id],
      );

      const tx = manager.create(WalletTransactionEntity, {
        workspaceId,
        walletId: wallet.id,
        type: 'CREDIT',
        amountMinorUnits,
        currency: wallet.currency || 'INR',
        referenceId,
        idempotencyKey: key,
        metadata: {
          topupAt: new Date().toISOString(),
          openingBalance: Number(wallet.balance),
          balanceAfter: newBalance,
          description: `Wallet top-up (+₹${(amountMinorUnits / 100).toFixed(2)})`,
          status: 'succeeded',
        },
      });
      const savedTx = await manager.save(tx);

      return {
        success: true,
        newBalanceMinorUnits: newBalance,
        formattedNewBalance: `₹${(newBalance / 100).toFixed(2)}`,
        transaction: savedTx,
      };
    });
  }

  /**
   * Concurrency-safe atomic reservation using row locking (SELECT ... FOR UPDATE)
   */
  async reserveFunds(
    workspaceId: string,
    assistantId: string,
    requestId: string,
    estimatedCostMinorUnits: number,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const wallets: WalletEntity[] = await manager.query(
        `SELECT * FROM wallets WHERE "workspaceId" = $1 FOR UPDATE`,
        [workspaceId],
      );

      const wallet = wallets[0];
      if (!wallet) {
        throw new NotFoundException('Wallet not found for this workspace');
      }

      const balance = Number(wallet.balance);
      const reserved = Number(wallet.reservedAmount);
      const available = balance - reserved;

      if (available < estimatedCostMinorUnits) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ₹${(available / 100).toFixed(2)}, required: ₹${(estimatedCostMinorUnits / 100).toFixed(2)}`,
        );
      }

      // Lock reservation funds
      const newReserved = reserved + estimatedCostMinorUnits;
      await manager.query(
        `UPDATE wallets SET "reservedAmount" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [newReserved, wallet.id],
      );

      // Create reservation record
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute reservation expiry
      const reservation = manager.create(BillingReservationEntity, {
        workspaceId,
        assistantId,
        requestId,
        reservedAmountMinorUnits: estimatedCostMinorUnits,
        status: 'PENDING',
        expiresAt,
      });

      return await manager.save(reservation);
    });
  }

  /**
   * Concurrency-safe atomic settlement deducting actual usage and releasing reserved amount
   */
  async settleReservation(
    requestId: string,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
    model: string,
    provider: string,
    conversationId?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(BillingReservationEntity, {
        where: { requestId, status: 'PENDING' },
      });

      if (!reservation) {
        this.logger.warn(`No pending reservation found for request ${requestId} during settlement`);
        return;
      }

      // Calculate actual charge
      const { customerCharge, providerCost, pricingVersion } =
        await this.pricingService.calculateCharge(
          provider,
          model,
          usage.inputTokens,
          usage.outputTokens,
        );

      // Lock wallet row for settlement
      const wallets: WalletEntity[] = await manager.query(
        `SELECT * FROM wallets WHERE "workspaceId" = $1 FOR UPDATE`,
        [reservation.workspaceId],
      );

      const wallet = wallets[0];
      if (wallet) {
        const currentBalance = Number(wallet.balance);
        const currentReserved = Number(wallet.reservedAmount);
        const reservationAmount = Number(reservation.reservedAmountMinorUnits);

        // Deduct actual customer charge, release reserved amount
        const newBalance = Math.max(0, currentBalance - customerCharge);
        const newReserved = Math.max(0, currentReserved - reservationAmount);

        await manager.query(
          `UPDATE wallets SET "balance" = $1, "reservedAmount" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
          [newBalance, newReserved, wallet.id],
        );

        // Mark reservation settled
        reservation.status = 'SETTLED';
        await manager.save(reservation);

        // Record debit transaction
        const tx = manager.create(WalletTransactionEntity, {
          workspaceId: reservation.workspaceId,
          walletId: wallet.id,
          type: 'DEBIT',
          amountMinorUnits: customerCharge,
          currency: wallet.currency || 'INR',
          referenceId: requestId,
          idempotencyKey: `debit-${requestId}`,
          metadata: {
            model,
            tokens: usage.totalTokens,
            openingBalance: currentBalance,
            balanceAfter: newBalance,
            description: `AI inference debit (${model})`,
            chargeFormatted: `₹${(customerCharge / 100).toFixed(4)}`,
            status: 'succeeded',
          },
        });
        await manager.save(tx);

        // Record usage log
        const usageRecord = manager.create(UsageRecordEntity, {
          workspaceId: reservation.workspaceId,
          assistantId: reservation.assistantId,
          conversationId: conversationId || null,
          requestId,
          provider,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          providerCostMinorUnits: providerCost,
          customerChargeMinorUnits: customerCharge,
          pricingVersion,
          status: 'SETTLED',
        });
        await manager.save(usageRecord);

        return {
          success: true,
          customerCharge,
          providerCost,
          newBalance,
          reservedAmount: newReserved,
          requestId,
        };
      }
      return null;
    });
  }

  /**
   * Release reserved funds if downstream AI call failed or timed out
   */
  async releaseReservation(requestId: string) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(BillingReservationEntity, {
          where: { requestId, status: 'PENDING' },
        });

        if (!reservation) return;

        const wallets: WalletEntity[] = await manager.query(
          `SELECT * FROM wallets WHERE "workspaceId" = $1 FOR UPDATE`,
          [reservation.workspaceId],
        );

        const wallet = wallets[0];
        if (wallet) {
          const currentReserved = Number(wallet.reservedAmount);
          const reservationAmount = Number(reservation.reservedAmountMinorUnits);
          const newReserved = Math.max(0, currentReserved - reservationAmount);

          await manager.query(
            `UPDATE wallets SET "reservedAmount" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            [newReserved, wallet.id],
          );

          reservation.status = 'RELEASED';
          await manager.save(reservation);
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to release reservation for ${requestId}: ${err.message}`);
    }
  }

  async getTransactions(workspaceId: string, limit: number = 50) {
    // Fetch chronologically to establish exact ledger opening and closing balances
    const raw = await this.txRepo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });

    let runningBalance = 0;
    const computed = raw.map((tx) => {
      const amt = Number(tx.amountMinorUnits || 0);
      const computedOpening = runningBalance;

      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        runningBalance += amt;
      } else if (tx.type === 'DEBIT') {
        runningBalance = Math.max(0, runningBalance - amt);
      }

      const explicitBalAfter = tx.metadata?.balanceAfter != null ? Number(tx.metadata.balanceAfter) : null;
      const closingBal = explicitBalAfter != null ? explicitBalAfter : runningBalance;
      runningBalance = closingBal;

      const explicitOpening = tx.metadata?.openingBalance != null ? Number(tx.metadata.openingBalance) : computedOpening;
      const reason = tx.metadata?.description || tx.metadata?.reason || tx.referenceId || `${tx.type} transaction`;

      return {
        ...tx,
        amount: amt,
        amountMinorUnits: amt,
        openingBalance: explicitOpening,
        balanceAfter: closingBal,
        closingBalance: closingBal,
        reason,
        status: (tx.metadata?.status as string) || 'succeeded',
        type: tx.type.toLowerCase(),
        rawType: tx.type,
      };
    });

    return computed.reverse().slice(0, limit);
  }

  async getUsageRecords(workspaceId: string, limit: number = 50) {
    return await this.usageRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
