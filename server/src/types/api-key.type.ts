export type ApiKeyStatus = 'ACTIVE' | 'REVOKED';

export interface GeneratedApiKey {
  id: string;
  name: string;
  prefix: string;
  rawSecret: string; // ONLY returned once upon generation
  secretKey?: string;
  keyPrefix?: string;
  createdAt: Date;
}

