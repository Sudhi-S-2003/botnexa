import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as Entities from '../entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const databaseUrl = config.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: Object.values(Entities),
            synchronize: !isProduction, // auto-sync schema in dev/test
            ssl: config.get<string>('POSTGRES_SSL') === 'true' ? { rejectUnauthorized: false } : false,
            logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('POSTGRES_HOST', 'localhost'),
          port: config.get<number>('POSTGRES_PORT', 5432),
          username: config.get<string>('POSTGRES_USER', 'postgres'),
          password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
          database: config.get<string>('POSTGRES_DB', 'botnexa'),
          entities: Object.values(Entities),
          synchronize: !isProduction,
          ssl: config.get<string>('POSTGRES_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
        };
      },
    }),
    TypeOrmModule.forFeature(Object.values(Entities)),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      if (this.dataSource.isInitialized) {
        // Automatically initialize pgvector extension on startup
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        this.logger.log('PostgreSQL connected with pgvector extension enabled.');

        // Safely ensure enum contains PROTECTED
        await this.dataSource.query(`
          DO $$ BEGIN
            ALTER TYPE chat_links_mode_enum ADD VALUE IF NOT EXISTS 'PROTECTED';
          EXCEPTION
            WHEN duplicate_object THEN null;
            WHEN undefined_object THEN null;
          END $$;
        `).catch(() => null);
      }
    } catch (err: any) {
      this.logger.warn(`Could not initialize pgvector extension: ${err.message}`);
    }
  }
}
