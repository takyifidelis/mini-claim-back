import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check application liveness and database readiness' })
  @ApiResponse({ status: 200, description: 'Application health status' })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.checkHealth();
  }
}
