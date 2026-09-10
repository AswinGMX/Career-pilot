import type { Request } from "express";

import { Controller, Get, Post, Req } from "@nestjs/common";

import type { RecommendationLatestResponse, RecommendationRecomputeResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { RecommendationsService } from "./recommendations.service";

@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {
    this.getLatest = this.getLatest.bind(this);
    this.recompute = this.recompute.bind(this);
  }

  @Get("latest")
  getLatest(@Req() request: Request): Promise<RecommendationLatestResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.recommendationsService.getLatest(token);
  }

  @Post("recompute")
  recompute(@Req() request: Request): Promise<RecommendationRecomputeResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.recommendationsService.recompute(token);
  }
}
