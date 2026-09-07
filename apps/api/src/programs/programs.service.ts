import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ExperienceProgram, MediaAsset, Prisma, ProgramStatus, ProgramVersionState } from "@prisma/client";

import type {
  ProgramDayView,
  ProgramDetail,
  ProgramDetailResponse,
  ProgramListResponse,
  ProgramMediaRef,
  ProgramSummary
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Read side of the Experience Program catalog. Serves only published programs
 * off their pinned published version. Authoring/publishing is handled by the
 * content pipeline; enrollment by the runtime module.
 *
 * Access split, because program content is the paid product:
 * - the program LIST is public (titles, summaries, duration — marketing copy);
 * - the program DETAIL requires a session and returns a syllabus OUTLINE only.
 *
 * Full block bodies (task prompts, scenario scripts, lesson copy) and playable
 * media URLs are served exclusively by the enrollment day endpoint, which
 * enforces per-day locking and anti-skip rules. Anything added here is readable
 * by anyone with an account and no enrollment.
 */
@Injectable()
export class ProgramsService {
  /**
   * Body fields safe to expose pre-enrollment. These are labels the catalog UI
   * renders as a block name; everything else in a body is lesson content.
   */
  private static readonly OUTLINE_BODY_FIELDS = ["heading", "title"] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async listPublishedPrograms(): Promise<ProgramListResponse> {
    const programs = await this.prisma.experienceProgram.findMany({
      where: { status: ProgramStatus.published },
      orderBy: { title: "asc" }
    });

    const versionIds = programs
      .map((program) => program.currentPublishedVersionId)
      .filter((id): id is string => Boolean(id));

    const versions = versionIds.length
      ? await this.prisma.programVersion.findMany({
          where: { id: { in: versionIds } },
          select: { id: true, durationDays: true }
        })
      : [];

    const durationById = new Map(versions.map((version) => [version.id, version.durationDays]));

    return {
      programs: programs.map((program) =>
        this.toSummary(
          program,
          program.currentPublishedVersionId
            ? durationById.get(program.currentPublishedVersionId) ?? null
            : null
        )
      )
    };
  }

  /**
   * Syllabus outline for one published program: day and module structure with
   * block kinds, no lesson bodies and no signed media URLs. Requires a session
   * so the catalog cannot be scraped anonymously.
   */
  async getPublishedProgramBySlug(token: string | undefined, slug: string): Promise<ProgramDetailResponse> {
    await this.requireSession(token);

    const program = await this.prisma.experienceProgram.findFirst({
      where: { slug, status: ProgramStatus.published }
    });

    if (!program || !program.currentPublishedVersionId) {
      return { program: null };
    }

    const version = await this.prisma.programVersion.findUnique({
      where: { id: program.currentPublishedVersionId },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            modules: {
              orderBy: { order: "asc" },
              include: {
                blocks: {
                  orderBy: { order: "asc" },
                  include: { mediaAsset: true }
                }
              }
            }
          }
        }
      }
    });

    if (!version || version.state !== ProgramVersionState.published) {
      return { program: null };
    }

    const days: ProgramDayView[] = version.days.map((day) => ({
      id: day.id,
      dayIndex: day.dayIndex,
      title: day.title,
      objective: day.objective,
      estimatedMinutes: day.estimatedMinutes,
      modules: day.modules.map((module) => ({
        id: module.id,
        order: module.order,
        type: module.type,
        title: module.title,
        blocks: module.blocks.map((block) => ({
          id: block.id,
          order: block.order,
          kind: block.kind,
          body: this.toOutlineBody(block.bodyJson),
          media: this.toOutlineMediaRef(block.mediaAsset)
        }))
      }))
    }));

    const detail: ProgramDetail = {
      ...this.toSummary(program, version.durationDays),
      version: version.version,
      days
    };

    return { program: detail };
  }

  private async requireSession(token: string | undefined): Promise<void> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }
  }

  private toSummary(program: ExperienceProgram, durationDays: number | null): ProgramSummary {
    return {
      id: program.id,
      slug: program.slug,
      title: program.title,
      summary: program.summary,
      careerId: program.careerId,
      status: program.status,
      durationDays
    };
  }

  /** Keeps only the label fields in {@link OUTLINE_BODY_FIELDS}; drops the rest. */
  private toOutlineBody(body: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    const source = body as Record<string, unknown>;
    const outline: Record<string, unknown> = {};

    for (const field of ProgramsService.OUTLINE_BODY_FIELDS) {
      if (typeof source[field] === "string") {
        outline[field] = source[field];
      }
    }

    return Object.keys(outline).length ? outline : null;
  }

  /**
   * Media shape without a download URL, so the outline can say "Day 3 has a
   * 4-minute video" without handing out the video itself. The signed URL is
   * issued only on the enrollment day path.
   */
  private toOutlineMediaRef(media: MediaAsset | null): ProgramMediaRef | null {
    if (!media) {
      return null;
    }

    return {
      id: media.id,
      kind: media.kind,
      status: media.status,
      url: null,
      captionsUrl: null,
      durationSec: media.durationSec ?? null
    };
  }
}
