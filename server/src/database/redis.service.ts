import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected: boolean = false;

  // In-memory fallback map if Redis is not running or unreachable
  private readonly memoryStore = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ||
      `redis://${this.configService.get<string>('REDIS_HOST', 'localhost')}:${this.configService.get<string>('REDIS_PORT', '6379')}`;

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 3000,
        retryStrategy: (times) => {
          if (times > 3) return null; // stop reconnect spam if Redis is absent
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis instance at ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Keep logs clean: only warn about Redis downtime, don't crash
        this.logger.warn(`Redis connection unavailable (${err.message}). Using memory fallback.`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Redis initial connect failed (${err.message}). Memory fallback active.`);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization error. Operating in memory fallback mode.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore on shutdown
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fallback to memory
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fallback to memory
      }
    }

    this.memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // fallback to memory
      }
    }
    this.memoryStore.delete(key);
  }

  /**
   * Distributed fixed-window rate limiter
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number = 60,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;

    if (this.isConnected && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, windowSeconds);
        }
        const remaining = Math.max(0, limit - count);
        return { allowed: count <= limit, remaining };
      } catch {
        // fallback to memory below
      }
    }

    // In-memory fallback
    const current = Number(this.memoryStore.get(key)?.value || '0') + 1;
    this.memoryStore.set(key, {
      value: String(current),
      expiresAt: Date.now() + windowSeconds * 1000,
    });
    const remaining = Math.max(0, limit - current);
    return { allowed: current <= limit, remaining };
  }

  async isHealthy(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
