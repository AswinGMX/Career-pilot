import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import type { GenerateProgramDraftJobPayload, JobEnvelope } from "@career-pilot/types";

import { ProgramAuthoringService } from "../programs/program-authoring.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { JobProcessorRegistry } from "./job-processor.registry";

/** Worker processor that generates an AI program draft. */
@Injectable()
export class ProgramDraftProcessor implements OnModuleInit {
  private readonly logger = new Logger(ProgramDraftProcessor.name);

  constructor(
    private readonly registry: JobProcessorRegistry,
    private readonly authoring: ProgramAuthoringService
  ) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.aiDraft, JOB_NAMES.generateProgramDraft, async (job: Job) => {
      const { programId } = (job.data as JobEnvelope<GenerateProgramDraftJobPayload>).payload;
      this.logger.log(`Generating AI draft for program ${programId}...`);
      await this.authoring.applyDraft(programId);
      return { programId, drafted: true };
    });
  }
}
