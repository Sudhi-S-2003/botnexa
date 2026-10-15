import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { ApiKeyEntity } from '../../entities/api-key.entity.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import type { GeneratedApiKey } from '../../types/api-key.type.js';
import { DEFAULT_JWT_SECRET } from '../../types/auth.type.js';

// Authenticated AES-256-GCM encryption helpers for reversible secure key storage
function encryptSecret(secret: string, masterKey: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(masterKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptSecret(encryptedPayload: string, masterKey: string): string {
  const [ivHex, tagHex, encryptedText] = encryptedPayload.split(':');
  if (!ivHex || !tagHex || !encryptedText) throw new Error('Invalid encrypted payload');
  const key = crypto.createHash('sha256').update(masterKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async createApiKey(workspaceId: string, dto: CreateApiKeyDto): Promise<GeneratedApiKey> {
    // Generate 32 bytes random entropy
    const randomEntropy = crypto.randomBytes(24).toString('hex');
    const rawSecret = `bn_live_${randomEntropy}`;
    const keyPrefix = rawSecret.substring(0, 15);
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    // Encrypt raw secret with server master key for HMAC verification
    const masterKey = this.configService.get<string>('JWT_SECRET') || 'botnexa_super_secure_jwt_secret_key_2026';
    const encryptedSecret = encryptSecret(rawSecret, masterKey);

    const apiKey = this.apiKeyRepo.create({
      workspaceId,
      name: dto.name,
      keyPrefix,
      keyHash,
      encryptedSecret,
      allowedAssistantIds: dto.allowedAssistantIds || [],
      scopes: dto.scopes || ['chat', 'conversations'],
      status: 'ACTIVE',
    });

    const saved = await this.apiKeyRepo.save(apiKey);

    return {
      id: saved.id,
      name: saved.name,
      prefix: saved.keyPrefix,
      keyPrefix: saved.keyPrefix,
      rawSecret, // ONLY exposed here once to caller
      secretKey: rawSecret,
      createdAt: saved.createdAt,
    };
  }

  async getApiKeys(workspaceId: string) {
    const keys = await this.apiKeyRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });

    // Never return hashes or secrets in listing
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      allowedAssistantIds: k.allowedAssistantIds,
      scopes: k.scopes,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeApiKey(workspaceId: string, id: string) {
    const key = await this.apiKeyRepo.findOne({ where: { id, workspaceId } });
    if (!key) throw new NotFoundException('API Key not found');

    key.status = 'REVOKED';
    await this.apiKeyRepo.save(key);
    return { success: true, message: 'API Key revoked successfully' };
  }

  // -------------------------------------------------------------
  // Mode 1: Traditional Raw Secret Verification (Server-to-Server)
  // -------------------------------------------------------------
  async verifyKey(rawSecret: string) {
    const incomingHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const key = await this.apiKeyRepo.findOne({
      where: { keyHash: incomingHash, status: 'ACTIVE' },
    });

    if (!key) {
      throw new UnauthorizedException('Invalid or revoked API Key');
    }

    // Update last used timestamp
    key.lastUsedAt = new Date();
    await this.apiKeyRepo.save(key);

    return {
      workspaceId: key.workspaceId,
      allowedAssistantIds: key.allowedAssistantIds,
      scopes: key.scopes,
      authMethod: 'api_secret',
    };
  }

  // -------------------------------------------------------------
  // Mode 2: HMAC-SHA256 Request Signing Verification (Zero-Secret on Wire)
  // AWS Signature v4 / Stripe Webhook Pattern
  // -------------------------------------------------------------
  async verifyHmac(
    keyIdentifier: string,
    method: string,
    path: string,
    timestampStr: string,
    body: any,
    signature: string,
  ) {
    if (!keyIdentifier || !timestampStr || !signature) {
      throw new UnauthorizedException('HMAC authentication requires x-api-key, x-timestamp, and x-signature headers');
    }

    // 1. Replay attack protection: ensure timestamp is within ±5 minutes (300 seconds)
    const tsNumber = Number(timestampStr);
    const timestampMs = isNaN(tsNumber)
      ? new Date(timestampStr).getTime()
      : tsNumber > 1e11
        ? tsNumber
        : tsNumber * 1000;

    if (isNaN(timestampMs)) {
      throw new UnauthorizedException('Invalid x-timestamp format');
    }

    const skew = Math.abs(Date.now() - timestampMs);
    if (skew > 5 * 60 * 1000) {
      throw new UnauthorizedException('Request timestamp expired or skewed (> 5 minutes). Possible replay attack.');
    }

    // 2. Locate API key by prefix or id or hash
    let key: ApiKeyEntity | null = null;
    if (keyIdentifier.startsWith('bn_live_')) {
      const incomingHash = crypto.createHash('sha256').update(keyIdentifier).digest('hex');
      key = await this.apiKeyRepo.findOne({ where: { keyHash: incomingHash, status: 'ACTIVE' } });
      if (!key) {
        const prefix = keyIdentifier.substring(0, 15);
        key = await this.apiKeyRepo.findOne({ where: { keyPrefix: prefix, status: 'ACTIVE' } });
      }
    } else {
      key = await this.apiKeyRepo.findOne({
        where: [
          { keyPrefix: keyIdentifier, status: 'ACTIVE' },
          { id: keyIdentifier, status: 'ACTIVE' },
        ],
      });
    }

    if (!key) {
      throw new UnauthorizedException('Invalid or inactive API Key for HMAC verification');
    }

    if (!key.encryptedSecret) {
      throw new UnauthorizedException('This API Key was generated before HMAC support. Please generate a new API key in the dashboard.');
    }

    // 3. Decrypt raw secret with master key
    const masterKey = this.configService.get<string>('JWT_SECRET') || 'botnexa_super_secure_jwt_secret_key_2026';
    let secret = '';
    try {
      secret = decryptSecret(key.encryptedSecret, masterKey);
    } catch {
      throw new UnauthorizedException('Failed to decrypt API key secret for HMAC verification');
    }

    // 4. Construct canonical string and compute expected HMAC
    const rawBody =
      typeof body === 'string'
        ? body
        : body && Object.keys(body).length > 0
          ? JSON.stringify(body)
          : '';
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const canonicalString = `${method.toUpperCase()}\n${path}\n${timestampStr}\n${bodyHash}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalString)
      .digest('hex');

    // 5. Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      throw new UnauthorizedException('HMAC signature verification failed. Request content was tampered with or signature is invalid.');
    }

    // 6. Record last used
    key.lastUsedAt = new Date();
    await this.apiKeyRepo.save(key);

    return {
      workspaceId: key.workspaceId,
      allowedAssistantIds: key.allowedAssistantIds,
      scopes: key.scopes,
      authMethod: 'hmac_signature',
    };
  }

  // -------------------------------------------------------------
  // Mode 3: Ephemeral Client Token Verification (React / SPAs / Widgets)
  // OpenAI Realtime / Stripe Client Token Pattern
  // -------------------------------------------------------------
  verifyClientToken(token: string, reqOrigin?: string) {
    const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
    let payload: any;
    try {
      payload = this.jwtService.verify(token, { secret: masterKey });
    } catch {
      throw new UnauthorizedException('Ephemeral client token has expired or signature is invalid');
    }

    // Dashboard User Token support (allows logged-in dashboard users to call developer endpoints directly)
    if (payload.sub && payload.workspaceId && !payload.type) {
      return {
        workspaceId: payload.workspaceId,
        allowedAssistantIds: [],
        scopes: ['*'],
        isDashboardUser: true,
        authMethod: 'dashboard_session_token',
      };
    }

    if (payload.type !== 'client_token' && payload.type !== 'embed_widget') {
      throw new UnauthorizedException('Invalid client token type');
    }

    // Verify allowed origins if set
    if (payload.allowedOrigins && payload.allowedOrigins.length > 0 && reqOrigin) {
      const originMatch = payload.allowedOrigins.some((allowed: string) => {
        return (
          allowed === '*' ||
          reqOrigin.toLowerCase().startsWith(allowed.toLowerCase().replace(/\/$/, ''))
        );
      });
      if (!originMatch) {
        throw new UnauthorizedException(`Client token not authorized for origin: ${reqOrigin}`);
      }
    }

    return {
      workspaceId: payload.workspaceId,
      allowedAssistantIds: [payload.assistantId],
      scopes: ['chat'],
      isClientToken: true,
      authMethod: 'ephemeral_client_token',
    };
  }

  createClientToken(
    workspaceId: string,
    assistantId: string,
    expiresInSeconds = 900,
    allowedOrigins: string[] = [],
  ) {
    const safeExpires = Math.min(Math.max(expiresInSeconds, 60), 86400); // 1 min to 24 hrs
    const payload = {
      type: 'client_token',
      workspaceId,
      assistantId,
      allowedOrigins,
    };

    const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
    const token = this.jwtService.sign(payload, {
      secret: masterKey,
      expiresIn: safeExpires,
    });
    return {
      token,
      assistantId,
      expiresInSeconds: safeExpires,
      expiresAt: new Date(Date.now() + safeExpires * 1000).toISOString(),
    };
  }

  async generateEmbedToken(
    workspaceId: string,
    dto: { assistantId: string; expiresInSeconds?: number; allowedOrigins?: string[] },
  ) {
    const expiresInSeconds = dto.expiresInSeconds || 86400; // 24 hours default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const payload = {
      type: 'embed_widget',
      assistantId: dto.assistantId,
      workspaceId,
      allowedOrigins: dto.allowedOrigins || [],
    };

    const masterKey = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
    const token = this.jwtService.sign(payload, {
      secret: masterKey,
      expiresIn: expiresInSeconds,
    });

    return {
      token,
      tokenType: 'Bearer',
      assistantId: dto.assistantId,
      expiresInSeconds,
      expiresAt,
      allowedOrigins: dto.allowedOrigins || [],
    };
  }
}
