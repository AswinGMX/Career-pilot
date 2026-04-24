import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import {
  MembershipRole,
  ProfileCompletionStatus,
  type Prisma,
  type RecommendationSnapshot as RecommendationSnapshotModel
} from "@prisma/client";

import type {
  CareerRecord,
  RecommendationItem,
  RecommendationLatestResponse,
  RecommendationRecomputeResponse,
  RecommendationSnapshot
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { LlmService } from "../ai/llm.service";
import { PrismaService } from "../prisma/prisma.service";

const fallbackRecommendationEngineVersion = "rules-v1";

type SessionRecord = Prisma.SessionGetPayload<{
  include: {
    user: {
      include: {
        memberships: {
          include: {
            tenant: true;
          };
        };
      };
    };
  };
}>;

type ProfileRecord = Prisma.StudentProfileGetPayload<{
  include: {
    versions: true;
  };
}>;

type CareerRecordWithDetail = Prisma.CareerGetPayload<{
  include: {
    category: true;
    detail: true;
  };
}>;

type CareerWithRequiredDetail = CareerRecordWithDetail & {
  detail: NonNullable<CareerRecordWithDetail["detail"]>;
};

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly llmService: LlmService
  ) {}

  async getLatest(token: string | undefined): Promise<RecommendationLatestResponse> {
    const session = await this.requireStudentSession(token);
    const latest = await this.prisma.recommendationSnapshot.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      snapshot: latest ? this.serializeSnapshot(latest) : null
    };
  }

  async recompute(token: string | undefined): Promise<RecommendationRecomputeResponse> {
    try {
      return await this.recomputeInternal(token);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `recompute failed: ${(error as Error)?.message || "unknown"}`,
        (error as Error)?.stack
      );

      throw new HttpException(
        `Recommendation recompute failed: ${(error as Error)?.message || "unknown error"}`,
        500
      );
    }
  }

  private async recomputeInternal(token: string | undefined): Promise<RecommendationRecomputeResponse> {
    const session = await this.requireStudentSession(token);
    const profile = await this.prisma.studentProfile.findUnique({
      where: {
        userId: session.user.id
      },
      include: {
        versions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!profile) {
      throw new BadRequestException("A student profile is required before recommendations can be computed.");
    }

    if (profile.completionStatus !== ProfileCompletionStatus.submitted) {
      throw new BadRequestException("Submit the student profile before recomputing recommendations.");
    }

    const careers = await this.prisma.career.findMany({
      where: {
        status: "active"
      },
      include: {
        category: true,
        detail: true
      },
      orderBy: {
        title: "asc"
      }
    });

    const scoredItems = careers
      .filter((career): career is CareerWithRequiredDetail => Boolean(career.detail))
      .map((career) => this.scoreCareer(profile, career))
      .sort((left, right) => right.fitScore - left.fitScore || left.rank - right.rank)
      .slice(0, 6)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));

    const { items, engineVersion } = await this.refineRecommendationsWithAi(profile, scoredItems);

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.recommendationSnapshot.create({
        data: {
          userId: session.user.id,
          studentProfileId: profile.id,
          engineVersion,
          profileVersionCount: profile.versions.length,
          itemsJson: items as unknown as Prisma.InputJsonValue,
          inputSummary: this.buildInputSummary(profile) as unknown as Prisma.InputJsonValue
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId: profile.tenantId,
          action: "recommendations.recomputed",
          entityType: "recommendation_snapshot",
          entityId: stored.id,
          metadata: {
            engineVersion,
            itemCount: items.length,
            profileVersionCount: profile.versions.length
          }
        }
      });

      return stored;
    });

    return {
      ok: true,
      snapshot: this.serializeSnapshot(snapshot)
    };
  }

  private async requireStudentSession(token: string | undefined): Promise<SessionRecord> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    const activeMembership = session.user.memberships.find((membership) => membership.status === "active") || null;

    if (activeMembership?.role === MembershipRole.school_admin) {
      throw new ForbiddenException("Student access required.");
    }

    return session;
  }

  private scoreCareer(profile: ProfileRecord, career: CareerWithRequiredDetail): RecommendationItem {
    const arrays = {
      favoriteSubjects: this.fromJsonArray(profile.favoriteSubjects),
      favoriteActivities: this.fromJsonArray(profile.favoriteActivities),
      topicsCuriousAbout: this.fromJsonArray(profile.topicsCuriousAbout),
      personalStrengths: this.fromJsonArray(profile.personalStrengths),
      avoidsOrDislikes: this.fromJsonArray(profile.avoidsOrDislikes)
    };

    const tokens = {
      favoriteSubjects: arrays.favoriteSubjects.flatMap((value) => this.tokenize(value)),
      favoriteActivities: arrays.favoriteActivities.flatMap((value) => this.tokenize(value)),
      topicsCuriousAbout: arrays.topicsCuriousAbout.flatMap((value) => this.tokenize(value)),
      personalStrengths: arrays.personalStrengths.flatMap((value) => this.tokenize(value)),
      avoidsOrDislikes: arrays.avoidsOrDislikes.flatMap((value) => this.tokenize(value))
    };

    const careerRecord = this.serializeCareer(career);
    const haystack = [
      career.title,
      career.summary,
      career.category.name,
      ...careerRecord.skills,
      ...careerRecord.positives,
      ...careerRecord.educationPath
    ]
      .join(" ")
      .toLowerCase();

    const reasons: string[] = [];
    const evidence = new Set<string>();
    let score = 35;

    const addReason = (points: number, reason: string, evidenceSource?: string[]) => {
      score += points;
      reasons.push(reason);
      (evidenceSource || []).forEach((item) => evidence.add(item));
    };

    const categorySlug = career.category.slug;
    const careerSlug = career.slug;

    if (this.hasAny(tokens.favoriteSubjects, ["math", "mathematics", "physics", "statistics"])) {
      if (["technology", "science-research", "business-finance"].includes(categorySlug)) {
        addReason(14, "Strong quantitative subjects align with this path.", arrays.favoriteSubjects);
      }

      if (["physician", "civil-services-officer"].includes(careerSlug)) {
        addReason(8, "Your subject mix supports disciplined analytical training.", arrays.favoriteSubjects);
      }
    }

    if (this.hasAny(tokens.favoriteSubjects, ["biology", "health", "chemistry"])) {
      if (categorySlug === "healthcare") {
        addReason(16, "Health and life-science interests map well to this field.", arrays.favoriteSubjects);
      }
    }

    if (this.hasAny(tokens.favoriteSubjects, ["english", "history", "civics", "politics", "economics"])) {
      if (["education", "public-service", "business-finance"].includes(categorySlug)) {
        addReason(10, "Your subject interests support communication-heavy and judgment-heavy roles.", arrays.favoriteSubjects);
      }
    }

    if (this.hasAny(tokens.favoriteActivities, ["coding", "building", "projects", "hack", "debug"])) {
      if (["software-engineer", "cybersecurity-analyst", "data-scientist"].includes(careerSlug)) {
        addReason(18, "Hands-on technical activities are a direct fit for this work.", arrays.favoriteActivities);
      }
    }

    if (this.hasAny(tokens.favoriteActivities, ["helping", "teaching", "mentoring", "supporting"])) {
      if (["teacher", "physician"].includes(careerSlug)) {
        addReason(14, "People-oriented activities connect well with this role.", arrays.favoriteActivities);
      }
    }

    if (this.hasAny(tokens.topicsCuriousAbout, ["ai", "systems", "software", "data", "security"])) {
      if (["software-engineer", "cybersecurity-analyst", "data-scientist"].includes(careerSlug)) {
        addReason(16, "Your curiosity areas match the core problems in this career.", arrays.topicsCuriousAbout);
      }
    }

    if (this.hasAny(tokens.topicsCuriousAbout, ["design", "users", "product", "creativity"])) {
      if (careerSlug === "ux-designer") {
        addReason(18, "Your curiosity points toward user experience and product thinking.", arrays.topicsCuriousAbout);
      }
    }

    if (this.hasAny(tokens.topicsCuriousAbout, ["finance", "markets", "business"])) {
      if (careerSlug === "financial-analyst") {
        addReason(18, "Your curiosity aligns with financial and business analysis.", arrays.topicsCuriousAbout);
      }
    }

    if (this.hasAny(tokens.personalStrengths, ["focus", "discipline", "consistency", "detail"])) {
      if (["software-engineer", "cybersecurity-analyst", "financial-analyst", "physician"].includes(careerSlug)) {
        addReason(12, "Your strengths fit the precision and consistency this path demands.", arrays.personalStrengths);
      }
    }

    if (this.hasAny(tokens.personalStrengths, ["communication", "empathy", "leadership", "guidance"])) {
      if (["teacher", "civil-services-officer", "physician", "ux-designer"].includes(careerSlug)) {
        addReason(12, "Your strengths support relationship-heavy and influence-heavy work.", arrays.personalStrengths);
      }
    }

    const overlap = this.countGenericOverlap(
      [...tokens.favoriteSubjects, ...tokens.favoriteActivities, ...tokens.topicsCuriousAbout, ...tokens.personalStrengths],
      haystack
    );

    if (overlap > 0) {
      addReason(Math.min(12, overlap * 3), "There is direct language overlap between your profile and this career.", [
        ...arrays.favoriteSubjects,
        ...arrays.favoriteActivities,
        ...arrays.topicsCuriousAbout,
        ...arrays.personalStrengths
      ]);
    }

    if (this.hasAny(tokens.avoidsOrDislikes, ["ambiguous", "unclear", "chaos", "pressure"])) {
      if (["teacher", "physician", "civil-services-officer"].includes(careerSlug)) {
        score -= 8;
        reasons.push("This role can involve ambiguity or pressure, which may need careful consideration.");
        arrays.avoidsOrDislikes.forEach((item) => evidence.add(item));
      }
    }

    const demandScore = this.numberField(careerRecord.outlookMeta, "demandScore");
    const resilienceScore = this.numberField(careerRecord.resilienceMeta, "score");

    score += Math.round(demandScore / 20);
    score += Math.round(resilienceScore / 25);
    score = Math.max(1, Math.min(99, score));

    if (reasons.length === 0) {
      reasons.push("This career remains a reasonable emerging option based on your submitted profile.");
    }

    return {
      rank: 0,
      fitScore: score,
      fitLabel: score >= 78 ? "high" : score >= 60 ? "medium" : "emerging",
      explanation: reasons[0],
      reasons: reasons.slice(0, 4),
      evidenceInputs: Array.from(evidence).slice(0, 6),
      engineVersion: fallbackRecommendationEngineVersion,
      career: careerRecord
    };
  }

  private async refineRecommendationsWithAi(
    profile: ProfileRecord,
    baseItems: RecommendationItem[]
  ): Promise<{ items: RecommendationItem[]; engineVersion: string }> {
    if (!this.llmService.isConfigured()) {
      return {
        items: baseItems.slice(0, 5),
        engineVersion: fallbackRecommendationEngineVersion
      };
    }

    const schema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              careerSlug: { type: "string" },
              fitScore: { type: "integer" },
              explanation: { type: "string" },
              reasons: {
                type: "array",
                items: { type: "string" }
              },
              evidenceInputs: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["careerSlug", "fitScore", "explanation", "reasons", "evidenceInputs"]
          }
        }
      },
      required: ["items"]
    };

    const profileSummary = {
      gradeLevel: profile.gradeLevel,
      ageBand: profile.ageBand,
      favoriteSubjects: this.fromJsonArray(profile.favoriteSubjects),
      favoriteActivities: this.fromJsonArray(profile.favoriteActivities),
      topicsCuriousAbout: this.fromJsonArray(profile.topicsCuriousAbout),
      personalStrengths: this.fromJsonArray(profile.personalStrengths),
      avoidsOrDislikes: this.fromJsonArray(profile.avoidsOrDislikes)
    };

    const response = await this.llmService.generateStructuredJson<{
      items: Array<{
        careerSlug: string;
        fitScore: number;
        explanation: string;
        reasons: string[];
        evidenceInputs: string[];
      }>;
    }>({
      systemInstruction:
        "You rank student career recommendations for a school-safe platform. Use behavior, motivation, curiosity, resilience, independence, communication, and discipline signals. Do not ask for or assume technical expertise. Return only the requested JSON.",
      prompt: [
        "Refine these draft career recommendations for a student.",
        "Use the submitted profile as the main evidence.",
        "Keep scores realistic from 1 to 99 and keep the output ranked from best fit to lowest fit.",
        "Focus on behavioral fit, character signals, discipline, resilience, and lifestyle fit, not technical knowledge.",
        `Student profile: ${JSON.stringify(profileSummary)}`,
        `Draft recommendation candidates: ${JSON.stringify(
          baseItems.map((item) => ({
            careerSlug: item.career.slug,
            careerTitle: item.career.title,
            category: item.career.category.name,
            summary: item.career.summary,
            draftFitScore: item.fitScore,
            skills: item.career.skills,
            positives: item.career.positives,
            challenges: item.career.challenges,
            draftReasons: item.reasons
          }))
        )}`
      ].join("\n"),
      schema,
      temperature: 0.5
    }).catch(() => null);

    if (!response?.items?.length) {
      return {
        items: baseItems.slice(0, 5),
        engineVersion: fallbackRecommendationEngineVersion
      };
    }

    const bySlug = new Map(baseItems.map((item) => [item.career.slug, item]));
    const refinedItems = response.items
      .map((item, index) => {
        const baseItem = bySlug.get(item.careerSlug);

        if (!baseItem) {
          return null;
        }

        return {
          ...baseItem,
          rank: index + 1,
          fitScore: Math.max(1, Math.min(99, Math.round(item.fitScore))),
          fitLabel:
            item.fitScore >= 78 ? "high" : item.fitScore >= 60 ? "medium" : "emerging",
          explanation: item.explanation,
          reasons: item.reasons.slice(0, 4),
          evidenceInputs: item.evidenceInputs.slice(0, 6),
          engineVersion: "gemini-v1"
        } satisfies RecommendationItem;
      })
      .filter((item): item is RecommendationItem => Boolean(item))
      .slice(0, 5);

    return refinedItems.length
      ? {
          items: refinedItems,
          engineVersion: "gemini-v1"
        }
      : {
          items: baseItems.slice(0, 5),
          engineVersion: fallbackRecommendationEngineVersion
        };
  }

  private serializeSnapshot(snapshot: RecommendationSnapshotModel): RecommendationSnapshot {
    const items = Array.isArray(snapshot.itemsJson) ? (snapshot.itemsJson as unknown as RecommendationItem[]) : [];
    const inputSummary = Array.isArray(snapshot.inputSummary)
      ? snapshot.inputSummary.map((item: unknown) => String(item))
      : [];

    return {
      id: snapshot.id,
      userId: snapshot.userId,
      studentProfileId: snapshot.studentProfileId,
      profileVersionCount: snapshot.profileVersionCount,
      engineVersion: snapshot.engineVersion,
      inputSummary,
      createdAt: snapshot.createdAt.toISOString(),
      items
    };
  }

  private serializeCareer(career: CareerWithRequiredDetail): CareerRecord {
    return {
      id: career.id,
      slug: career.slug,
      title: career.title,
      summary: career.summary,
      category: {
        id: career.category.id,
        slug: career.category.slug,
        name: career.category.name
      },
      educationPath: this.fromJsonArray(career.detail.educationPath),
      skills: this.fromJsonArray(career.detail.skills),
      positives: this.fromJsonArray(career.detail.positives),
      challenges: this.fromJsonArray(career.detail.challenges),
      drawbacks: this.fromJsonArray(career.detail.drawbacks),
      salaryMeta: this.jsonToRecord(career.detail.salaryMeta),
      outlookMeta: this.jsonToRecord(career.detail.outlookMeta),
      resilienceMeta: this.jsonToRecord(career.detail.resilienceMeta),
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString()
    };
  }

  private buildInputSummary(profile: ProfileRecord): string[] {
    return [
      ...this.fromJsonArray(profile.favoriteSubjects),
      ...this.fromJsonArray(profile.favoriteActivities),
      ...this.fromJsonArray(profile.topicsCuriousAbout),
      ...this.fromJsonArray(profile.personalStrengths)
    ].slice(0, 12);
  }

  private fromJsonArray(value: Prisma.JsonValue | null | undefined): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private jsonToRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  private hasAny(tokens: string[], targets: string[]): boolean {
    return targets.some((target) => tokens.includes(target));
  }

  private countGenericOverlap(tokens: string[], haystack: string): number {
    return Array.from(new Set(tokens)).filter((token) => token.length > 2 && haystack.includes(token)).length;
  }

  private numberField(value: Record<string, unknown>, key: string): number {
    const field = value[key];
    return typeof field === "number" ? field : 0;
  }
}
