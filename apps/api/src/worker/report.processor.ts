import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";

import type {
  GenerateSchoolReportJobPayload,
  GenerateStudentReportJobPayload,
  JobEnvelope
} from "@career-pilot/types";

import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { ReportsService } from "../reports/reports.service";
import { JobProcessorRegistry } from "./job-processor.registry";

/** Worker processor for asynchronous report generation. */
@Injectable()
export class ReportProcessor implements OnModuleInit {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly registry: JobProcessorRegistry,
    private readonly reportsService: ReportsService
  ) {}

  onModuleInit(): void {
    this.registry.register(QUEUE_NAMES.reports, JOB_NAMES.generateStudentReport, async (job: Job) => {
      const { reportId } = (job.data as JobEnvelope<GenerateStudentReportJobPayload>).payload;
      this.logger.log(`Generating student report ${reportId}...`);
      await this.reportsService.runStudentReportGeneration(reportId);
      return { reportId, status: "ready" };
    });

    this.registry.register(QUEUE_NAMES.reports, JOB_NAMES.generateSchoolReport, async (job: Job) => {
      const { reportId } = (job.data as JobEnvelope<GenerateSchoolReportJobPayload>).payload;
      this.logger.log(`Generating school report ${reportId}...`);
      await this.reportsService.runSchoolReportGeneration(reportId);
      return { reportId, status: "ready" };
    });
  }
}
