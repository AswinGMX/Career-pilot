import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import type { EvaluateEnrollmentJobPayload, JobEnvelope } from "@career-pilot/types";

import { EvaluationService } from "../enrollment/evaluation.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { JobProcessorRegistry } from "./job-processor.registry";

/** Worker processor for asynchronous final readiness evaluation. */
@Injectable()
export class EvaluationProcessor implements OnModuleInit {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private readonly registry: JobProcessorRegistry,
    private readonly evaluationService: EvaluationService
  ) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.evaluation, JOB_NAMES.evaluateEnrollment, async (job: Job) => {
      const { enrollmentId } = (job.data as JobEnvelope<EvaluateEnrollmentJobPayload>).payload;
      this.logger.log(`Evaluating enrollment ${enrollmentId}...`);
      await this.evaluationService.runFinalEvaluation(enrollmentId);
      return { enrollmentId, evaluated: true };
    });
  }
}
