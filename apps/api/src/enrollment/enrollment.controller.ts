import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { BlockProgressState } from "@prisma/client";

import type {
  BlockProgressResponse,
  EnrollResponse,
  EnrollmentDayResponse,
  EnrollmentDetailResponse,
  EnrollmentListResponse,
  EnrollmentResultResponse,
  EvidenceUploadInitResponse,
  ProgramOutcomeReportResponse
} from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { CreateEvidenceDto } from "./dto/create-evidence.dto";
import { EnrollDto } from "./dto/enroll.dto";
import { MarkBlockProgressDto } from "./dto/mark-block-progress.dto";
import { EnrollmentService } from "./enrollment.service";

@Controller("enrollments")
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Post()
  enroll(@Req() request: Request, @Body() body: EnrollDto): Promise<EnrollResponse> {
    return this.enrollmentService.enroll(this.token(request), body.programSlug);
  }

  @Get()
  list(@Req() request: Request): Promise<EnrollmentListResponse> {
    return this.enrollmentService.listMyEnrollments(this.token(request));
  }

  @Get(":id")
  detail(@Req() request: Request, @Param("id") id: string): Promise<EnrollmentDetailResponse> {
    return this.enrollmentService.getEnrollment(this.token(request), id);
  }

  @Get(":id/result")
  result(@Req() request: Request, @Param("id") id: string): Promise<EnrollmentResultResponse> {
    return this.enrollmentService.getResult(this.token(request), id);
  }

  @Get(":id/report")
  report(@Req() request: Request, @Param("id") id: string): Promise<ProgramOutcomeReportResponse> {
    return this.enrollmentService.getProgramReport(this.token(request), id);
  }

  @Get(":id/days/:dayIndex")
  day(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("dayIndex") dayIndex: string
  ): Promise<EnrollmentDayResponse> {
    return this.enrollmentService.getEnrollmentDay(this.token(request), id, Number(dayIndex));
  }

  @Post(":id/blocks/:blockId/progress")
  progress(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("blockId") blockId: string,
    @Body() body: MarkBlockProgressDto
  ): Promise<BlockProgressResponse> {
    const state =
      body.state === "completed" ? BlockProgressState.completed : BlockProgressState.in_progress;
    return this.enrollmentService.markBlockProgress(
      this.token(request),
      id,
      blockId,
      state,
      body.interaction ?? null
    );
  }

  @Post(":id/blocks/:blockId/evidence")
  createEvidence(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("blockId") blockId: string,
    @Body() body: CreateEvidenceDto
  ): Promise<EvidenceUploadInitResponse> {
    return this.enrollmentService.createEvidenceUpload(this.token(request), id, blockId, body);
  }

  @Post(":id/blocks/:blockId/evidence/:evidenceId/complete")
  completeEvidence(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("blockId") blockId: string,
    @Param("evidenceId") evidenceId: string
  ): Promise<BlockProgressResponse> {
    return this.enrollmentService.completeEvidence(this.token(request), id, blockId, evidenceId);
  }
}
