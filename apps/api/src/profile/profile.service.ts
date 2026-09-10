import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MembershipRole, Prisma, ProfileCompletionStatus } from "@prisma/client";

import type {
  ProfileSubmitResponse,
  ProfileUpdatePayload,
  StudentProfileResponse
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

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

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getCurrentProfile(token: string | undefined): Promise<StudentProfileResponse> {
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

    return {
      profile: profile ? this.serializeProfile(profile) : null
    };
  }

  async upsertProfile(token: string | undefined, payload: ProfileUpdatePayload): Promise<StudentProfileResponse> {
    const session = await this.requireStudentSession(token);
    const tenantId = session.user.memberships.find((membership) => membership.status === "active")?.tenantId || null;

    const profile = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.studentProfile.findUnique({
        where: {
          userId: session.user.id
        }
      });

      const data = {
        userId: session.user.id,
        tenantId,
        gradeLevel: payload.gradeLevel || null,
        ageBand: payload.ageBand || null,
        favoriteSubjects: this.toJsonArray(payload.favoriteSubjects),
        favoriteActivities: this.toJsonArray(payload.favoriteActivities),
        topicsCuriousAbout: this.toJsonArray(payload.topicsCuriousAbout),
        personalStrengths: this.toJsonArray(payload.personalStrengths),
        avoidsOrDislikes: this.toJsonArray(payload.avoidsOrDislikes)
      };

      const stored = existing
        ? await tx.studentProfile.update({
            where: { id: existing.id },
            data
          })
        : await tx.studentProfile.create({
            data
          });

      await tx.profileVersion.create({
        data: {
          studentProfileId: stored.id,
          createdByUserId: session.user.id,
          snapshot: {
            ...data,
            completionStatus: stored.completionStatus,
            submittedAt: stored.submittedAt?.toISOString() || null
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId,
          action: existing ? "profile.updated" : "profile.created",
          entityType: "student_profile",
          entityId: stored.id
        }
      });

      return tx.studentProfile.findUniqueOrThrow({
        where: {
          id: stored.id
        },
        include: {
          versions: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });
    });

    return {
      profile: this.serializeProfile(profile)
    };
  }

  async submitProfile(token: string | undefined): Promise<ProfileSubmitResponse> {
    const session = await this.requireStudentSession(token);
    const existing = await this.prisma.studentProfile.findUnique({
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

    if (!existing) {
      throw new NotFoundException("Profile not found.");
    }

    if (!existing.gradeLevel || !existing.ageBand) {
      throw new BadRequestException("Grade level and age band are required before submission.");
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.studentProfile.update({
        where: {
          id: existing.id
        },
        data: {
          completionStatus: ProfileCompletionStatus.submitted,
          submittedAt: new Date()
        }
      });

      await tx.profileVersion.create({
        data: {
          studentProfileId: stored.id,
          createdByUserId: session.user.id,
          snapshot: {
            gradeLevel: stored.gradeLevel,
            ageBand: stored.ageBand,
            favoriteSubjects: stored.favoriteSubjects,
            favoriteActivities: stored.favoriteActivities,
            topicsCuriousAbout: stored.topicsCuriousAbout,
            personalStrengths: stored.personalStrengths,
            avoidsOrDislikes: stored.avoidsOrDislikes,
            completionStatus: stored.completionStatus,
            submittedAt: stored.submittedAt?.toISOString() || null
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId: stored.tenantId,
          action: "profile.submitted",
          entityType: "student_profile",
          entityId: stored.id
        }
      });

      return tx.studentProfile.findUniqueOrThrow({
        where: {
          id: stored.id
        },
        include: {
          versions: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });
    });

    return {
      ok: true,
      profile: this.serializeProfile(submitted)
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

  private toJsonArray(value: string[]): Prisma.InputJsonValue {
    return value.filter(Boolean);
  }

  private serializeProfile(
    profile: Prisma.StudentProfileGetPayload<{
      include: {
        versions: true;
      };
    }>
  ): NonNullable<StudentProfileResponse["profile"]> {
    return {
      id: profile.id,
      userId: profile.userId,
      tenantId: profile.tenantId,
      gradeLevel: profile.gradeLevel,
      ageBand: profile.ageBand,
      favoriteSubjects: this.fromJsonArray(profile.favoriteSubjects),
      favoriteActivities: this.fromJsonArray(profile.favoriteActivities),
      topicsCuriousAbout: this.fromJsonArray(profile.topicsCuriousAbout),
      personalStrengths: this.fromJsonArray(profile.personalStrengths),
      avoidsOrDislikes: this.fromJsonArray(profile.avoidsOrDislikes),
      completionStatus: profile.completionStatus,
      submittedAt: profile.submittedAt?.toISOString() || null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      versionCount: profile.versions.length,
      cachedAssessmentResult: this.parseAssessmentResult(profile.assessmentResultJson),
      cachedAssessmentQuestions: this.parseAssessmentQuestions(profile.assessmentQuestionsJson)
    };
  }

  private parseAssessmentResult(value: Prisma.JsonValue | null | undefined): import("@career-pilot/types").ProfileAssessmentResult | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (typeof raw.overallScore !== "number") return null;
    return raw as unknown as import("@career-pilot/types").ProfileAssessmentResult;
  }

  private parseAssessmentQuestions(value: Prisma.JsonValue | null | undefined): import("@career-pilot/types").ProofQuestionSet | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) return null;
    return raw as unknown as import("@career-pilot/types").ProofQuestionSet;
  }

  private fromJsonArray(value: Prisma.JsonValue | null): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }
}
