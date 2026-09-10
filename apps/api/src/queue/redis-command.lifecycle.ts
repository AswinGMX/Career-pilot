import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { Redis } from "ioredis";

import { REDIS_COMMAND_CONNECTION } from "./queue.constants";

/**
 * Owns shutdown of the request-path Redis connection.
 *
 * ioredis instances are plain objects, so a `useFactory` provider cannot carry
 * Nest lifecycle hooks itself. This provider closes the command connection on
 * graceful shutdown so a redeploy does not leak sockets. The producer
 * connection is closed by {@link QueueService}, which must close its queues
 * first — keeping the two owners separate avoids racing that ordering.
 */
@Injectable()
export class RedisCommandLifecycle implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCommandLifecycle.name);

  constructor(@Inject(REDIS_COMMAND_CONNECTION) private readonly connection: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.connection.quit();
    } catch {
      // The connection may already be down; force it closed so the event loop drains.
      this.connection.disconnect();
      this.logger.warn("Redis command connection did not quit cleanly; forced disconnect.");
    }
  }
}
