import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { MentorRequestStatus, Prisma } from "@prisma/client";

import type {
  BecomeMentorPayload,
  GuidancePlanPayload,
  GuidancePlanRecord,
  GuidancePlanResponse,
  GuidanceStep,
  GuidanceStepStatus,
  MentorBrowseResponse,
  MentorMessagesResponse,
  MentorRequestsResponse,
  MentorStudentDetailResponse,
  MentorStudentsResponse,
  MentorSummary,
  RequestMentorPayload,
  StudentMentorsResponse
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";

type AuthedUser = { id: string; fullName: string; mentorProfileId: string | null };

@Injectable()
export class MentorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService
  ) {}

  // ── Auth helpers ──────────────────────────────────────────────────

  private async requireUser(token: string | undefined): Promise<AuthedUser> {
    const session = await this.authService.getAuthenticatedSession(token);
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }
    return {
      id: session.user.id,
      fullName: session.user.fullName,
      mentorProfileId: session.user.mentorProfile?.id ?? null
    };
  }

  private async requireMentor(token: string | undefined): Promise<{ userId: string; mentorProfileId: string }> {
    const user = await this.requireUser(token);
    if (!user.mentorProfileId) {
      throw new ForbiddenException("Mentor access required.");
    }
    return { userId: user.id, mentorProfileId: user.mentorProfileId };
  }

  /** Asserts an accepted mentorship between this mentor and the student; returns the request. */
  private async requireAcceptedRequest(mentorProfileId: string, studentUserId: string) {
    const request = await this.prisma.mentorRequest.findUnique({
      where: { mentorProfileId_studentUserId: { mentorProfileId, studentUserId } }
    });
    if (!request || request.status !== MentorRequestStatus.accepted) {
      throw new ForbiddenException("No active mentorship with this student.");
    }
    return request;
  }

  // ── Student-facing ────────────────────────────────────────────────

  async becomeMentor(token: string | undefined, input: BecomeMentorPayload): Promise<{ ok: true; mentorId: string }> {
    const user = await this.requireUser(token);
    const profile = await this.prisma.mentorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: input.headline?.trim() || null,
        bio: input.bio?.trim() || null,
        expertiseJson: (input.expertise ?? []) as Prisma.InputJsonValue,
        acceptingStudents: input.acceptingStudents ?? true
      },
      update: {
        headline: input.headline?.trim() || null,
        bio: input.bio?.trim() || null,
        expertiseJson: (input.expertise ?? []) as Prisma.InputJsonValue,
        ...(input.acceptingStudents !== undefined ? { acceptingStudents: input.acceptingStudents } : {})
      }
    });
    return { ok: true, mentorId: profile.id };
  }

  async browseMentors(
    token: string | undefined,
    params: { q?: string; page?: number; pageSize?: number }
  ): Promise<MentorBrowseResponse> {
    const user = await this.requireUser(token);
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));

    const where: Prisma.MentorProfileWhereInput = {
      acceptingStudents: true,
      userId: { not: user.id },
      ...(params.q
        ? {
            OR: [
              { headline: { contains: params.q, mode: "insensitive" } },
              { user: { fullName: { contains: params.q, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [profiles, total, myRequests] = await Promise.all([
      this.prisma.mentorProfile.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.mentorProfile.count({ where }),
      this.prisma.mentorRequest.findMany({ where: { studentUserId: user.id } })
    ]);

    const statusByProfile = new Map(myRequests.map((r) => [r.mentorProfileId, r.status as MentorRequestStatus]));

    const mentors: MentorSummary[] = profiles.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user.fullName,
      headline: profile.headline,
      bio: profile.bio,
      expertise: this.readStringArray(profile.expertiseJson),
      acceptingStudents: profile.acceptingStudents,
      requestStatus: statusByProfile.get(profile.id) ?? null
    }));

    return { mentors, page, pageSize, total };
  }

  async requestMentor(
    token: string | undefined,
    mentorProfileId: string,
    input: RequestMentorPayload
  ): Promise<{ ok: true }> {
    const user = await this.requireUser(token);
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id: mentorProfileId } });
    if (!mentor || !mentor.acceptingStudents) {
      throw new NotFoundException("Mentor not found or not accepting students.");
    }
    if (mentor.userId === user.id) {
      throw new BadRequestException("You cannot request yourself as a mentor.");
    }

    await this.prisma.mentorRequest.upsert({
      where: { mentorProfileId_studentUserId: { mentorProfileId, studentUserId: user.id } },
      create: { mentorProfileId, studentUserId: user.id, message: input.message?.trim() || null },
      update: { status: MentorRequestStatus.pending, message: input.message?.trim() || null, respondedAt: null }
    });

    await this.notificationService.notifyInApp(
      mentor.userId,
      "mentor.request_received",
      "New mentorship request",
      `${user.fullName} requested you as a mentor.`
    );
    return { ok: true };
  }

  async getMyMentors(token: string | undefined): Promise<StudentMentorsResponse> {
    const user = await this.requireUser(token);
    const [requests, programStatuses] = await Promise.all([
      this.prisma.mentorRequest.findMany({
        where: { studentUserId: user.id },
        include: {
          mentorProfile: { include: { user: { select: { id: true, fullName: true } } } },
          plan: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      this.programStatusMap(user.id)
    ]);

    return {
      mentors: requests.map((request) => ({
        requestId: request.id,
        mentorProfileId: request.mentorProfileId,
        mentorUserId: request.mentorProfile.userId,
        fullName: request.mentorProfile.user.fullName,
        headline: request.mentorProfile.headline,
        status: request.status as MentorRequestStatus,
        plan: request.status === MentorRequestStatus.accepted ? this.serializePlan(request.plan, programStatuses) : null,
        lastMessageAt: request.messages[0]?.createdAt.toISOString() ?? null
      }))
    };
  }

  // ── Mentor-facing ─────────────────────────────────────────────────

  async listIncomingRequests(token: string | undefined): Promise<MentorRequestsResponse> {
    const { mentorProfileId } = await this.requireMentor(token);
    const requests = await this.prisma.mentorRequest.findMany({
      where: { mentorProfileId, status: MentorRequestStatus.pending },
      include: { student: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "asc" }
    });
    return {
      requests: requests.map((request) => ({
        id: request.id,
        status: request.status as MentorRequestStatus,
        message: request.message,
        createdAt: request.createdAt.toISOString(),
        respondedAt: request.respondedAt ? request.respondedAt.toISOString() : null,
        student: request.student
      }))
    };
  }

  async respondToRequest(token: string | undefined, requestId: string, accept: boolean): Promise<{ ok: true }> {
    const { mentorProfileId, userId } = await this.requireMentor(token);
    const request = await this.prisma.mentorRequest.findUnique({ where: { id: requestId } });
    if (!request || request.mentorProfileId !== mentorProfileId) {
      throw new NotFoundException("Request not found.");
    }
    const mentor = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    await this.prisma.mentorRequest.update({
      where: { id: requestId },
      data: { status: accept ? MentorRequestStatus.accepted : MentorRequestStatus.declined, respondedAt: new Date() }
    });

    await this.notificationService.notifyInApp(
      request.studentUserId,
      accept ? "mentor.request_accepted" : "mentor.request_declined",
      accept ? "Mentor accepted your request" : "Mentor declined your request",
      accept
        ? `${mentor?.fullName ?? "Your mentor"} is now guiding you. Check your guidance plan soon.`
        : `${mentor?.fullName ?? "The mentor"} can't take you on right now. Try another mentor.`
    );
    return { ok: true };
  }

  async listConnectedStudents(token: string | undefined): Promise<MentorStudentsResponse> {
    const { mentorProfileId } = await this.requireMentor(token);
    const requests = await this.prisma.mentorRequest.findMany({
      where: { mentorProfileId, status: MentorRequestStatus.accepted },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        plan: { select: { id: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } }
      },
      orderBy: { respondedAt: "desc" }
    });
    return {
      students: requests.map((request) => ({
        userId: request.studentUserId,
        fullName: request.student.fullName,
        email: request.student.email,
        requestId: request.id,
        hasPlan: Boolean(request.plan),
        lastMessageAt: request.messages[0]?.createdAt.toISOString() ?? null
      }))
    };
  }

  async getConnectedStudent(token: string | undefined, studentUserId: string): Promise<MentorStudentDetailResponse> {
    const { mentorProfileId } = await this.requireMentor(token);
    const request = await this.requireAcceptedRequest(mentorProfileId, studentUserId);

    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentProfile: {
          select: { completionStatus: true, favoriteSubjects: true, personalStrengths: true }
        },
        recommendationSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
        proofSessions: {
          where: { status: "completed" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { resultJson: true }
        },
        experienceEnrollments: {
          select: { evaluations: { where: { scope: "final" }, orderBy: { createdAt: "desc" }, take: 1 } }
        }
      }
    });
    if (!student) {
      throw new NotFoundException("Student not found.");
    }

    const recItems = student.recommendationSnapshots[0]?.itemsJson;
    const topRecommendations = Array.isArray(recItems)
      ? (recItems as Array<Record<string, unknown>>)
          .slice(0, 3)
          .map((item) => {
            const career = item.career as Record<string, unknown> | undefined;
            return typeof career?.title === "string" ? career.title : null;
          })
          .filter((title): title is string => Boolean(title))
      : [];

    const proofResult = student.proofSessions[0]?.resultJson as Record<string, unknown> | null | undefined;
    const programReadiness = student.experienceEnrollments
      .flatMap((enrollment) => enrollment.evaluations)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      student: {
        requestId: request.id,
        student: { id: student.id, fullName: student.fullName, email: student.email },
        profileCompletion: student.studentProfile?.completionStatus ?? null,
        favoriteSubjects: this.readStringArray(student.studentProfile?.favoriteSubjects ?? null),
        personalStrengths: this.readStringArray(student.studentProfile?.personalStrengths ?? null),
        topRecommendations,
        proofReadinessBand: typeof proofResult?.readinessBand === "string" ? proofResult.readinessBand : null,
        programReadinessBand: programReadiness?.readinessBand ?? null
      }
    };
  }

  async getGuidancePlan(token: string | undefined, studentUserId: string): Promise<GuidancePlanResponse> {
    const { mentorProfileId } = await this.requireMentor(token);
    const request = await this.requireAcceptedRequest(mentorProfileId, studentUserId);
    const [plan, programStatuses] = await Promise.all([
      this.prisma.guidancePlan.findUnique({ where: { mentorRequestId: request.id } }),
      this.programStatusMap(studentUserId)
    ]);
    return { plan: this.serializePlan(plan, programStatuses) };
  }

  async saveGuidancePlan(
    token: string | undefined,
    studentUserId: string,
    input: GuidancePlanPayload
  ): Promise<GuidancePlanResponse> {
    const { mentorProfileId, userId } = await this.requireMentor(token);
    const request = await this.requireAcceptedRequest(mentorProfileId, studentUserId);

    const data = {
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      notes: input.notes?.trim() || null,
      stepsJson: (input.steps ?? []) as unknown as Prisma.InputJsonValue,
      linkedCareerIdsJson: (input.linkedCareerIds ?? []) as Prisma.InputJsonValue,
      status: input.status ?? "active"
    };

    const plan = await this.prisma.guidancePlan.upsert({
      where: { mentorRequestId: request.id },
      create: { mentorRequestId: request.id, mentorUserId: userId, studentUserId, ...data },
      update: data
    });

    await this.notificationService.notifyInApp(
      studentUserId,
      "mentor.plan_updated",
      "Your guidance plan was updated",
      "Your mentor updated your career guidance plan. Take a look."
    );
    return { plan: this.serializePlan(plan, await this.programStatusMap(studentUserId)) };
  }

  /**
   * Student-only: update the status of a manual (unlinked) step on a plan the
   * student owns. Linked steps derive their status from real progress, so they
   * are not manually editable here.
   */
  async updateStepStatus(
    token: string | undefined,
    planId: string,
    stepId: string,
    status: GuidanceStepStatus
  ): Promise<GuidancePlanResponse> {
    const user = await this.requireUser(token);
    const plan = await this.prisma.guidancePlan.findUnique({ where: { id: planId } });
    if (!plan || plan.studentUserId !== user.id) {
      throw new NotFoundException("Plan not found.");
    }
    const steps: GuidanceStep[] = Array.isArray(plan.stepsJson) ? (plan.stepsJson as unknown as GuidanceStep[]) : [];
    const target = steps.find((step) => step.id === stepId);
    if (!target) {
      throw new NotFoundException("Step not found.");
    }
    if (target.link) {
      throw new BadRequestException("This step is tracked automatically and can't be changed manually.");
    }
    const nextSteps = steps.map((step) => (step.id === stepId ? { ...step, status } : step));
    const updated = await this.prisma.guidancePlan.update({
      where: { id: planId },
      data: { stepsJson: nextSteps as unknown as Prisma.InputJsonValue }
    });
    return { plan: this.serializePlan(updated, await this.programStatusMap(user.id)) };
  }

  // ── Messaging ─────────────────────────────────────────────────────

  /** Verifies the caller is the mentor or the student of the request; returns the request. */
  private async requireConversationAccess(token: string | undefined, requestId: string) {
    const user = await this.requireUser(token);
    const request = await this.prisma.mentorRequest.findUnique({
      where: { id: requestId },
      include: { mentorProfile: { select: { userId: true } } }
    });
    if (!request) {
      throw new NotFoundException("Conversation not found.");
    }
    const isStudent = request.studentUserId === user.id;
    const isMentor = request.mentorProfile.userId === user.id;
    if (!isStudent && !isMentor) {
      throw new ForbiddenException("You are not part of this conversation.");
    }
    if (request.status !== MentorRequestStatus.accepted) {
      throw new ForbiddenException("Messaging is available once the mentorship is accepted.");
    }
    return { request, user, otherUserId: isStudent ? request.mentorProfile.userId : request.studentUserId };
  }

  async getMessages(token: string | undefined, requestId: string): Promise<MentorMessagesResponse> {
    const { user } = await this.requireConversationAccess(token, requestId);
    const messages = await this.prisma.mentorMessage.findMany({
      where: { mentorRequestId: requestId },
      orderBy: { createdAt: "asc" },
      take: 200
    });
    return {
      viewerUserId: user.id,
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        senderUserId: message.senderUserId,
        createdAt: message.createdAt.toISOString()
      }))
    };
  }

  async sendMessage(token: string | undefined, requestId: string, body: string): Promise<MentorMessagesResponse> {
    const { user, otherUserId } = await this.requireConversationAccess(token, requestId);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException("Message cannot be empty.");
    }
    await this.prisma.mentorMessage.create({
      data: { mentorRequestId: requestId, senderUserId: user.id, body: trimmed }
    });
    await this.notificationService.notifyInApp(
      otherUserId,
      "mentor.message",
      "New message",
      `${user.fullName}: ${trimmed.slice(0, 80)}`
    );
    return this.getMessages(token, requestId);
  }

  // ── Serialization ─────────────────────────────────────────────────

  private async programStatusMap(studentUserId: string): Promise<Map<string, GuidanceStepStatus>> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: studentUserId },
      include: { program: { select: { slug: true } } }
    });
    const rank = (status: GuidanceStepStatus): number => (status === "done" ? 2 : status === "in_progress" ? 1 : 0);
    const map = new Map<string, GuidanceStepStatus>();
    for (const enrollment of enrollments) {
      const status: GuidanceStepStatus =
        enrollment.status === "completed" ? "done" : enrollment.status === "active" ? "in_progress" : "todo";
      const existing = map.get(enrollment.program.slug);
      if (!existing || rank(status) > rank(existing)) {
        map.set(enrollment.program.slug, status);
      }
    }
    return map;
  }

  private serializePlan(
    plan: Prisma.GuidancePlanGetPayload<object> | null | undefined,
    programStatuses: Map<string, GuidanceStepStatus>
  ): GuidancePlanRecord | null {
    if (!plan) {
      return null;
    }
    const raw: GuidanceStep[] = Array.isArray(plan.stepsJson)
      ? (plan.stepsJson as unknown as GuidanceStep[])
      : [];
    const steps: GuidanceStep[] = raw
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((step) => {
        const link = step.link ?? null;
        const liveStatus = link?.kind === "program" ? programStatuses.get(link.slug) ?? "todo" : null;
        return { ...step, link, liveStatus };
      });
    return {
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      notes: plan.notes,
      steps,
      linkedCareerIds: this.readStringArray(plan.linkedCareerIdsJson),
      status: plan.status as GuidancePlanRecord["status"],
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    };
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }
}
