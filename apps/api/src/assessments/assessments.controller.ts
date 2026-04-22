import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { GenerateQuestionsResponse, ProofSessionListResponse, ProofSessionResponse, SubmitProfileAssessmentResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { AssessmentsService } from "./assessments.service";
import { StartProofSessionDto } from "./dto/start-proof-session.dto";
import { SubmitProfileAssessmentDto } from "./dto/submit-profile-assessment.dto";
import { SubmitProofSessionDto } from "./dto/submit-proof-session.dto";

@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {
    this.generateQuestions = this.generateQuestions.bind(this);
    this.scoreProfileAssessment = this.scoreProfileAssessment.bind(this);
    this.startProofSession = this.startProofSession.bind(this);
    this.submitProofSession = this.submitProofSession.bind(this);
    this.listProofSessions = this.listProofSessions.bind(this);
    this.getProofSession = this.getProofSession.bind(this);
  }

  @Post("generate-questions")
  generateQuestions(@Req() request: Request): Promise<GenerateQuestionsResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.generateQuestionsFromProfile(token);
  }

  @Post("score-profile-assessment")
  scoreProfileAssessment(
    @Req() request: Request,
    @Body() body: SubmitProfileAssessmentDto
  ): Promise<SubmitProfileAssessmentResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.scoreProfileAssessment(token, body.questions, body.answers);
  }

  @Post("proof-sessions")
  startProofSession(@Req() request: Request, @Body() body: StartProofSessionDto): Promise<ProofSessionResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.startProofSession(token, body.careerSlug);
  }

  @Post("proof-sessions/:id/answers")
  submitProofSession(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: SubmitProofSessionDto
  ): Promise<ProofSessionResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.submitProofSession(token, id, body.answers);
  }

  @Get("proof-sessions")
  listProofSessions(@Req() request: Request): Promise<ProofSessionListResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.listProofSessions(token);
  }

  @Get("proof-sessions/:id")
  getProofSession(@Req() request: Request, @Param("id") id: string): Promise<ProofSessionResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.assessmentsService.getProofSession(token, id);
  }
}
