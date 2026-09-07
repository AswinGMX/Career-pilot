import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiModule } from "../ai/ai.module";
import { EnrollmentModule } from "../enrollment/enrollment.module";
import { MediaModule } from "../media/media.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProgramsModule } from "../programs/programs.module";
import { QueueModule } from "../queue/queue.module";
import { ReportsModule } from "../reports/reports.module";
import { StorageModule } from "../storage/storage.module";
import { DiagnosticsProcessor } from "./diagnostics.processor";
import { EvaluationProcessor } from "./evaluation.processor";
import { JobProcessorRegistry } from "./job-processor.registry";
import { NotificationProcessor } from "./notification.processor";
import { ProgramDraftProcessor } from "./program-draft.processor";
import { ReportProcessor } from "./report.processor";
import { TranscodeProcessor } from "./transcode.processor";
import { WorkerRunner } from "./worker.runner";

/**
 * Root module for the background worker process. Imports the same feature
 * modules the API uses so processors reuse domain services (Prisma, AI,
 * storage, etc.) via DI — one codebase, two process types.
 *
 * Additional processors (reports, notifications, transcoding, evaluation) are
 * registered here as later phases land.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule,
    PrismaModule,
    QueueModule,
    StorageModule,
    ReportsModule,
    EnrollmentModule,
    NotificationsModule,
    ProgramsModule,
    MediaModule
  ],
  providers: [
    JobProcessorRegistry,
    WorkerRunner,
    DiagnosticsProcessor,
    ReportProcessor,
    EvaluationProcessor,
    NotificationProcessor,
    ProgramDraftProcessor,
    TranscodeProcessor
  ]
})
export class WorkerModule {}
