import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Put, Query, Req } from "@nestjs/common";

import type {
  GuidancePlanResponse,
  MentorBrowseResponse,
  MentorMessagesResponse,
  MentorRequestsResponse,
  MentorStudentDetailResponse,
  MentorStudentsResponse,
  StudentMentorsResponse
} from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { BecomeMentorDto } from "./dto/become-mentor.dto";
import { GuidancePlanDto } from "./dto/guidance-plan.dto";
import { RequestMentorDto } from "./dto/request-mentor.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateStepStatusDto } from "./dto/step-status.dto";
import { MentorsService } from "./mentors.service";

@Controller("mentors")
export class MentorsController {
  constructor(private readonly mentorsService: MentorsService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  // ── Student-facing ──
  @Get()
  browse(
    @Req() request: Request,
    @Query("q") q: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined
  ): Promise<MentorBrowseResponse> {
    return this.mentorsService.browseMentors(this.token(request), {
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Post("become")
  become(@Req() request: Request, @Body() body: BecomeMentorDto): Promise<{ ok: true; mentorId: string }> {
    return this.mentorsService.becomeMentor(this.token(request), body);
  }

  @Get("me")
  myMentors(@Req() request: Request): Promise<StudentMentorsResponse> {
    return this.mentorsService.getMyMentors(this.token(request));
  }

  @Post("me/plans/:planId/steps/:stepId/status")
  updateStepStatus(
    @Req() request: Request,
    @Param("planId") planId: string,
    @Param("stepId") stepId: string,
    @Body() body: UpdateStepStatusDto
  ): Promise<GuidancePlanResponse> {
    return this.mentorsService.updateStepStatus(this.token(request), planId, stepId, body.status);
  }

  // ── Messaging (mentor + student of the same accepted mentorship) ──
  @Get("conversations/:requestId/messages")
  messages(@Req() request: Request, @Param("requestId") requestId: string): Promise<MentorMessagesResponse> {
    return this.mentorsService.getMessages(this.token(request), requestId);
  }

  @Post("conversations/:requestId/messages")
  sendMessage(
    @Req() request: Request,
    @Param("requestId") requestId: string,
    @Body() body: SendMessageDto
  ): Promise<MentorMessagesResponse> {
    return this.mentorsService.sendMessage(this.token(request), requestId, body.body);
  }

  // ── Mentor-facing ──
  @Get("requests")
  incomingRequests(@Req() request: Request): Promise<MentorRequestsResponse> {
    return this.mentorsService.listIncomingRequests(this.token(request));
  }

  @Post("requests/:id/accept")
  accept(@Req() request: Request, @Param("id") id: string): Promise<{ ok: true }> {
    return this.mentorsService.respondToRequest(this.token(request), id, true);
  }

  @Post("requests/:id/decline")
  decline(@Req() request: Request, @Param("id") id: string): Promise<{ ok: true }> {
    return this.mentorsService.respondToRequest(this.token(request), id, false);
  }

  @Get("students")
  students(@Req() request: Request): Promise<MentorStudentsResponse> {
    return this.mentorsService.listConnectedStudents(this.token(request));
  }

  @Get("students/:studentUserId")
  student(@Req() request: Request, @Param("studentUserId") studentUserId: string): Promise<MentorStudentDetailResponse> {
    return this.mentorsService.getConnectedStudent(this.token(request), studentUserId);
  }

  @Get("students/:studentUserId/plan")
  getPlan(@Req() request: Request, @Param("studentUserId") studentUserId: string): Promise<GuidancePlanResponse> {
    return this.mentorsService.getGuidancePlan(this.token(request), studentUserId);
  }

  @Put("students/:studentUserId/plan")
  savePlan(
    @Req() request: Request,
    @Param("studentUserId") studentUserId: string,
    @Body() body: GuidancePlanDto
  ): Promise<GuidancePlanResponse> {
    return this.mentorsService.saveGuidancePlan(this.token(request), studentUserId, body);
  }

  // ── Student request (dynamic, declared last to avoid shadowing static routes) ──
  @Post(":mentorProfileId/request")
  requestMentor(
    @Req() request: Request,
    @Param("mentorProfileId") mentorProfileId: string,
    @Body() body: RequestMentorDto
  ): Promise<{ ok: true }> {
    return this.mentorsService.requestMentor(this.token(request), mentorProfileId, body);
  }
}
