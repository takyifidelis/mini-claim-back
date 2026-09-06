import { Module } from '@nestjs/common';
import { ExchangeRateSheetsController } from './exchange-rate-sheets.controller.js';
import { ExchangeRateSheetsService } from './exchange-rate-sheets.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';

@Module({
  controllers: [ExchangeRateSheetsController],
  providers: [ExchangeRateSheetsService, ActorProvider],
  exports: [ExchangeRateSheetsService],
})
export class ExchangeRateSheetsModule {}
