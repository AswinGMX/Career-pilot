import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import type { JobEnvelope, TranscodeMediaJobPayload } from "@career-pilot/types";

import { MediaService } from "../media/media.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { JobProcessorRegistry } from "./job-processor.registry";

/** Worker processor that transcodes ingested media (stub encoder). */
@Injectable()
export class TranscodeProcessor implements OnModuleInit {
  private readonly logger = new Logger(TranscodeProcessor.name);

  constructor(
    private readonly registry: JobProcessorRegistry,
    private readonly mediaService: MediaService
  ) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.transcoding, JOB_NAMES.transcodeMedia, async (job: Job) => {
      const { mediaAssetId } = (job.data as JobEnvelope<TranscodeMediaJobPayload>).payload;
      await this.mediaService.runTranscode(mediaAssetId);
      return { mediaAssetId, transcoded: true };
    });
  }
}
