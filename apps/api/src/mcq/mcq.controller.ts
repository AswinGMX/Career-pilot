import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { McqSetResponse, McqSetsListResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { GenerateMcqDto } from "./dto/generate-mcq.dto";
import { McqService } from "./mcq.service";

@Controller("mcq")
export class McqController {
  constructor(private readonly mcqService: McqService) {
    this.generate = this.generate.bind(this);
    this.listSets = this.listSets.bind(this);
    this.getSet = this.getSet.bind(this);
  }

  @Post("generate")
  generate(@Req() request: Request, @Body() body: GenerateMcqDto): Promise<McqSetResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.mcqService.generate(token, { subject: body.subject, count: body.count });
  }

  @Get("sets")
  listSets(@Req() request: Request): Promise<McqSetsListResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.mcqService.listSets(token);
  }

  @Get(":id")
  getSet(@Req() request: Request, @Param("id") id: string): Promise<McqSetResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.mcqService.getSet(token, id);
  }
}
