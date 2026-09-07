import { Global, Module } from "@nestjs/common";
import type { Redis } from "ioredis";

import { QueueService } from "./queue.service";
import { REDIS_CONNECTION } from "./queue.constants";
import { createRedisConnection } from "./redis.connection";

/**
 * Provides the shared producer Redis connection and the {@link QueueService}.
 * Marked global so any feature module can enqueue without re-importing.
 *
 * The request path uses a different connection with the opposite failure
 * behaviour — see {@link RedisCommandModule}.
 *
 * Imported by both the HTTP API root ({@link AppModule}) and the background
 * {@link WorkerModule}; each process gets its own connection instance.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: (): Redis => createRedisConnection("producer")
    },
    QueueService
  ],
  exports: [QueueService, REDIS_CONNECTION]
})
export class QueueModule {}
