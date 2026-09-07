import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { ProgramAdminListResponse, ProgramAdminVersionResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { CreateProgramDto, RequestDraftDto } from "./dto/authoring.dto";
import { ProgramAuthoringService } from "./program-authoring.service";

/** Admin authoring API for the hybrid content pipeline (school_admin gated). */
@Controller("admin/programs")
export class ProgramAuthoringController {
  constructor(private readonly authoring: ProgramAuthoringService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Post()
  create(@Req() request: Request, @Body() body: CreateProgramDto): Promise<{ id: string; slug: string }> {
    return this.authoring.createProgram(this.token(request), body);
  }

  @Get()
  list(@Req() request: Request): Promise<ProgramAdminListResponse> {
    return this.authoring.listPrograms(this.token(request));
  }

  @Post(":id/draft")
  draft(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: RequestDraftDto
  ): Promise<{ queued: boolean }> {
    return this.authoring.requestDraft(this.token(request), id, body.durationDays);
  }

  @Get("versions/:versionId")
  version(@Req() request: Request, @Param("versionId") versionId: string): Promise<ProgramAdminVersionResponse> {
    return this.authoring.getVersion(this.token(request), versionId);
  }

  @Post("versions/:versionId/submit-review")
  submitReview(@Req() request: Request, @Param("versionId") versionId: string): Promise<{ ok: true }> {
    return this.authoring.submitForReview(this.token(request), versionId);
  }

  @Post("versions/:versionId/publish")
  publish(@Req() request: Request, @Param("versionId") versionId: string): Promise<{ ok: true }> {
    return this.authoring.publish(this.token(request), versionId);
  }
}
