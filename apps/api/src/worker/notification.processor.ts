import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import type { DeliverNotificationJobPayload, JobEnvelope } from "@career-pilot/types";

import { NotificationService } from "../notifications/notification.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { JobProcessorRegistry } from "./job-processor.registry";

/** Worker processor that delivers queued email notifications. */
@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly registry: JobProcessorRegistry,
    private readonly notificationService: NotificationService
  ) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.notifications, JOB_NAMES.deliverNotification, async (job: Job) => {
      const { notificationId } = (job.data as JobEnvelope<DeliverNotificationJobPayload>).payload;
      await this.notificationService.deliver(notificationId);
      return { notificationId, delivered: true };
    });
  }
}
