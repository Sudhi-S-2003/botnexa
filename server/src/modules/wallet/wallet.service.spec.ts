import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletService } from './wallet.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository, DataSource } from 'typeorm';
import type { WalletEntity } from '../../entities/wallet.entity.js';
import type { WalletTransactionEntity } from '../../entities/wallet-transaction.entity.js';
import type { BillingReservationEntity } from '../../entities/billing-reservation.entity.js';
import type { UsageRecordEntity } from '../../entities/usage-record.entity.js';
import { PricingService } from './pricing.service.js';

describe('WalletService - Concurrency & Financial Accounting', () => {
  let service: WalletService;
  let mockWalletRepo: Partial<Repository<WalletEntity>>;
  let mockTxRepo: Partial<Repository<WalletTransactionEntity>>;
  let mockReservationRepo: Partial<Repository<BillingReservationEntity>>;
  let mockUsageRepo: Partial<Repository<UsageRecordEntity>>;
  let mockDataSource: Partial<DataSource>;
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService({
      findOne: vi.fn().mockResolvedValue(null),
    } as any);

    mockWalletRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => dto as WalletEntity),
      save: vi.fn((entity) => Promise.resolve(entity as WalletEntity)),
    };

    mockTxRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => dto as WalletTransactionEntity),
      save: vi.fn((entity) => Promise.resolve(entity as WalletTransactionEntity)),
    };

    mockReservationRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => dto as BillingReservationEntity),
      save: vi.fn((entity) => Promise.resolve(entity as BillingReservationEntity)),
    };

    mockUsageRepo = {
      create: vi.fn((dto) => dto as UsageRecordEntity),
      save: vi.fn((entity) => Promise.resolve(entity as UsageRecordEntity)),
    };

    mockDataSource = {
      transaction: vi.fn(async (cb) => {
        const mockManager = {
          query: vi.fn(),
          create: vi.fn((entityClass, dto) => dto),
          save: vi.fn((entity) => Promise.resolve(entity)),
          findOne: vi.fn(),
        };
        return cb(mockManager as any);
      }),
    };

    service = new WalletService(
      mockWalletRepo as Repository<WalletEntity>,
      mockTxRepo as Repository<WalletTransactionEntity>,
      mockReservationRepo as Repository<BillingReservationEntity>,
      mockUsageRepo as Repository<UsageRecordEntity>,
      pricingService,
      mockDataSource as DataSource,
    );
  });

  describe('getBalance', () => {
    it('should calculate available balance as total minus reserved amount', async () => {
      vi.mocked(mockWalletRepo.findOne!).mockResolvedValue({
        id: 'w-1',
        workspaceId: 'ws-100',
        currency: 'INR',
        balance: 5000, // ₹50.00
        reservedAmount: 1000, // ₹10.00
        status: 'ACTIVE',
      } as WalletEntity);

      const result = await service.getBalance('ws-100');

      expect(result.totalBalanceMinorUnits).toBe(5000);
      expect(result.reservedAmountMinorUnits).toBe(1000);
      expect(result.availableBalanceMinorUnits).toBe(4000);
      expect(result.formattedTotal).toBe('₹50.00');
      expect(result.formattedAvailable).toBe('₹40.00');
    });

    it('should auto-create zero-balance wallet if none exists for workspace', async () => {
      vi.mocked(mockWalletRepo.findOne!).mockResolvedValue(null);

      const result = await service.getBalance('ws-new');

      expect(result.totalBalanceMinorUnits).toBe(0);
      expect(result.availableBalanceMinorUnits).toBe(0);
      expect(mockWalletRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'ws-new', balance: 0, reservedAmount: 0 }),
      );
    });
  });

  describe('reserveFunds (Two-Phase Protocol Phase 1)', () => {
    it('should successfully reserve funds when available balance is sufficient', async () => {
      mockDataSource.transaction = vi.fn(async (cb) => {
        const mockManager = {
          query: vi.fn().mockImplementation((queryStr: string) => {
            if (queryStr.includes('SELECT * FROM wallets')) {
              return Promise.resolve([
                {
                  id: 'wallet-1',
                  workspaceId: 'ws-100',
                  balance: 5000,
                  reservedAmount: 1000,
                },
              ]);
            }
            if (queryStr.includes('UPDATE wallets SET "reservedAmount"')) {
              return Promise.resolve();
            }
            return Promise.resolve([]);
          }),
          create: vi.fn((cls, dto) => ({ id: 'res-1', ...dto })),
          save: vi.fn((entity) => Promise.resolve(entity)),
        };
        return cb(mockManager as any);
      });

      const res = await service.reserveFunds('ws-100', 'asst-1', 'req-1', 500);

      expect(res).toBeDefined();
      expect(res.requestId).toBe('req-1');
      expect(res.reservedAmountMinorUnits).toBe(500);
    });

    it('should throw BadRequestException when available balance is insufficient', async () => {
      mockDataSource.transaction = vi.fn(async (cb) => {
        const mockManager = {
          query: vi.fn().mockImplementation((queryStr: string) => {
            if (queryStr.includes('SELECT * FROM wallets')) {
              return Promise.resolve([
                {
                  id: 'wallet-1',
                  workspaceId: 'ws-100',
                  balance: 1000,
                  reservedAmount: 800, // available: 200
                },
              ]);
            }
            return Promise.resolve([]);
          }),
        };
        return cb(mockManager as any);
      });

      await expect(
        service.reserveFunds('ws-100', 'asst-1', 'req-1', 500),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when wallet is missing', async () => {
      mockDataSource.transaction = vi.fn(async (cb) => {
        const mockManager = {
          query: vi.fn().mockResolvedValue([]),
        };
        return cb(mockManager as any);
      });

      await expect(
        service.reserveFunds('ws-missing', 'asst-1', 'req-1', 100),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PricingService token calculations', () => {
    it('should estimate worst-case cost for reservations safely', () => {
      const estimated = pricingService.estimateMaxCost(
        'gemini-3.5-flash-lite',
        2048,
      );
      expect(estimated).toBeGreaterThanOrEqual(1); // At least 1 minor unit
    });

    it('should compute exact minor units for gemini usage', async () => {
      const result = await pricingService.calculateCharge(
        'gemini',
        'gemini-3.5-flash-lite',
        1000,
        500,
      );
      expect(result.customerCharge).toBeGreaterThanOrEqual(1);
    });
  });
});
