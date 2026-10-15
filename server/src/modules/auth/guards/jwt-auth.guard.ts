import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_JWT_SECRET, type JwtPayload, type AuthenticatedUser } from '../../../types/auth.type.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });

      const authUser: AuthenticatedUser = {
        userId: payload.sub,
        email: payload.email,
        workspaceId: payload.workspaceId || '',
        role: payload.role || 'VIEWER',
      };

      request.user = authUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Fallback: check cookie if present
    if (request.cookies && request.cookies.botnexa_token) {
      return request.cookies.botnexa_token;
    }
    return null;
  }
}
