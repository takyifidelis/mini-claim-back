import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RiskCoversModule } from './modules/risk-covers/risk-covers.module.js';
import { ExchangeRateSheetsModule } from './modules/exchange-rate-sheets/exchange-rate-sheets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    HealthModule,
    RiskCoversModule,
    ExchangeRateSheetsModule,
  ],
})
export class AppModule {}
