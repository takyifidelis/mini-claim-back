import { Module } from '@nestjs/common';
import { RiskCoversController } from './risk-covers.controller.js';
import { RiskCoversService } from './risk-covers.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';

@Module({
  controllers: [RiskCoversController],
  providers: [RiskCoversService, ActorProvider],
  exports: [RiskCoversService],
})
export class RiskCoversModule {}
