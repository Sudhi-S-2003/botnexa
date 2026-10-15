export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'EDITOR' | 'VIEWER';

export interface JwtPayload {
  sub: string;
  email: string;
  workspaceId?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  workspaceId: string;
  role: UserRole;
}

export const DEFAULT_JWT_SECRET = 'botnexa_super_secure_jwt_secret_key_2026_xyz987654321';
