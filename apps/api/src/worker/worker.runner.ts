import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";

import { ALL_QUEUE_NAMES } from "../queue/queue.constants";
import { createRedisConnection } from "../queue/redis.connection";
import { JobProcessorRegistry } from "./job-processor.registry";

/**
 * Spins up one BullMQ {@link Worker} per queue. Each worker gets its own
 * dedicated Redis connection (BullMQ blocking commands must not share a
 * connection). Concurrency is configurable via `WORKER_CONCURRENCY`.
 */
@Injectable()
export class WorkerRunner implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRunner.name);
  private readonly workers: Worker[] = [];
  private readonly connections: Redis[] = [];

  constructor(private readonly registry: JobProcessorRegistry) {}

  start(): void {
    const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

    for (const queue of ALL_QUEUE_NAMES) {
      const connection = createRedisConnection(`worker:${queue}`);
      const worker = new Worker(queue, (job) => this.registry.handle(queue, job), {
        connection,
        concurrency
      });

      worker.on("completed", (job) => {
        this.logger.log(`[${queue}] ${job.name} completed (${job.id}).`);
      });
      worker.on("failed", (job, err) => {
        this.logger.error(`[${queue}] ${job?.name} failed (${job?.id}): ${err?.message}`);
      });

      this.workers.push(worker);
      this.connections.push(connection);
    }

    this.logger.log(`Started ${this.workers.length} queue workers (concurrency ${concurrency}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.workers.map((worker) => worker.close()));
    await Promise.allSettled(this.connections.map((connection) => connection.quit().catch(() => undefined)));
  }
}
