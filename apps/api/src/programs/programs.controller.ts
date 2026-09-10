import type { Request } from "express";

import { Controller, Get, Param, Req } from "@nestjs/common";

import type { ProgramDetailResponse, ProgramListResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { ProgramsService } from "./programs.service";

/**
 * Catalog read API for published Experience Programs.
 *
 * `list` is public (marketing-level summaries). `detail` requires a session and
 * returns a syllabus outline — see {@link ProgramsService} for what is
 * deliberately withheld until a student enrolls.
 */
@Controller("programs")
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Get()
  list(): Promise<ProgramListResponse> {
    return this.programsService.listPublishedPrograms();
  }

  @Get(":slug")
  detail(@Req() request: Request, @Param("slug") slug: string): Promise<ProgramDetailResponse> {
    return this.programsService.getPublishedProgramBySlug(this.token(request), slug);
  }
}
