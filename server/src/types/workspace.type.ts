import { UserRole } from './auth.type.js';

export interface WorkspaceSettings {
  defaultCurrency?: 'INR' | 'USD';
  allowedDomains?: string[];
  maxMonthlyBudgetMinorUnits?: number;
  lowBalanceThresholdMinorUnits?: number;
  enableAuditLogs?: boolean;
}

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  joinedAt: Date;
}
