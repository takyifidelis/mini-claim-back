import { Module } from '@nestjs/common';
import { ClaimPaymentsController } from './claim-payments.controller.js';
import { ClaimPaymentsService } from './claim-payments.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';

@Module({
  controllers: [ClaimPaymentsController],
  providers: [ClaimPaymentsService, ActorProvider],
  exports: [ClaimPaymentsService],
})
export class ClaimPaymentsModule {}
