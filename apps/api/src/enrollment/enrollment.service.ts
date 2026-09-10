import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  BlockProgressState,
  DayState,
  EnrollmentStatus,
  EvaluationScope,
  EvidenceStatus,
  MediaKind,
  MediaStatus,
  MembershipRole,
  Prisma,
  ProgramStatus
} from "@prisma/client";

import type {
  BlockProgressResponse,
  EnrollResponse,
  EnrollmentDayResponse,
  EnrollmentDayView,
  EnrollmentDetailResponse,
  EnrollmentListResponse,
  EnrollmentResultResponse,
  EnrollmentSummary,
  EvaluateEnrollmentJobPayload,
  EvaluationDimensionScore,
  EvidenceKind,
  EvidenceUploadInitResponse,
  ProgramMediaRef,
  ProgramOutcomeReport,
  ProgramOutcomeReportResponse
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { AntivirusService } from "../storage/antivirus.service";
import { StorageService } from "../storage/storage.service";
import { EvaluationService } from "./evaluation.service";

type EnrollmentWithProgress = Prisma.EnrollmentGetPayload<{
  include: { program: true; programVersion: true; dayProgress: true };
}>;

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  /**
   * Grace period after an enrollment completes before the read path will
   * self-heal a missing evaluation. Gives a healthy worker first crack on the
   * happy path; only kicks in when the worker tier is degraded or absent.
   */
  private static readonly EVALUATION_GRACE_MS = 8_000;
  /** Enrollment ids with an in-process self-heal already running (dedupes rapid polling). */
  private readonly reconcilingEvaluations = new Set<string>();

  /** Per-kind upload ceilings + MIME allowlist for student evidence. */
  private static readonly EVIDENCE_LIMITS: Record<EvidenceKind, { maxBytes: number; mimePrefix: string }> = {
    video: { maxBytes: 200 * 1024 * 1024, mimePrefix: "video/" },
    audio: { maxBytes: 50 * 1024 * 1024, mimePrefix: "audio/" },
    image: { maxBytes: 25 * 1024 * 1024, mimePrefix: "image/" }
  };
  /** Abuse guard: max evidence uploads a single student can initiate per rolling 24h. */
  private static readonly EVIDENCE_DAILY_QUOTA = 50;
  /** Minimum characters for a written reflection to count as completed. */
  private static readonly MIN_REFLECTION_CHARS = 40;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly storage: StorageService,
    private readonly queueService: QueueService,
    private readonly evaluationService: EvaluationService,
    private readonly notificationService: NotificationService,
    private readonly antivirus: AntivirusService
  ) {}

  async getResult(token: string | undefined, enrollmentId: string): Promise<EnrollmentResultResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    if (enrollment.status !== EnrollmentStatus.completed) {
      return { status: "none", result: null };
    }

    const result = await this.prisma.evaluationResult.findFirst({
      where: { enrollmentId, scope: EvaluationScope.final },
      orderBy: { createdAt: "desc" }
    });
    if (!result) {
      this.reconcileEvaluation(enrollment.id, enrollment.completedAt);
      return { status: "pending", result: null };
    }

    const scores = (result.scoresJson as Record<string, unknown> | null) ?? {};
    return {
      status: "ready",
      result: {
        scope: "final",
        overallScore: typeof scores.overallScore === "number" ? scores.overallScore : result.points,
        points: result.points,
        readinessBand: result.readinessBand,
        narrative: result.narrative,
        dimensions: Array.isArray(scores.dimensions) ? (scores.dimensions as EvaluationDimensionScore[]) : [],
        strengths: Array.isArray(scores.strengths) ? (scores.strengths as string[]) : [],
        risks: Array.isArray(scores.risks) ? (scores.risks as string[]) : [],
        nextSteps: Array.isArray(scores.nextSteps) ? (scores.nextSteps as string[]) : [],
        scoringSource: result.scoringSource,
        createdAt: result.createdAt.toISOString()
      }
    };
  }

  /**
   * Phase F: assembles the durable program-outcome report from the completed
   * enrollment + its final evaluation, exports it to object storage (so it
   * survives and can be shared), and returns it with a short-lived signed URL.
   * Returns nulls until the enrollment is completed and evaluated.
   */
  async getProgramReport(token: string | undefined, enrollmentId: string): Promise<ProgramOutcomeReportResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    if (enrollment.status !== EnrollmentStatus.completed) {
      return { report: null, fileUrl: null };
    }
    const result = await this.prisma.evaluationResult.findFirst({
      where: { enrollmentId, scope: EvaluationScope.final },
      orderBy: { createdAt: "desc" }
    });
    if (!result) {
      return { report: null, fileUrl: null };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    const scores = (result.scoresJson as Record<string, unknown> | null) ?? {};
    const completedDays = enrollment.dayProgress.filter((day) => day.state === DayState.completed).length;

    const report: ProgramOutcomeReport = {
      generatedAt: new Date().toISOString(),
      enrollmentId: enrollment.id,
      programTitle: enrollment.program.title,
      student: { id: userId, fullName: user?.fullName ?? "" },
      status: enrollment.status,
      completedDays,
      durationDays: enrollment.programVersion.durationDays,
      completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
      overallScore: typeof scores.overallScore === "number" ? scores.overallScore : result.points,
      readinessBand: result.readinessBand,
      narrative: result.narrative,
      dimensions: Array.isArray(scores.dimensions) ? (scores.dimensions as EvaluationDimensionScore[]) : [],
      strengths: Array.isArray(scores.strengths) ? (scores.strengths as string[]) : [],
      risks: Array.isArray(scores.risks) ? (scores.risks as string[]) : [],
      nextSteps: Array.isArray(scores.nextSteps) ? (scores.nextSteps as string[]) : [],
      evidenceCount: typeof scores.evidenceCount === "number" ? scores.evidenceCount : 0,
      scenarioDecisions: typeof scores.scenarioDecisions === "number" ? scores.scenarioDecisions : 0
    };

    // Persist a durable export so school/parent surfaces and re-downloads don't recompute.
    const fileKey = `reports/program/${enrollment.id}.json`;
    let fileUrl: string | null = null;
    try {
      await this.storage.putObject({
        key: fileKey,
        body: JSON.stringify(report),
        contentType: "application/json"
      });
      fileUrl = (await this.storage.createSignedDownload(fileKey)).url;
    } catch (err) {
      this.logger.error(`Program report export failed for ${enrollment.id}: ${(err as Error)?.message}`);
    }

    return { report, fileUrl };
  }

  async enroll(token: string | undefined, programSlug: string): Promise<EnrollResponse> {
    const { userId, tenantId } = await this.requireStudent(token);

    const program = await this.prisma.experienceProgram.findFirst({
      where: { slug: programSlug, status: ProgramStatus.published }
    });
    if (!program || !program.currentPublishedVersionId) {
      throw new NotFoundException("Program not found or not published.");
    }

    const existing = await this.prisma.enrollment.findFirst({
      where: { userId, programId: program.id, status: EnrollmentStatus.active },
      include: { program: true, programVersion: true, dayProgress: true }
    });
    if (existing) {
      return { enrollment: this.toSummary(existing) };
    }

    const version = await this.prisma.programVersion.findUnique({
      where: { id: program.currentPublishedVersionId },
      include: { days: { orderBy: { dayIndex: "asc" }, select: { dayIndex: true } } }
    });
    if (!version || version.days.length === 0) {
      throw new NotFoundException("Program has no content.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          tenantId,
          programId: program.id,
          programVersionId: version.id,
          status: EnrollmentStatus.active,
          currentDayIndex: 1
        }
      });

      await tx.dayProgress.createMany({
        data: version.days.map((day) => ({
          enrollmentId: enrollment.id,
          dayIndex: day.dayIndex,
          state: day.dayIndex === 1 ? DayState.available : DayState.locked
        }))
      });

      return tx.enrollment.findUniqueOrThrow({
        where: { id: enrollment.id },
        include: { program: true, programVersion: true, dayProgress: true }
      });
    });

    await this.notificationService.notifyInApp(
      userId,
      "program.enrolled",
      "Program started",
      `You enrolled in ${program.title}. Day 1 is ready — dive in.`
    );

    return { enrollment: this.toSummary(created) };
  }

  async listMyEnrollments(token: string | undefined): Promise<EnrollmentListResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { program: true, programVersion: true, dayProgress: true },
      orderBy: { createdAt: "desc" }
    });
    return { enrollments: enrollments.map((enrollment) => this.toSummary(enrollment)) };
  }

  async getEnrollment(token: string | undefined, enrollmentId: string): Promise<EnrollmentDetailResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    const version = await this.prisma.programVersion.findUnique({
      where: { id: enrollment.programVersionId },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          select: { dayIndex: true, title: true, objective: true, estimatedMinutes: true }
        }
      }
    });

    const stateByDay = new Map(enrollment.dayProgress.map((day) => [day.dayIndex, day.state]));
    const days = (version?.days ?? []).map((day) => ({
      dayIndex: day.dayIndex,
      title: day.title,
      objective: day.objective,
      estimatedMinutes: day.estimatedMinutes,
      state: (stateByDay.get(day.dayIndex) ?? DayState.locked) as DayState
    }));

    return { enrollment: { ...this.toSummary(enrollment), days } };
  }

  async getEnrollmentDay(
    token: string | undefined,
    enrollmentId: string,
    dayIndex: number
  ): Promise<EnrollmentDayResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    const dayProgress = enrollment.dayProgress.find((day) => day.dayIndex === dayIndex);
    if (!dayProgress || dayProgress.state === DayState.locked) {
      return { enrollment: this.toSummary(enrollment), day: null };
    }

    const version = await this.prisma.programVersion.findUnique({
      where: { id: enrollment.programVersionId },
      include: {
        days: {
          where: { dayIndex },
          include: {
            modules: {
              orderBy: { order: "asc" },
              include: {
                blocks: {
                  orderBy: { order: "asc" },
                  include: { scenario: true, mediaAsset: true }
                }
              }
            }
          }
        }
      }
    });

    const day = version?.days[0];
    if (!day) {
      return { enrollment: this.toSummary(enrollment), day: null };
    }

    // First visit to an available day moves it to in_progress.
    if (dayProgress.state === DayState.available) {
      await this.prisma.dayProgress.update({
        where: { id: dayProgress.id },
        data: { state: DayState.in_progress, startedAt: new Date() }
      });
      dayProgress.state = DayState.in_progress;
    }

    const blockProgress = await this.prisma.blockProgress.findMany({
      where: { enrollmentId: enrollment.id }
    });
    const progressByBlock = new Map(blockProgress.map((bp) => [bp.contentBlockId, bp]));

    const view: EnrollmentDayView = {
      dayIndex: day.dayIndex,
      title: day.title,
      objective: day.objective,
      estimatedMinutes: day.estimatedMinutes,
      state: dayProgress.state as DayState,
      modules: await Promise.all(
        day.modules.map(async (module) => ({
          id: module.id,
          order: module.order,
          type: module.type,
          title: module.title,
          blocks: await Promise.all(
            module.blocks.map(async (block) => {
              const bp = progressByBlock.get(block.id);
              const scenarioBody = block.scenario ? { scenario: block.scenario.graphJson } : null;
              const base = (block.bodyJson as Record<string, unknown> | null) ?? scenarioBody;
              return {
                id: block.id,
                order: block.order,
                kind: block.kind,
                body: base,
                media: await this.toMediaRef(block.mediaAsset),
                state: (bp?.state ?? BlockProgressState.not_started) as BlockProgressState,
                interaction: (bp?.interactionJson as Record<string, unknown> | null) ?? null
              };
            })
          )
        }))
      )
    };

    return { enrollment: this.toSummary(enrollment), day: view };
  }

  async markBlockProgress(
    token: string | undefined,
    enrollmentId: string,
    contentBlockId: string,
    state: BlockProgressState,
    interaction?: Record<string, unknown> | null
  ): Promise<BlockProgressResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    // Verify the block belongs to this enrollment's pinned program version.
    const block = await this.prisma.contentBlock.findUnique({
      where: { id: contentBlockId },
      include: { module: { include: { programDay: true } } }
    });
    if (!block || block.module.programDay.programVersionId !== enrollment.programVersionId) {
      throw new BadRequestException("Block does not belong to this enrollment.");
    }
    const dayIndex = block.module.programDay.dayIndex;

    // Gate completion so a student cannot click through a day in seconds:
    // reflections need a real written answer, scenarios need a choice, and
    // media-evidence tasks need an actual upload.
    if (state === BlockProgressState.completed) {
      await this.validateBlockCompletion(enrollment.id, block, interaction);
    }

    await this.prisma.blockProgress.upsert({
      where: { enrollmentId_contentBlockId: { enrollmentId: enrollment.id, contentBlockId } },
      create: {
        enrollmentId: enrollment.id,
        contentBlockId,
        state,
        interactionJson: (interaction ?? undefined) as Prisma.InputJsonValue | undefined
      },
      update: {
        state,
        ...(interaction !== undefined
          ? { interactionJson: (interaction ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {})
      }
    });

    const dayCompleted = await this.maybeCompleteDay(enrollment, dayIndex);
    const refreshed = await this.loadOwnedEnrollment(enrollmentId, userId);

    return {
      ok: true,
      blockId: contentBlockId,
      state,
      dayCompleted,
      enrollment: this.toSummary(refreshed)
    };
  }

  /**
   * Step 1 of evidence submission. Validates the student owns the enrollment and
   * that the block is a media-evidence task, then provisions a `MediaAsset` +
   * `EvidenceSubmission` (pending) and returns a short-lived signed PUT target
   * the browser uploads the file to directly — no large payload ever transits
   * the API. Step 2 is {@link completeEvidence}.
   */
  async createEvidenceUpload(
    token: string | undefined,
    enrollmentId: string,
    contentBlockId: string,
    input: { mimeType: string; kind?: EvidenceKind; sizeBytes?: number }
  ): Promise<EvidenceUploadInitResponse> {
    const { userId, tenantId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);
    const block = await this.loadEvidenceBlock(contentBlockId, enrollment.programVersionId);

    const kind = this.resolveEvidenceKind(input.kind, block.bodyJson, input.mimeType);

    // Enforce MIME/kind consistency, per-kind size ceiling, and a daily abuse quota.
    const limit = EnrollmentService.EVIDENCE_LIMITS[kind];
    if (!input.mimeType.startsWith(limit.mimePrefix)) {
      throw new BadRequestException(`Expected a ${kind} file but received "${input.mimeType}".`);
    }
    if (input.sizeBytes && input.sizeBytes > limit.maxBytes) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(limit.maxBytes / (1024 * 1024))}MB limit for ${kind} evidence.`
      );
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUploads = await this.prisma.evidenceSubmission.count({
      where: { enrollment: { userId }, createdAt: { gte: since } }
    });
    if (recentUploads >= EnrollmentService.EVIDENCE_DAILY_QUOTA) {
      throw new ForbiddenException("Daily evidence upload limit reached. Please try again later.");
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        tenantId,
        kind: kind as MediaKind,
        status: MediaStatus.uploaded,
        storageKey: "pending",
        mimeType: input.mimeType,
        bytes: input.sizeBytes ?? null,
        createdByUserId: userId
      }
    });
    const storageKey = `evidence/${enrollment.id}/${asset.id}`;
    await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { storageKey } });

    const evidence = await this.prisma.evidenceSubmission.create({
      data: {
        enrollmentId: enrollment.id,
        contentBlockId,
        kind: kind as MediaKind,
        status: EvidenceStatus.pending,
        mediaAssetId: asset.id
      }
    });

    const upload = await this.storage.createSignedUpload(storageKey, { contentType: input.mimeType });
    return { evidenceId: evidence.id, mediaId: asset.id, kind, upload };
  }

  /**
   * Step 2 of evidence submission. Called once the browser has finished the
   * signed upload. Marks the asset ready and the submission `submitted`, then
   * records block progress (which may complete the day and trigger evaluation).
   */
  async completeEvidence(
    token: string | undefined,
    enrollmentId: string,
    contentBlockId: string,
    evidenceId: string
  ): Promise<BlockProgressResponse> {
    const { userId } = await this.requireStudent(token);
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId);

    const evidence = await this.prisma.evidenceSubmission.findUnique({ where: { id: evidenceId } });
    if (!evidence || evidence.enrollmentId !== enrollment.id || evidence.contentBlockId !== contentBlockId) {
      throw new BadRequestException("Evidence submission does not belong to this enrollment block.");
    }

    if (evidence.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findUnique({ where: { id: evidence.mediaAssetId } });
      if (asset) {
        // Malware-scan the uploaded object before exposing it to reviewers.
        const scan = await this.antivirus.scan(asset.storageKey);
        if (!scan.clean) {
          await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: MediaStatus.failed } });
          await this.prisma.evidenceSubmission.update({
            where: { id: evidence.id },
            data: { status: EvidenceStatus.failed }
          });
          throw new BadRequestException("Uploaded file failed a safety scan and was rejected.");
        }
      }
      await this.prisma.mediaAsset.update({
        where: { id: evidence.mediaAssetId },
        data: {
          status: MediaStatus.ready,
          renditionsJson: { note: "evidence-original", renditions: [{ profile: "original" }] } as Prisma.InputJsonValue
        }
      });
    }
    await this.prisma.evidenceSubmission.update({
      where: { id: evidence.id },
      data: { status: EvidenceStatus.submitted }
    });

    // Reuse the standard progress path so day-completion + evaluation triggering stay in one place.
    return this.markBlockProgress(token, enrollmentId, contentBlockId, BlockProgressState.completed, {
      evidenceId: evidence.id,
      mediaAssetId: evidence.mediaAssetId,
      kind: evidence.kind
    });
  }

  /**
   * Server-authoritative anti-skip validation. A completed block must carry real
   * work for its kind — a substantive reflection, a scenario choice, or an
   * uploaded piece of evidence — so a student cannot blast through a day.
   */
  private async validateBlockCompletion(
    enrollmentId: string,
    block: { id: string; kind: string; bodyJson: Prisma.JsonValue | null },
    interaction?: Record<string, unknown> | null
  ): Promise<void> {
    const body = (block.bodyJson as Record<string, unknown> | null) ?? {};

    if (block.kind === "task_prompt") {
      const evidenceKind = body.evidenceKind;
      if (evidenceKind === "video" || evidenceKind === "audio" || evidenceKind === "image") {
        const submitted = await this.prisma.evidenceSubmission.count({
          where: {
            enrollmentId,
            contentBlockId: block.id,
            status: { in: [EvidenceStatus.submitted, EvidenceStatus.scored] }
          }
        });
        if (submitted === 0) {
          throw new BadRequestException("Upload your evidence before completing this task.");
        }
        return;
      }
      const response = typeof interaction?.response === "string" ? interaction.response.trim() : "";
      if (response.length < EnrollmentService.MIN_REFLECTION_CHARS) {
        throw new BadRequestException(
          `Write a more complete response (at least ${EnrollmentService.MIN_REFLECTION_CHARS} characters) before submitting.`
        );
      }
      return;
    }

    if (block.kind === "scenario") {
      const choices = Array.isArray(interaction?.choices) ? (interaction!.choices as unknown[]) : [];
      if (choices.length === 0) {
        throw new BadRequestException("Work through the scenario before completing it.");
      }
    }
  }

  /** Loads a task block and asserts it belongs to the enrollment's pinned version. */
  private async loadEvidenceBlock(contentBlockId: string, programVersionId: string) {
    const block = await this.prisma.contentBlock.findUnique({
      where: { id: contentBlockId },
      include: { module: { include: { programDay: true } } }
    });
    if (!block || block.module.programDay.programVersionId !== programVersionId) {
      throw new BadRequestException("Block does not belong to this enrollment.");
    }
    if (block.kind !== "task_prompt") {
      throw new BadRequestException("Evidence can only be submitted for task blocks.");
    }
    return block;
  }

  /** Determines the evidence kind from an explicit override, the block's declared kind, or the MIME type. */
  private resolveEvidenceKind(
    override: EvidenceKind | undefined,
    bodyJson: Prisma.JsonValue | null,
    mimeType: string
  ): EvidenceKind {
    const declared = ((bodyJson as Record<string, unknown> | null)?.evidenceKind ?? null) as string | null;
    const candidate = override ?? (declared && declared !== "text" ? declared : null) ?? mimeType.split("/")[0];
    if (candidate === "video" || candidate === "audio" || candidate === "image") {
      return candidate;
    }
    throw new BadRequestException("This task does not accept a media upload.");
  }

  /** Completes the day if all its blocks are done, then unlocks the next day / completes the program. */
  private async maybeCompleteDay(enrollment: EnrollmentWithProgress, dayIndex: number): Promise<boolean> {
    const dayBlocks = await this.prisma.contentBlock.findMany({
      where: { module: { programDay: { programVersionId: enrollment.programVersionId, dayIndex } } },
      select: { id: true }
    });
    if (dayBlocks.length === 0) {
      return false;
    }

    const completed = await this.prisma.blockProgress.count({
      where: {
        enrollmentId: enrollment.id,
        state: BlockProgressState.completed,
        contentBlockId: { in: dayBlocks.map((block) => block.id) }
      }
    });
    if (completed < dayBlocks.length) {
      return false;
    }

    const dayProgress = enrollment.dayProgress.find((day) => day.dayIndex === dayIndex);
    if (dayProgress && dayProgress.state !== DayState.completed) {
      await this.prisma.dayProgress.update({
        where: { id: dayProgress.id },
        data: { state: DayState.completed, completedAt: new Date() }
      });
    }

    const totalDays = enrollment.dayProgress.length;
    if (dayIndex < totalDays) {
      const next = enrollment.dayProgress.find((day) => day.dayIndex === dayIndex + 1);
      if (next && next.state === DayState.locked) {
        await this.prisma.dayProgress.update({
          where: { id: next.id },
          data: { state: DayState.available }
        });
      }
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { currentDayIndex: Math.max(enrollment.currentDayIndex, dayIndex + 1) }
      });
    } else {
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: EnrollmentStatus.completed, completedAt: new Date() }
      });
      await this.triggerEvaluation(enrollment.id);
    }

    return true;
  }

  /**
   * Read-path self-heal. If a completed enrollment still has no evaluation
   * result after the grace window, the worker tier never processed (or lost)
   * the job. Re-run the evaluation inline so the student is never stranded on
   * an infinite poll. `runFinalEvaluation` is idempotent — it no-ops if a
   * result already exists — so a healthy worker finishing concurrently is safe.
   * Fire-and-forget: the GET stays fast and the next poll observes the result.
   */
  private reconcileEvaluation(enrollmentId: string, completedAt: Date | null): void {
    const ageMs = completedAt ? Date.now() - completedAt.getTime() : Number.MAX_SAFE_INTEGER;
    if (ageMs < EnrollmentService.EVALUATION_GRACE_MS) {
      return;
    }
    if (this.reconcilingEvaluations.has(enrollmentId)) {
      return;
    }
    this.reconcilingEvaluations.add(enrollmentId);
    this.logger.warn(`Evaluation for ${enrollmentId} not produced within grace window; self-healing inline.`);
    void this.evaluationService
      .runFinalEvaluation(enrollmentId)
      .catch((err) => this.logger.error(`Self-heal evaluation for ${enrollmentId} failed: ${(err as Error)?.message}`))
      .finally(() => this.reconcilingEvaluations.delete(enrollmentId));
  }

  /** Queues final readiness evaluation; runs inline if the queue is unavailable. */
  private async triggerEvaluation(enrollmentId: string): Promise<void> {
    const enqueued = await this.queueService.enqueue<EvaluateEnrollmentJobPayload>(
      QUEUE_NAMES.evaluation,
      JOB_NAMES.evaluateEnrollment,
      { enrollmentId },
      { idempotencyKey: `enrollment:eval:${enrollmentId}` }
    );
    if (!enqueued) {
      this.logger.warn(`Evaluation queue unavailable; evaluating enrollment ${enrollmentId} inline.`);
      await this.evaluationService.runFinalEvaluation(enrollmentId);
    }
  }

  private async loadOwnedEnrollment(enrollmentId: string, userId: string): Promise<EnrollmentWithProgress> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true, programVersion: true, dayProgress: true }
    });
    if (!enrollment) {
      throw new NotFoundException("Enrollment not found.");
    }
    if (enrollment.userId !== userId) {
      throw new ForbiddenException("You do not have access to this enrollment.");
    }
    return enrollment;
  }

  private toSummary(enrollment: EnrollmentWithProgress): EnrollmentSummary {
    const completedDays = enrollment.dayProgress.filter((day) => day.state === DayState.completed).length;
    return {
      id: enrollment.id,
      programId: enrollment.programId,
      programSlug: enrollment.program.slug,
      programTitle: enrollment.program.title,
      status: enrollment.status,
      currentDayIndex: enrollment.currentDayIndex,
      durationDays: enrollment.programVersion.durationDays,
      completedDays,
      startedAt: enrollment.startedAt.toISOString(),
      completedAt: enrollment.completedAt ? enrollment.completedAt.toISOString() : null
    };
  }

  private async toMediaRef(media: { id: string; kind: string; status: string; storageKey: string; captionsKey: string | null; durationSec: number | null } | null): Promise<ProgramMediaRef | null> {
    if (!media) {
      return null;
    }
    let url: string | null = null;
    let captionsUrl: string | null = null;
    if (media.status === "ready") {
      url = (await this.storage.createSignedDownload(media.storageKey)).url;
      if (media.captionsKey) {
        captionsUrl = (await this.storage.createSignedDownload(media.captionsKey)).url;
      }
    }
    return {
      id: media.id,
      kind: media.kind as ProgramMediaRef["kind"],
      status: media.status,
      url,
      captionsUrl,
      durationSec: media.durationSec ?? null
    };
  }

  private async requireStudent(token: string | undefined): Promise<{ userId: string; tenantId: string | null }> {
    const session = await this.authService.getAuthenticatedSession(token);
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }
    const activeMembership = session.user.memberships.find((membership) => membership.status === "active") || null;
    if (activeMembership?.role === MembershipRole.school_admin) {
      throw new ForbiddenException("Student access required.");
    }
    return { userId: session.user.id, tenantId: activeMembership?.tenantId ?? null };
  }
}
