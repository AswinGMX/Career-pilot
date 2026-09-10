import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { MembershipRole, Prisma, ProgramStatus, ProgramVersionState } from "@prisma/client";

import type {
  GenerateProgramDraftJobPayload,
  ProgramAdminListResponse,
  ProgramAdminVersionResponse
} from "@career-pilot/types";

import { LlmService } from "../ai/llm.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";

const DRAFT_PROMPT_VERSION = "draft-prompt-v1";

interface DraftBlock {
  kind: "text" | "task_prompt";
  body: Record<string, unknown>;
}
interface DraftModule {
  type: "lesson" | "task" | "reflection";
  title: string;
  blocks: DraftBlock[];
}
interface DraftDay {
  title: string;
  objective: string;
  estimatedMinutes: number;
  modules: DraftModule[];
}

/**
 * Authoring side of the hybrid content pipeline: create a program, generate an
 * AI draft (worker), review, and publish an immutable version. Gated to
 * school_admin for now (a dedicated content-admin role is a future refinement).
 */
@Injectable()
export class ProgramAuthoringService {
  private readonly logger = new Logger(ProgramAuthoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly llm: LlmService,
    private readonly queueService: QueueService
  ) {}

  async createProgram(
    token: string | undefined,
    input: { slug: string; title: string; summary: string; careerId?: string | null }
  ): Promise<{ id: string; slug: string }> {
    await this.requireAdmin(token);
    const program = await this.prisma.experienceProgram.create({
      data: {
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        careerId: input.careerId ?? null,
        status: ProgramStatus.draft
      }
    });
    return { id: program.id, slug: program.slug };
  }

  async requestDraft(
    token: string | undefined,
    programId: string,
    durationDays = 7
  ): Promise<{ queued: boolean }> {
    await this.requireAdmin(token);
    const program = await this.prisma.experienceProgram.findUnique({ where: { id: programId } });
    if (!program) {
      throw new NotFoundException("Program not found.");
    }

    const enqueued = await this.queueService.enqueue<GenerateProgramDraftJobPayload>(
      QUEUE_NAMES.aiDraft,
      JOB_NAMES.generateProgramDraft,
      { programId, careerSlug: program.slug, promptVersion: DRAFT_PROMPT_VERSION },
      { idempotencyKey: `program:draft:${programId}:${Date.now()}` }
    );
    if (!enqueued) {
      this.logger.warn(`AI-draft queue unavailable; generating draft for ${programId} inline.`);
      await this.applyDraft(programId, durationDays);
    }
    return { queued: enqueued };
  }

  /** Worker entrypoint: generate and persist a new draft version. */
  async applyDraft(programId: string, durationDays = 7): Promise<void> {
    const program = await this.prisma.experienceProgram.findUnique({ where: { id: programId } });
    if (!program) {
      return;
    }

    const days = await this.generateDraftDays(program.title, durationDays);
    const max = await this.prisma.programVersion.aggregate({
      where: { programId },
      _max: { version: true }
    });
    const nextVersion = (max._max.version ?? 0) + 1;

    await this.prisma.programVersion.create({
      data: {
        programId,
        version: nextVersion,
        state: ProgramVersionState.draft,
        durationDays: days.length,
        generationSource: "ai",
        promptVersion: DRAFT_PROMPT_VERSION,
        days: {
          create: days.map((day, dayIdx) => ({
            dayIndex: dayIdx + 1,
            title: day.title,
            objective: day.objective,
            estimatedMinutes: day.estimatedMinutes,
            modules: {
              create: day.modules.map((module, modIdx) => ({
                order: modIdx + 1,
                type: module.type,
                title: module.title,
                blocks: {
                  create: module.blocks.map((block, blockIdx) => ({
                    order: blockIdx + 1,
                    kind: block.kind,
                    bodyJson: block.body as Prisma.InputJsonValue
                  }))
                }
              }))
            }
          }))
        }
      }
    });

    this.logger.log(`Generated draft v${nextVersion} for program ${programId} (${days.length} days).`);
  }

  async submitForReview(token: string | undefined, versionId: string): Promise<{ ok: true }> {
    await this.requireAdmin(token);
    await this.setState(versionId, ProgramVersionState.in_review);
    return { ok: true };
  }

  async publish(token: string | undefined, versionId: string): Promise<{ ok: true }> {
    await this.requireAdmin(token);
    const version = await this.prisma.programVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException("Program version not found.");
    }
    await this.prisma.$transaction([
      this.prisma.programVersion.update({
        where: { id: versionId },
        data: { state: ProgramVersionState.published, publishedAt: new Date() }
      }),
      this.prisma.experienceProgram.update({
        where: { id: version.programId },
        data: { status: ProgramStatus.published, currentPublishedVersionId: versionId }
      })
    ]);
    return { ok: true };
  }

  async listPrograms(token: string | undefined): Promise<ProgramAdminListResponse> {
    await this.requireAdmin(token);
    const programs = await this.prisma.experienceProgram.findMany({
      orderBy: { updatedAt: "desc" },
      include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, state: true, durationDays: true } } }
    });
    return {
      programs: programs.map((program) => ({
        id: program.id,
        slug: program.slug,
        title: program.title,
        status: program.status,
        currentPublishedVersionId: program.currentPublishedVersionId,
        versions: program.versions.map((version) => ({
          id: version.id,
          version: version.version,
          state: version.state,
          durationDays: version.durationDays
        }))
      }))
    };
  }

  async getVersion(token: string | undefined, versionId: string): Promise<ProgramAdminVersionResponse> {
    await this.requireAdmin(token);
    const version = await this.prisma.programVersion.findUnique({
      where: { id: versionId },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: { modules: { orderBy: { order: "asc" }, include: { blocks: { orderBy: { order: "asc" } } } } }
        }
      }
    });
    if (!version) {
      throw new NotFoundException("Program version not found.");
    }
    return {
      version: {
        id: version.id,
        version: version.version,
        state: version.state,
        durationDays: version.durationDays,
        generationSource: version.generationSource,
        days: version.days.map((day) => ({
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
              body: (block.bodyJson as Record<string, unknown> | null) ?? null,
              media: null
            }))
          }))
        }))
      }
    };
  }

  private async setState(versionId: string, state: ProgramVersionState): Promise<void> {
    const version = await this.prisma.programVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException("Program version not found.");
    }
    await this.prisma.programVersion.update({ where: { id: versionId }, data: { state } });
  }

  private async generateDraftDays(programTitle: string, durationDays: number): Promise<DraftDay[]> {
    if (this.llm.isConfigured()) {
      const ai = await this.generateWithAi(programTitle, durationDays);
      if (ai && ai.length > 0) {
        return ai;
      }
    }
    return this.fallbackDays(programTitle, durationDays);
  }

  private async generateWithAi(programTitle: string, durationDays: number): Promise<DraftDay[] | null> {
    const schema = {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              objective: { type: "string" },
              estimatedMinutes: { type: "number" },
              modules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["lesson", "task", "reflection"] },
                    title: { type: "string" },
                    blocks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          kind: { type: "string", enum: ["text", "task_prompt"] },
                          body: { type: "object" }
                        },
                        required: ["kind", "body"]
                      }
                    }
                  },
                  required: ["type", "title", "blocks"]
                }
              }
            },
            required: ["title", "objective", "estimatedMinutes", "modules"]
          }
        }
      },
      required: ["days"]
    };

    try {
      const result = await this.llm.generateStructuredJson<{ days: DraftDay[] }>({
        systemInstruction:
          "You design immersive multi-day career-experience programs. Each day has a clear objective and 2-3 modules (lessons, tasks, reflections). Text blocks use {heading, markdown}; task_prompt blocks use {prompt, evidenceKind:'text'}.",
        prompt: `Design a ${durationDays}-day program titled "${programTitle}". Return JSON with a "days" array; make each day concrete and grounded in the real work.`,
        schema,
        temperature: 0.7
      });
      return result?.days ?? null;
    } catch (error) {
      this.logger.warn(`AI draft generation failed, using fallback: ${(error as Error)?.message}`);
      return null;
    }
  }

  private fallbackDays(programTitle: string, durationDays: number): DraftDay[] {
    const count = Math.min(10, Math.max(5, durationDays));
    return Array.from({ length: count }, (_unused, index) => ({
      title: `Day ${index + 1}`,
      objective: `Explore a core aspect of ${programTitle}.`,
      estimatedMinutes: 35,
      modules: [
        {
          type: "lesson" as const,
          title: "Learn",
          blocks: [{ kind: "text" as const, body: { heading: "Overview", markdown: `Day ${index + 1} of ${programTitle}.` } }]
        },
        {
          type: "reflection" as const,
          title: "Reflect",
          blocks: [{ kind: "task_prompt" as const, body: { prompt: "What did you take away from today?", evidenceKind: "text" } }]
        }
      ]
    }));
  }

  private async requireAdmin(token: string | undefined): Promise<void> {
    const session = await this.authService.getAuthenticatedSession(token);
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }
    const isAdmin = session.user.memberships.some(
      (membership) => membership.role === MembershipRole.school_admin && membership.status === "active"
    );
    if (!isAdmin) {
      throw new ForbiddenException("Content admin access required.");
    }
  }
}
