import type { QueueName } from "@career-pilot/types";

/**
 * Injection token for the shared ioredis connection used by queue producers.
 * Workers create their own dedicated (blocking) connections.
 */
export const REDIS_CONNECTION = Symbol("REDIS_CONNECTION");

/**
 * Injection token for the request-path Redis connection (rate limiting, health
 * probes). Configured to fail fast so a Redis outage surfaces as a rejected
 * command the caller can degrade on, instead of a request that hangs forever.
 * Kept separate from {@link REDIS_CONNECTION}, which BullMQ requires to retry
 * indefinitely for its blocking commands.
 */
export const REDIS_COMMAND_CONNECTION = Symbol("REDIS_COMMAND_CONNECTION");

export const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

export const QUEUE_NAMES = {
  transcoding: "transcoding",
  evaluation: "evaluation",
  scheduling: "scheduling",
  notifications: "notifications",
  aiDraft: "ai-draft",
  reports: "reports"
} as const satisfies Record<string, QueueName>;

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES);

/** BullMQ job names (a queue can carry several named jobs). */
export const JOB_NAMES = {
  ping: "diagnostics.ping",
  generateStudentReport: "report.student.generate",
  generateSchoolReport: "report.school.generate",
  deliverNotification: "notification.deliver",
  transcodeMedia: "media.transcode",
  evaluateSubmission: "evaluation.run",
  evaluateEnrollment: "evaluation.enrollment.final",
  generateProgramDraft: "program.draft.generate",
  unlockEnrollmentDay: "enrollment.day.unlock"
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
