import { createHash, randomBytes } from "node:crypto";

import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MembershipRole, ProofSessionStatus, ReportStatus, ReportType, type Prisma } from "@prisma/client";

import type {
  GenerateSchoolReportJobPayload,
  GenerateStudentReportJobPayload,
  ParentShareSummary,
  ParentSharedReportResponse,
  ProofResult,
  ProofSessionRecord,
  RecommendationItem,
  RecommendationSnapshot,
  SchoolDurableReportPayload,
  SchoolGenerateReportResponse,
  SchoolLatestReportResponse,
  SchoolReportRecord,
  SchoolStudentDetailResponse,
  SchoolStudentsResponse,
  SessionTenantSummary,
  StudentDurableReportPayload,
  StudentGenerateReportResponse,
  StudentLatestReportResponse,
  StudentProfile,
  StudentReportRecord,
  StudentShareCreateResponse,
  StudentShareRevokeResponse
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";

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

type StudentMembershipRecord = Prisma.TenantMembershipGetPayload<{
  include: {
    user: {
      include: {
        studentProfile: {
          include: {
            versions: true;
          };
        };
        recommendationSnapshots: true;
        proofSessions: {
          include: {
            career: {
              include: {
                category: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type StudentReportRecordDb = Prisma.ReportGetPayload<{
  include: {
    shares: true;
  };
}>;

const STUDENT_REPORT_VERSION = "student-report-v1";
const SCHOOL_REPORT_VERSION = "school-report-v1";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  /**
   * Grace period after a report is queued before the read path will self-heal
   * it. Gives a healthy worker first crack; only kicks in when the worker tier
   * is degraded or absent.
   */
  private static readonly REPORT_GRACE_MS = 8_000;
  /** Report ids with an in-process self-heal already running (dedupes rapid polling). */
  private readonly reconcilingReports = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService
  ) {}

  async getLatestStudentReport(token: string | undefined): Promise<StudentLatestReportResponse> {
    const session = await this.requireSession(token);
    const report = await this.prisma.report.findFirst({
      where: {
        userId: session.user.id,
        reportType: ReportType.student
      },
      include: {
        shares: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    this.reconcileReport(report, () => this.runStudentReportGeneration(report!.id));

    return {
      report: await this.serializeStudentReportRecord(report)
    };
  }

  /**
   * Queues student report generation and returns immediately with a `queued`
   * report. The worker performs generation and uploads the export to object
   * storage; clients poll `GET /reports/student/latest` until `ready`. If the
   * queue is unavailable we fall back to inline generation so the user is never
   * blocked by a degraded worker tier.
   */
  async generateStudentReport(token: string | undefined): Promise<StudentGenerateReportResponse> {
    const session = await this.requireSession(token);
    const activeTenantMembership = session.user.memberships.find(
      (membership) => membership.role === MembershipRole.student && membership.status === "active"
    );

    const report = await this.prisma.report.create({
      data: {
        userId: session.user.id,
        tenantId: activeTenantMembership?.tenantId || null,
        reportType: ReportType.student,
        status: ReportStatus.queued,
        version: STUDENT_REPORT_VERSION
      },
      include: {
        shares: true
      }
    });

    const enqueued = await this.queueService.enqueue<GenerateStudentReportJobPayload>(
      QUEUE_NAMES.reports,
      JOB_NAMES.generateStudentReport,
      { reportId: report.id, userId: session.user.id },
      { idempotencyKey: `report:student:${report.id}` }
    );

    if (!enqueued) {
      this.logger.warn(`Reports queue unavailable; generating student report ${report.id} inline.`);
      const generated = await this.runStudentReportGeneration(report.id);
      return { ok: true, report: (await this.serializeStudentReportRecord(generated))! };
    }

    return {
      ok: true,
      report: (await this.serializeStudentReportRecord(report))!
    };
  }

  /**
   * Performs student report generation: builds the payload, uploads the export
   * to object storage, and marks the report ready. Invoked by the worker
   * processor (and inline as a fallback). Idempotent — a report already `ready`
   * is returned unchanged. On failure the report is marked `failed` and the
   * error rethrown so the queue retries.
   */
  async runStudentReportGeneration(reportId: string): Promise<StudentReportRecordDb> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { shares: { orderBy: { createdAt: "desc" } } }
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found.`);
    }
    if (report.status === ReportStatus.ready) {
      return report;
    }

    try {
      const payload = await this.buildStudentReportPayload(report.userId);
      const fileKey = `reports/student/${reportId}.json`;
      await this.storageService.putObject({
        key: fileKey,
        body: JSON.stringify(payload),
        contentType: "application/json"
      });

      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.ready,
          reportJson: payload as unknown as Prisma.InputJsonValue,
          fileKey,
          fileUrl: null,
          errorMessage: null
        },
        include: { shares: { orderBy: { createdAt: "desc" } } }
      });

      await this.prisma.auditLog.create({
        data: {
          actorUserId: updated.userId,
          tenantId: updated.tenantId,
          action: "report.student_generated",
          entityType: "report",
          entityId: updated.id,
          metadata: { reportType: "student", version: updated.version }
        }
      });

      return updated;
    } catch (error) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.failed,
          errorMessage: error instanceof Error ? error.message : "Report generation failed."
        }
      });
      throw error;
    }
  }

  async createStudentReportShare(
    token: string | undefined,
    expiresInDays?: number
  ): Promise<StudentShareCreateResponse> {
    const session = await this.requireSession(token);
    const report = await this.requireLatestReadyStudentReport(session.user.id);
    const ttlDays = Math.min(30, Math.max(1, expiresInDays || 14));
    const rawToken = randomBytes(24).toString("base64url");
    const share = await this.prisma.reportShare.create({
      data: {
        reportId: report.id,
        tokenHash: this.hashShareToken(rawToken),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        tenantId: report.tenantId,
        action: "report.share_created",
        entityType: "report_share",
        entityId: share.id,
        metadata: {
          reportId: report.id,
          expiresAt: share.expiresAt.toISOString()
        }
      }
    });

    return {
      ok: true,
      share: this.serializeShare(share, rawToken, report.id)
    };
  }

  async revokeStudentReportShare(
    token: string | undefined,
    shareId: string
  ): Promise<StudentShareRevokeResponse> {
    const session = await this.requireSession(token);
    const share = await this.prisma.reportShare.findFirst({
      where: {
        id: shareId,
        report: {
          userId: session.user.id,
          reportType: ReportType.student
        }
      },
      include: {
        report: true
      }
    });

    if (!share) {
      throw new NotFoundException("Share link not found.");
    }

    const updated = await this.prisma.reportShare.update({
      where: {
        id: share.id
      },
      data: {
        revokedAt: share.revokedAt || new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        tenantId: share.report.tenantId,
        action: "report.share_revoked",
        entityType: "report_share",
        entityId: updated.id,
        metadata: {
          reportId: share.report.id
        }
      }
    });

    return {
      ok: true,
      share: this.serializeShare(updated, null, share.report.id)
    };
  }

  async getParentSharedReport(rawToken: string): Promise<ParentSharedReportResponse> {
    const share = await this.prisma.reportShare.findFirst({
      where: {
        tokenHash: this.hashShareToken(rawToken)
      },
      include: {
        report: {
          include: {
            shares: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        }
      }
    });

    if (!share || share.revokedAt || share.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException("Share link is invalid or expired.");
    }

    if (share.report.reportType !== ReportType.student || share.report.status !== ReportStatus.ready) {
      throw new NotFoundException("Shared report is unavailable.");
    }

    return {
      share: this.serializeShare(share, rawToken, share.report.id),
      report: (await this.serializeStudentReportRecord(share.report))!
    };
  }

  async getLatestSchoolReport(token: string | undefined, tenantId: string): Promise<SchoolLatestReportResponse> {
    const session = await this.requireSchoolAdminSession(token, tenantId);
    const tenant = this.toTenantSummary(session, tenantId);
    const report = await this.prisma.report.findFirst({
      where: {
        tenantId,
        reportType: ReportType.school
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    this.reconcileReport(report, () => this.runSchoolReportGeneration(report!.id));

    return {
      tenant,
      report: await this.serializeSchoolReportRecord(report)
    };
  }

  async generateSchoolReport(token: string | undefined, tenantId: string): Promise<SchoolGenerateReportResponse> {
    const session = await this.requireSchoolAdminSession(token, tenantId);
    const tenant = this.toTenantSummary(session, tenantId);
    const report = await this.prisma.report.create({
      data: {
        userId: session.user.id,
        tenantId,
        reportType: ReportType.school,
        status: ReportStatus.queued,
        version: SCHOOL_REPORT_VERSION
      }
    });

    const enqueued = await this.queueService.enqueue<GenerateSchoolReportJobPayload>(
      QUEUE_NAMES.reports,
      JOB_NAMES.generateSchoolReport,
      { reportId: report.id, tenantId },
      { idempotencyKey: `report:school:${report.id}` }
    );

    if (!enqueued) {
      this.logger.warn(`Reports queue unavailable; generating school report ${report.id} inline.`);
      const generated = await this.runSchoolReportGeneration(report.id);
      return { ok: true, tenant, report: (await this.serializeSchoolReportRecord(generated))! };
    }

    return {
      ok: true,
      tenant,
      report: (await this.serializeSchoolReportRecord(report))!
    };
  }

  /**
   * Performs school report generation. Self-contained (worker-callable) — it
   * reconstructs the tenant summary from the database rather than a session.
   * Idempotent and marks `failed` on error so the queue retries.
   */
  async runSchoolReportGeneration(reportId: string): Promise<Prisma.ReportGetPayload<object>> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found.`);
    }
    if (!report.tenantId) {
      throw new NotFoundException(`Report ${reportId} has no tenant.`);
    }
    if (report.status === ReportStatus.ready) {
      return report;
    }

    try {
      const tenantRecord = await this.prisma.tenant.findUnique({ where: { id: report.tenantId } });
      if (!tenantRecord) {
        throw new NotFoundException("Tenant not found.");
      }
      const tenant: SessionTenantSummary = {
        id: tenantRecord.id,
        name: tenantRecord.name,
        slug: tenantRecord.slug,
        type: tenantRecord.type,
        status: tenantRecord.status
      };

      const payload = await this.buildSchoolReportPayload(report.tenantId, tenant);
      const fileKey = `reports/school/${reportId}.json`;
      await this.storageService.putObject({
        key: fileKey,
        body: JSON.stringify(payload),
        contentType: "application/json"
      });

      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.ready,
          reportJson: payload as unknown as Prisma.InputJsonValue,
          fileKey,
          fileUrl: null,
          errorMessage: null
        }
      });

      await this.prisma.auditLog.create({
        data: {
          actorUserId: updated.userId,
          tenantId: report.tenantId,
          action: "report.school_generated",
          entityType: "report",
          entityId: updated.id,
          metadata: { reportType: "school", version: updated.version }
        }
      });

      return updated;
    } catch (error) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.failed,
          errorMessage: error instanceof Error ? error.message : "Report generation failed."
        }
      });
      throw error;
    }
  }

  async getSchoolStudents(
    token: string | undefined,
    tenantId: string,
    params?: {
      q?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<SchoolStudentsResponse> {
    const session = await this.requireSchoolAdminSession(token, tenantId);
    const tenant = this.toTenantSummary(session, tenantId);
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(50, Math.max(1, params?.pageSize || 10));
    const where: Prisma.TenantMembershipWhereInput = {
      tenantId,
      role: MembershipRole.student,
      status: "active",
      ...(params?.q
        ? {
            user: {
              OR: [
                {
                  fullName: {
                    contains: params.q,
                    mode: "insensitive"
                  }
                },
                {
                  email: {
                    contains: params.q,
                    mode: "insensitive"
                  }
                }
              ]
            }
          }
        : {})
    };

    const memberships = await this.getStudentMemberships(where, {
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    const total = await this.prisma.tenantMembership.count({ where });

    return {
      tenant,
      page,
      pageSize,
      total,
      students: memberships.map((membership: StudentMembershipRecord) => {
        const latestRecommendation = membership.user.recommendationSnapshots[0] || null;
        const topRecommendation = this.readRecommendationSnapshot(latestRecommendation)?.items[0] || null;
        const completedProofSessions = membership.user.proofSessions.filter(
          (session) => session.status === ProofSessionStatus.completed
        );
        const latestProof = completedProofSessions[0] || null;
        const latestProofResult = this.readProofResult(latestProof?.resultJson);

        return {
          id: membership.user.id,
          fullName: membership.user.fullName,
          email: membership.user.email,
          joinedAt: membership.createdAt.toISOString(),
          profileCompletionStatus: membership.user.studentProfile?.completionStatus || null,
          recommendationStatus: latestRecommendation ? "ready" : "missing",
          latestRecommendationCreatedAt: latestRecommendation?.createdAt.toISOString() || null,
          topRecommendationTitle: topRecommendation?.career.title || null,
          completedProofSessions: completedProofSessions.length,
          latestProofReadinessBand: latestProofResult?.readinessBand || null
        };
      })
    };
  }

  async getSchoolStudentDetail(
    token: string | undefined,
    tenantId: string,
    studentId: string
  ): Promise<SchoolStudentDetailResponse> {
    const session = await this.requireSchoolAdminSession(token, tenantId);
    const tenant = this.toTenantSummary(session, tenantId);
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        userId: studentId,
        role: MembershipRole.student,
        status: "active"
      },
      include: {
        user: {
          include: {
            studentProfile: {
              include: {
                versions: true
              }
            },
            recommendationSnapshots: {
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            },
            proofSessions: {
              where: {
                status: ProofSessionStatus.completed
              },
              include: {
                career: {
                  include: {
                    category: true
                  }
                }
              },
              orderBy: {
                completedAt: "desc"
              },
              take: 10
            }
          }
        }
      }
    });

    if (!membership) {
      throw new NotFoundException("Student not found in this school.");
    }

    return {
      tenant,
      report: {
        student: {
          id: membership.user.id,
          fullName: membership.user.fullName,
          email: membership.user.email,
          joinedAt: membership.createdAt.toISOString()
        },
        profile: membership.user.studentProfile ? this.serializeProfile(membership.user.studentProfile) : null,
        latestRecommendation: this.readRecommendationSnapshot(membership.user.recommendationSnapshots[0]),
        proofSessions: membership.user.proofSessions.map((session) => this.serializeProofSession(session))
      }
    };
  }

  private async buildStudentReportPayload(userId: string): Promise<StudentDurableReportPayload> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        },
        studentProfile: {
          include: {
            versions: true
          }
        },
        recommendationSnapshots: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        proofSessions: {
          where: {
            status: ProofSessionStatus.completed
          },
          include: {
            career: {
              include: {
                category: true
              }
            }
          },
          orderBy: {
            completedAt: "desc"
          },
          take: 1
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const activeMembership = user.memberships.find((membership) => membership.status === "active");
    const latestRecommendation = this.readRecommendationSnapshot(user.recommendationSnapshots[0]);
    const topRecommendation = latestRecommendation?.items[0] || null;
    const latestProofSession = user.proofSessions[0] ? this.serializeProofSession(user.proofSessions[0]) : null;
    const latestProofResult = latestProofSession?.result || null;

    return {
      generatedAt: new Date().toISOString(),
      student: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        joinedAt: user.createdAt.toISOString()
      },
      profileCompletionStatus: user.studentProfile?.completionStatus || null,
      topRecommendationTitle: topRecommendation?.career.title || null,
      recommendationCreatedAt: latestRecommendation?.createdAt || null,
      recommendationHighlights: latestRecommendation
        ? latestRecommendation.items.slice(0, 3).map((item) => `${item.career.title}: ${item.explanation}`)
        : activeMembership
          ? [`${activeMembership.tenant.name} can now review this student once recommendations are generated.`]
          : ["Complete the profile and generate recommendations to unlock the report."],
      proofReadinessBand: latestProofResult?.readinessBand || null,
      proofConfidenceScore: latestProofResult?.overallScore || null,
      parentSummary: latestProofResult?.parentSummary || null,
      schoolSummary: latestProofResult?.schoolSummary || null,
      strengths: latestProofResult?.strengths || topRecommendation?.reasons || [],
      risks: latestProofResult?.risks || [],
      nextSteps:
        latestProofResult?.nextSteps ||
        (topRecommendation
          ? [
              `Explore ${topRecommendation.career.title} in detail.`,
              "Discuss the recommendation fit with a parent or mentor.",
              "Complete a proof session to validate readiness."
            ]
          : ["Complete the student profile.", "Generate recommendations.", "Start a proof session for a target career."])
    };
  }

  private async buildSchoolReportPayload(
    tenantId: string,
    tenant: SessionTenantSummary
  ): Promise<SchoolDurableReportPayload> {
    const memberships = await this.getStudentMemberships({
      tenantId,
      role: MembershipRole.student,
      status: "active"
    });

    const readinessBandBreakdown: Record<string, number> = {};
    const topCareerCounts = new Map<string, number>();
    const studentsNeedingAttention: SchoolDurableReportPayload["studentsNeedingAttention"] = [];

    for (const membership of memberships) {
      const latestRecommendation = this.readRecommendationSnapshot(membership.user.recommendationSnapshots[0]);
      const latestProof = membership.user.proofSessions[0] || null;
      const latestProofResult = this.readProofResult(latestProof?.resultJson);
      const topRecommendation = latestRecommendation?.items[0] || null;

      if (latestProofResult?.readinessBand) {
        readinessBandBreakdown[latestProofResult.readinessBand] =
          (readinessBandBreakdown[latestProofResult.readinessBand] || 0) + 1;
      }

      if (topRecommendation?.career.title) {
        topCareerCounts.set(topRecommendation.career.title, (topCareerCounts.get(topRecommendation.career.title) || 0) + 1);
      }

      const attentionReason = this.getAttentionReason(membership, latestRecommendation, latestProofResult);
      if (attentionReason) {
        studentsNeedingAttention.push({
          id: membership.user.id,
          fullName: membership.user.fullName,
          reason: attentionReason
        });
      }
    }

    const topCareerTitles = [...topCareerCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([title]) => title);

    return {
      generatedAt: new Date().toISOString(),
      tenant,
      totals: {
        students: memberships.length,
        profilesSubmitted: memberships.filter((membership) => membership.user.studentProfile?.completionStatus === "submitted")
          .length,
        recommendationsReady: memberships.filter((membership) => membership.user.recommendationSnapshots.length > 0).length,
        proofSessionsCompleted: memberships.reduce(
          (sum, membership) =>
            sum +
            membership.user.proofSessions.filter((session) => session.status === ProofSessionStatus.completed).length,
          0
        )
      },
      readinessBandBreakdown,
      topCareerTitles,
      studentsNeedingAttention: studentsNeedingAttention.slice(0, 8)
    };
  }

  private getAttentionReason(
    membership: StudentMembershipRecord,
    latestRecommendation: RecommendationSnapshot | null,
    latestProofResult: ProofResult | null
  ): string | null {
    if (!membership.user.studentProfile || membership.user.studentProfile.completionStatus !== "submitted") {
      return "Profile not submitted yet.";
    }

    if (!latestRecommendation) {
      return "Recommendations have not been generated.";
    }

    if (!latestProofResult) {
      return "No completed proof session yet.";
    }

    if (latestProofResult.readinessBand.toLowerCase() === "emerging") {
      return "Latest proof session shows emerging readiness.";
    }

    return null;
  }

  private async requireLatestReadyStudentReport(userId: string): Promise<StudentReportRecordDb> {
    const report = await this.prisma.report.findFirst({
      where: {
        userId,
        reportType: ReportType.student,
        status: ReportStatus.ready
      },
      include: {
        shares: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!report) {
      throw new NotFoundException("Generate a report before creating a share link.");
    }

    return report;
  }

  private async serializeStudentReportRecord(
    report: StudentReportRecordDb | null | undefined
  ): Promise<StudentReportRecord | null> {
    if (!report) {
      return null;
    }

    return {
      id: report.id,
      reportType: "student",
      status: report.status,
      version: report.version,
      fileUrl: await this.signedFileUrl(report),
      errorMessage: report.errorMessage || null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      report: this.readStudentReportPayload(report.reportJson),
      shares: report.shares.map((share) => this.serializeShare(share, null, report.id))
    };
  }

  private async serializeSchoolReportRecord(
    report: Prisma.ReportGetPayload<object> | null | undefined
  ): Promise<SchoolReportRecord | null> {
    if (!report) {
      return null;
    }

    return {
      id: report.id,
      reportType: "school",
      status: report.status,
      version: report.version,
      fileUrl: await this.signedFileUrl(report),
      errorMessage: report.errorMessage || null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      report: this.readSchoolReportPayload(report.reportJson)
    };
  }

  /**
   * Returns a fresh, short-lived signed download URL for the report export,
   * computed on read so it never expires in storage. Falls back to the legacy
   * `fileUrl` column for any rows generated before object storage.
   */
  private async signedFileUrl(report: { fileKey: string | null; fileUrl: string | null }): Promise<string | null> {
    if (report.fileKey) {
      const { url } = await this.storageService.createSignedDownload(report.fileKey);
      return url;
    }
    return report.fileUrl || null;
  }

  private serializeShare(
    share: Prisma.ReportShareGetPayload<object>,
    rawToken: string | null,
    reportId: string
  ): ParentShareSummary {
    return {
      id: share.id,
      reportId,
      publicUrl: rawToken ? `${this.getAppBaseUrl()}/parent/report/${rawToken}` : null,
      expiresAt: share.expiresAt.toISOString(),
      revokedAt: share.revokedAt?.toISOString() || null,
      createdAt: share.createdAt.toISOString(),
      isActive: !share.revokedAt && share.expiresAt.getTime() > Date.now()
    };
  }

  private readStudentReportPayload(value: Prisma.JsonValue | null | undefined): StudentDurableReportPayload | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const studentRaw =
      raw.student && typeof raw.student === "object" && !Array.isArray(raw.student)
        ? (raw.student as Record<string, unknown>)
        : {};

    return {
      generatedAt: String(raw.generatedAt || ""),
      student: {
        id: String(studentRaw.id || ""),
        fullName: String(studentRaw.fullName || ""),
        email: String(studentRaw.email || ""),
        joinedAt: String(studentRaw.joinedAt || "")
      },
      profileCompletionStatus:
        raw.profileCompletionStatus === "submitted" || raw.profileCompletionStatus === "draft"
          ? raw.profileCompletionStatus
          : null,
      topRecommendationTitle: raw.topRecommendationTitle ? String(raw.topRecommendationTitle) : null,
      recommendationCreatedAt: raw.recommendationCreatedAt ? String(raw.recommendationCreatedAt) : null,
      recommendationHighlights: this.readStringArray(raw.recommendationHighlights),
      proofReadinessBand: raw.proofReadinessBand ? String(raw.proofReadinessBand) : null,
      proofConfidenceScore: typeof raw.proofConfidenceScore === "number" ? raw.proofConfidenceScore : null,
      parentSummary: raw.parentSummary ? String(raw.parentSummary) : null,
      schoolSummary: raw.schoolSummary ? String(raw.schoolSummary) : null,
      strengths: this.readStringArray(raw.strengths),
      risks: this.readStringArray(raw.risks),
      nextSteps: this.readStringArray(raw.nextSteps)
    };
  }

  private readSchoolReportPayload(value: Prisma.JsonValue | null | undefined): SchoolDurableReportPayload | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const totalsRaw =
      raw.totals && typeof raw.totals === "object" && !Array.isArray(raw.totals)
        ? (raw.totals as Record<string, unknown>)
        : {};
    const tenantRaw =
      raw.tenant && typeof raw.tenant === "object" && !Array.isArray(raw.tenant)
        ? (raw.tenant as Record<string, unknown>)
        : {};
    const readinessRaw =
      raw.readinessBandBreakdown && typeof raw.readinessBandBreakdown === "object" && !Array.isArray(raw.readinessBandBreakdown)
        ? (raw.readinessBandBreakdown as Record<string, unknown>)
        : {};
    const studentsNeedingAttentionRaw = Array.isArray(raw.studentsNeedingAttention) ? raw.studentsNeedingAttention : [];

    return {
      generatedAt: String(raw.generatedAt || ""),
      tenant: {
        id: String(tenantRaw.id || ""),
        name: String(tenantRaw.name || ""),
        slug: String(tenantRaw.slug || ""),
        type: tenantRaw.type === "school" ? "school" : "school",
        status: tenantRaw.status === "suspended" ? "suspended" : "active"
      },
      totals: {
        students: Number(totalsRaw.students || 0),
        profilesSubmitted: Number(totalsRaw.profilesSubmitted || 0),
        recommendationsReady: Number(totalsRaw.recommendationsReady || 0),
        proofSessionsCompleted: Number(totalsRaw.proofSessionsCompleted || 0)
      },
      readinessBandBreakdown: Object.fromEntries(
        Object.entries(readinessRaw).map(([key, item]) => [key, Number(item || 0)])
      ),
      topCareerTitles: this.readStringArray(raw.topCareerTitles),
      studentsNeedingAttention: studentsNeedingAttentionRaw.map((item) => {
        const record = item as Record<string, unknown>;
        return {
          id: String(record.id || ""),
          fullName: String(record.fullName || ""),
          reason: String(record.reason || "")
        };
      })
    };
  }

  /**
   * Read-path self-heal. If the latest report is still `queued` past the grace
   * window, the worker tier never processed (or lost) the job. Re-run
   * generation inline so the client poll is never infinite. The generation
   * methods are idempotent — they no-op once a report is `ready` — so a healthy
   * worker finishing concurrently is safe. Fire-and-forget: the GET stays fast
   * and the next poll observes the result. `failed` reports are left terminal
   * so a deterministic failure surfaces its error instead of looping forever.
   */
  private reconcileReport(
    report: { id: string; status: ReportStatus; createdAt: Date } | null | undefined,
    run: () => Promise<unknown>
  ): void {
    if (!report || report.status !== ReportStatus.queued) {
      return;
    }
    if (Date.now() - report.createdAt.getTime() < ReportsService.REPORT_GRACE_MS) {
      return;
    }
    if (this.reconcilingReports.has(report.id)) {
      return;
    }
    this.reconcilingReports.add(report.id);
    this.logger.warn(`Report ${report.id} not produced within grace window; self-healing inline.`);
    void run()
      .catch((err) => this.logger.error(`Self-heal report ${report.id} failed: ${(err as Error)?.message}`))
      .finally(() => this.reconcilingReports.delete(report.id));
  }

  private async requireSession(token: string | undefined): Promise<SessionRecord> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    return session;
  }

  private async requireSchoolAdminSession(token: string | undefined, tenantId: string): Promise<SessionRecord> {
    const session = await this.requireSession(token);
    const membership = session.user.memberships.find((item) => item.tenantId === tenantId && item.status === "active");

    if (!membership) {
      throw new NotFoundException("Tenant membership not found.");
    }

    if (membership.role !== MembershipRole.school_admin) {
      throw new ForbiddenException("School admin access required.");
    }

    return session;
  }

  private toTenantSummary(session: SessionRecord, tenantId: string): SessionTenantSummary {
    const membership = session.user.memberships.find((item) => item.tenantId === tenantId && item.status === "active");

    if (!membership) {
      throw new NotFoundException("Tenant membership not found.");
    }

    return {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      type: membership.tenant.type,
      status: membership.tenant.status
    };
  }

  private async getStudentMemberships(
    where: Prisma.TenantMembershipWhereInput,
    pagination?: {
      skip?: number;
      take?: number;
    }
  ): Promise<StudentMembershipRecord[]> {
    return this.prisma.tenantMembership.findMany({
      where,
      include: {
        user: {
          include: {
            studentProfile: {
              include: {
                versions: true
              }
            },
            recommendationSnapshots: {
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            },
            proofSessions: {
              where: {
                status: ProofSessionStatus.completed
              },
              include: {
                career: {
                  include: {
                    category: true
                  }
                }
              },
              orderBy: {
                completedAt: "desc"
              }
            }
          }
        },
        tenant: true
      },
      skip: pagination?.skip,
      take: pagination?.take,
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  private serializeProfile(
    profile: Prisma.StudentProfileGetPayload<{
      include: {
        versions: true;
      };
    }>
  ): StudentProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      tenantId: profile.tenantId,
      gradeLevel: profile.gradeLevel,
      ageBand: profile.ageBand,
      favoriteSubjects: this.readStringArray(profile.favoriteSubjects),
      favoriteActivities: this.readStringArray(profile.favoriteActivities),
      topicsCuriousAbout: this.readStringArray(profile.topicsCuriousAbout),
      personalStrengths: this.readStringArray(profile.personalStrengths),
      avoidsOrDislikes: this.readStringArray(profile.avoidsOrDislikes),
      completionStatus: profile.completionStatus,
      submittedAt: profile.submittedAt?.toISOString() || null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      versionCount: profile.versions.length,
      cachedAssessmentResult: null
    };
  }

  private readRecommendationSnapshot(
    snapshot: Prisma.RecommendationSnapshotGetPayload<object> | null | undefined
  ): RecommendationSnapshot | null {
    if (!snapshot) {
      return null;
    }

    return {
      id: snapshot.id,
      userId: snapshot.userId,
      studentProfileId: snapshot.studentProfileId,
      profileVersionCount: snapshot.profileVersionCount,
      engineVersion: snapshot.engineVersion,
      inputSummary: this.readStringArray(snapshot.inputSummary),
      createdAt: snapshot.createdAt.toISOString(),
      items: Array.isArray(snapshot.itemsJson) ? (snapshot.itemsJson as unknown as RecommendationItem[]) : []
    };
  }

  private serializeProofSession(
    session: Prisma.ProofSessionGetPayload<{
      include: {
        career: {
          include: {
            category: true;
          };
        };
      };
    }>
  ): ProofSessionRecord {
    const questionSet = this.readQuestionSet(session.questionSetJson);

    return {
      id: session.id,
      status: session.status,
      questionSource: session.questionSource,
      scoringSource: session.scoringSource || null,
      questionSetVersion: session.questionSetVersion,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      career: {
        id: session.career.id,
        slug: session.career.slug,
        name: session.career.category.name,
        title: session.career.title,
        summary: session.career.summary
      },
      questionSet,
      answerCount: Array.isArray(session.answerSetJson) ? session.answerSetJson.length : 0,
      result: this.readProofResult(session.resultJson)
    };
  }

  private readQuestionSet(value: Prisma.JsonValue): ProofSessionRecord["questionSet"] {
    const raw = (value || {}) as Record<string, unknown>;
    const questions = Array.isArray(raw.questions) ? raw.questions : [];

    return {
      source: String(raw.source || "fallback"),
      introduction: String(raw.introduction || ""),
      questions: questions.map((question, index) => {
        const item = question as Record<string, unknown>;

        return {
          id: String(item.id || `proof-question-${index + 1}`),
          dimension: String(item.dimension || "general"),
          question: String(item.question || ""),
          whyItMatters: String(item.whyItMatters || ""),
          options: Array.isArray(item.options) ? item.options.map((option) => String(option)) : []
        };
      })
    };
  }

  private readProofResult(value: Prisma.JsonValue | null | undefined): ProofResult | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const dimensionScoresRaw =
      raw.dimensionScores && typeof raw.dimensionScores === "object" && !Array.isArray(raw.dimensionScores)
        ? (raw.dimensionScores as Record<string, unknown>)
        : {};

    return {
      source: String(raw.source || "fallback"),
      overallScore: Number(raw.overallScore || 0),
      points: Number(raw.points || 0),
      readinessBand: String(raw.readinessBand || ""),
      dimensionScores: Object.fromEntries(
        Object.entries(dimensionScoresRaw).map(([key, item]) => [key, Number(item || 0)])
      ),
      strengths: this.readStringArray(raw.strengths),
      risks: this.readStringArray(raw.risks),
      narrative: String(raw.narrative || ""),
      parentSummary: String(raw.parentSummary || ""),
      schoolSummary: String(raw.schoolSummary || ""),
      nextSteps: this.readStringArray(raw.nextSteps)
    };
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private hashShareToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private getAppBaseUrl(): string {
    return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || "http://127.0.0.1:3000";
  }
}
