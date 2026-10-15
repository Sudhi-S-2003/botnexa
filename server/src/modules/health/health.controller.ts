import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness check' })
  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check verifying database and pgvector' })
  async getReadiness() {
    let dbStatus = 'disconnected';
    let pgvectorStatus = 'unknown';

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';

        const extResult = await this.dataSource.query(
          "SELECT extname FROM pg_extension WHERE extname = 'vector'",
        );
        pgvectorStatus = extResult.length > 0 ? 'enabled' : 'not installed';
      }
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      pgvector: pgvectorStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
