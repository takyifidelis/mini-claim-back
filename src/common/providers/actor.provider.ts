import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Provider responsible for resolving the current actor name/id for audit fields.
 * Currently backed by DEMO_ACTOR_ID configuration, easily swappable with JWT/Auth context.
 */
@Injectable()
export class ActorProvider {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Retrieves the current actor username or identifier.
   * Never trusts client-supplied actor fields.
   */
  getActor(): string {
    const actor = this.configService.get<string>('DEMO_ACTOR_ID');
    return (actor && actor.trim()) ? actor.trim() : 'system_demo_user';
  }
}
