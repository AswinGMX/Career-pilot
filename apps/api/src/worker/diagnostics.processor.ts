import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { JobProcessorRegistry } from "./job-processor.registry";

/**
 * Minimal processor that proves the producer -> Redis -> worker pipeline is
 * wired end to end. Used by health/smoke checks; safe to keep in production.
 */
@Injectable()
export class DiagnosticsProcessor implements OnModuleInit {
  private readonly logger = new Logger(DiagnosticsProcessor.name);

  constructor(private readonly registry: JobProcessorRegistry) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.scheduling, JOB_NAMES.ping, async (job: Job) => {
      const payload = (job.data as { payload?: unknown })?.payload ?? {};
      this.logger.log(`Ping processed: ${JSON.stringify(payload)}`);
      return { pong: true, processedAt: new Date().toISOString() };
    });
  }
}
