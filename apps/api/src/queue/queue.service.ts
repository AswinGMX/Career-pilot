import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import type { Redis } from "ioredis";

import type { JobEnvelope, QueueName } from "@career-pilot/types";

import { ALL_QUEUE_NAMES, REDIS_CONNECTION } from "./queue.constants";

export interface EnqueueOptions {
  /**
   * Logical de-duplication key. Re-enqueuing the same key while a prior job is
   * still pending is a no-op (BullMQ jobId), making producers idempotent.
   */
  idempotencyKey?: string;
  /** Delay before the job becomes available, in milliseconds. */
  delayMs?: number;
}

/**
 * Producer-side queue access. Enqueue calls NEVER throw to the caller: a queue
 * outage must not break the HTTP request path. Callers inspect the boolean
 * result and decide whether to fall back or surface a degraded state.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, Queue>();

  constructor(@Inject(REDIS_CONNECTION) private readonly connection: Redis) {
    for (const name of ALL_QUEUE_NAMES) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: this.connection,
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 2_000 },
            removeOnComplete: { age: 3_600, count: 1_000 },
            removeOnFail: { age: 24 * 3_600 }
          }
        })
      );
    }
  }

  async enqueue<TPayload>(
    queue: QueueName,
    jobName: string,
    payload: TPayload,
    options: EnqueueOptions = {}
  ): Promise<boolean> {
    const target = this.queues.get(queue);
    if (!target) {
      this.logger.error(`Unknown queue "${queue}" for job "${jobName}".`);
      return false;
    }

    const envelope: JobEnvelope<TPayload> = {
      idempotencyKey: options.idempotencyKey,
      enqueuedAt: new Date().toISOString(),
      payload
    };

    try {
      await target.add(jobName, envelope, {
        jobId: options.idempotencyKey,
        delay: options.delayMs
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to enqueue "${jobName}" on "${queue}": ${(err as Error)?.message}`);
      return false;
    }
  }

  /** Lightweight queue depth probe for health checks. Returns null on failure. */
  async countWaiting(queue: QueueName): Promise<number | null> {
    const target = this.queues.get(queue);
    if (!target) {
      return null;
    }
    try {
      return await target.getWaitingCount();
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.queues.values()].map((queue) => queue.close()));
    // BullMQ does not close connections it was handed; close the shared one here
    // so the process can exit cleanly on shutdown/redeploy.
    await this.connection.quit().catch(() => undefined);
  }
}
