import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      message?: string;
    };
  };
}

/**
 * Service to assess application health and database readiness.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks database connectivity and system status.
   *
   * @returns Health status object
   */
  async checkHealth(): Promise<HealthStatus> {
    const start = Date.now();
    let dbStatus: 'up' | 'down' = 'up';
    let dbLatency: number | undefined;
    let dbMessage: string | undefined;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbLatency = Date.now() - start;
    } catch (err: any) {
      dbStatus = 'down';
      dbMessage = err.message;
      this.logger.error('Database health check failed', err);
    }

    const overallStatus: 'ok' | 'error' = dbStatus === 'up' ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          ...(dbMessage ? { message: dbMessage } : {}),
        },
      },
    };
  }
}
