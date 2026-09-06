import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller.js';
import { ClaimsService } from './claims.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, ActorProvider],
  exports: [ClaimsService],
})
export class ClaimsModule {}
