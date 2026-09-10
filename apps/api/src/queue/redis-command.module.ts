import { Global, Module } from "@nestjs/common";
import type { Redis } from "ioredis";

import { REDIS_COMMAND_CONNECTION } from "./queue.constants";
import { RedisCommandLifecycle } from "./redis-command.lifecycle";
import { createRedisCommandConnection } from "./redis.connection";

/**
 * Provides the fail-fast Redis connection used by the HTTP request path (rate
 * limiting, health probes).
 *
 * Kept out of {@link QueueModule} on purpose: the worker process imports that
 * module for its producers, and it has no request path, so it would otherwise
 * hold an idle connection per replica. Global so middleware and health can
 * inject the token without re-importing.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_COMMAND_CONNECTION,
      useFactory: (): Redis => createRedisCommandConnection("commands")
    },
    RedisCommandLifecycle
  ],
  exports: [REDIS_COMMAND_CONNECTION]
})
export class RedisCommandModule {}
