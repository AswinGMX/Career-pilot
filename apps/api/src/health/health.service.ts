import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Redis } from "ioredis";

import type { HealthCheckState, HealthResponse } from "@career-pilot/types";

import { PrismaService } from "../prisma/prisma.service";
import { REDIS_COMMAND_CONNECTION } from "../queue/queue.constants";

/**
 * Liveness/readiness probe. Every check is bounded in time: a probe that hangs
 * is worse than one that reports `down`, because an orchestrator reads a
 * timeout as "unknown" and can pull every instance at once.
 */
@Injectable()
export class HealthService {
  /** Upper bound for a single dependency check, independent of driver timeouts. */
  private static readonly CHECK_TIMEOUT_MS = 2_000;

  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_COMMAND_CONNECTION) private readonly redis: Redis
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    return {
      ok: database === "up" && redis === "up",
      service: "career-pilot-api",
      checks: { database, redis }
    };
  }

  private async checkDatabase(): Promise<HealthCheckState> {
    return this.probe("database", async () => {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    });
  }

  private async checkRedis(): Promise<HealthCheckState> {
    return this.probe("redis", async () => (await this.redis.ping()) === "PONG");
  }

  /**
   * Runs one dependency check under a hard deadline. The underlying clients are
   * already configured with their own timeouts; this is the backstop for the
   * cases they do not cover (a half-open socket, a driver that swallows its own
   * timeout) so `check()` always answers.
   */
  private async probe(name: string, run: () => Promise<boolean>): Promise<HealthCheckState> {
    let timer: NodeJS.Timeout | undefined;

    try {
      const healthy = await Promise.race([
        run(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${name} check exceeded ${HealthService.CHECK_TIMEOUT_MS}ms`)),
            HealthService.CHECK_TIMEOUT_MS
          );
        })
      ]);

      return healthy ? "up" : "down";
    } catch (err) {
      this.logger.warn(`Health check "${name}" reported down: ${(err as Error)?.message}`);
      return "down";
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
