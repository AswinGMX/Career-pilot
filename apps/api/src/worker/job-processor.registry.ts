import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import type { QueueName } from "@career-pilot/types";

export type JobHandler = (job: Job) => Promise<unknown>;

/**
 * Central registry mapping `(queue, jobName)` to a handler. Feature processors
 * register themselves on init; the {@link WorkerRunner} dispatches incoming
 * jobs through here. Unknown job names are acknowledged (not failed) so that
 * reserved-but-unimplemented queues never accumulate a dead backlog.
 */
@Injectable()
export class JobProcessorRegistry {
  private readonly logger = new Logger(JobProcessorRegistry.name);
  private readonly handlers = new Map<string, JobHandler>();

  register(queue: QueueName, jobName: string, handler: JobHandler): void {
    const key = `${queue}:${jobName}`;
    if (this.handlers.has(key)) {
      this.logger.warn(`Overriding existing handler for ${key}.`);
    }
    this.handlers.set(key, handler);
  }

  async handle(queue: QueueName, job: Job): Promise<unknown> {
    const key = `${queue}:${job.name}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      this.logger.warn(`No processor registered for ${key}; acknowledging without work.`);
      return { skipped: true };
    }
    return handler(job);
  }
}
