export type TransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT';
export type WalletStatus = 'ACTIVE' | 'SUSPENDED';
export type ReservationStatus = 'PENDING' | 'SETTLED' | 'RELEASED' | 'EXPIRED';

export interface WalletBalanceSummary {
  id?: string;
  workspaceId: string;
  currency: string;
  balance?: number;
  reservedAmount?: number;
  availableBalance?: number;
  lifetimeSpent?: number;
  status?: string;
  totalBalanceMinorUnits: number;
  reservedAmountMinorUnits: number;
  availableBalanceMinorUnits: number;
  formattedTotal: string;
  formattedAvailable: string;
}

export interface ReservationResult {
  reservationId: string;
  requestId: string;
  reservedAmount: number;
  status: ReservationStatus;
}
