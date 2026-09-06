import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';

@Module({
  controllers: [PoliciesController],
  providers: [PoliciesService, ActorProvider],
  exports: [PoliciesService],
})
export class PoliciesModule {}
