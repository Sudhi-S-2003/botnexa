import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // -----------------------------------------------------------------
    // Mode 1: HMAC-SHA256 Request Signing (Enterprise Zero-Secret Wire Auth)
    // -----------------------------------------------------------------
    const hmacSig = request.headers['x-signature'] as string | undefined;
    const hmacTimestamp = request.headers['x-timestamp'] as string | undefined;
    const hmacApiKey = (request.headers['x-api-key'] || request.headers['x-key-id']) as string | undefined;

    if (hmacSig && hmacTimestamp && hmacApiKey) {
      const method = request.method;
      const path = request.originalUrl || request.url;
      const keyContext = await this.apiKeysService.verifyHmac(
        hmacApiKey,
        method,
        path,
        hmacTimestamp,
        request.body,
        hmacSig,
      );
      request.apiKey = keyContext;
      request.workspaceId = keyContext.workspaceId;
      return true;
    }

    // -----------------------------------------------------------------
    // Mode 2: Ephemeral Scoped Client Token (React / Mobile / Embed Widgets)
    // -----------------------------------------------------------------
    const authHeader = request.headers['authorization'];
    const explicitClientToken = request.headers['x-client-token'] as string | undefined;
    const candidateJwt = explicitClientToken || (
      authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : null
    );

    if (candidateJwt && candidateJwt.split('.').length === 3) {
      try {
        const origin = (request.headers['origin'] || request.headers['referer']) as string | undefined;
        const keyContext = this.apiKeysService.verifyClientToken(candidateJwt, origin);
        request.apiKey = keyContext;
        request.workspaceId = keyContext.workspaceId;
        return true;
      } catch (err: any) {
        // If explicitly a JWT, throw error
        if (candidateJwt.startsWith('ey')) {
          throw err;
        }
      }
    }

    // -----------------------------------------------------------------
    // Mode 3: Traditional Raw API Secret (Server-to-Server)
    // -----------------------------------------------------------------
    let rawKey =
      request.headers['x-api-key'] ||
      request.headers['x-api-secret'] ||
      request.headers['x-developer-secret'];

    if (!rawKey && authHeader) {
      rawKey = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : authHeader.trim();
    }

    // Also allow passing apiKeySecret or apiKey in request body for developer endpoints
    if (!rawKey && request.body) {
      if (typeof request.body.apiKeySecret === 'string') {
        rawKey = request.body.apiKeySecret.trim();
      } else if (typeof request.body.apiKey === 'string') {
        rawKey = request.body.apiKey.trim();
      }
    }

    if (!rawKey) {
      throw new UnauthorizedException(
        'Developer API authentication required. Provide either:\n' +
        '1) HMAC Signature headers (x-api-key, x-timestamp, x-signature)\n' +
        '2) Ephemeral Client Token (Authorization: Bearer <client_token> or x-client-token)\n' +
        '3) API Secret (x-api-secret or x-api-key)'
      );
    }

    const keyContext = await this.apiKeysService.verifyKey(rawKey);
    request.apiKey = keyContext;
    request.workspaceId = keyContext.workspaceId;

    return true;
  }
}
