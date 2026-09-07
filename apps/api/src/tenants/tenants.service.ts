import { randomBytes, scryptSync } from "node:crypto";

import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MembershipRole, UserAccountType, type Prisma } from "@prisma/client";

import type { SchoolStudentCreatePayload, SchoolStudentCreateResponse, TenantDetailResponse, TenantMembersResponse } from "@career-pilot/types";

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
        mentorProfile: true;
      };
    };
  };
}>;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getActiveTenant(token: string | undefined): Promise<TenantDetailResponse> {
    const session = await this.requireSession(token);
    const tenant = this.authService.toTenantSummary(session.user);

    if (!tenant) {
      throw new NotFoundException("No active tenant membership found.");
    }

    return { tenant };
  }

  async getTenantById(token: string | undefined, tenantId: string): Promise<TenantDetailResponse> {
    const session = await this.requireSchoolAdmin(token, tenantId);
    const tenant = session.user.memberships.find((membership) => membership.tenantId === tenantId)?.tenant;

    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        status: tenant.status
      }
    };
  }

  async getTenantMembers(token: string | undefined, tenantId: string): Promise<TenantMembersResponse> {
    const session = await this.requireSchoolAdmin(token, tenantId);
    const tenant = session.user.memberships.find((membership) => membership.tenantId === tenantId)?.tenant;

    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    const members = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        status: tenant.status
      },
      members: members.map((membership) => ({
        id: membership.user.id,
        fullName: membership.user.fullName,
        email: membership.user.email,
        accountType: membership.user.accountType,
        status: membership.user.status,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        joinedAt: membership.createdAt.toISOString()
      }))
    };
  }

  async createSchoolStudent(
    token: string | undefined,
    tenantId: string,
    payload: SchoolStudentCreatePayload
  ): Promise<SchoolStudentCreateResponse> {
    const session = await this.requireSchoolAdmin(token, tenantId);
    const tenant = session.user.memberships.find((membership) => membership.tenantId === tenantId)?.tenant;

    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: payload.fullName.trim(),
          passwordHash: this.hashPassword(payload.password),
          accountType: UserAccountType.tenant_member
        }
      });

      const membership = await tx.tenantMembership.create({
        data: {
          tenantId,
          userId: user.id,
          role: MembershipRole.student
        },
        include: {
          user: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId,
          action: "tenant.student_created",
          entityType: "user",
          entityId: user.id,
          metadata: {
            createdEmail: user.email
          }
        }
      });

      return membership;
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        status: tenant.status
      },
      student: {
        id: created.user.id,
        fullName: created.user.fullName,
        email: created.user.email,
        accountType: created.user.accountType,
        status: created.user.status,
        membershipRole: created.role,
        membershipStatus: created.status,
        joinedAt: created.createdAt.toISOString()
      }
    };
  }

  private async requireSession(token: string | undefined): Promise<SessionRecord> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    return session;
  }

  private async requireSchoolAdmin(token: string | undefined, tenantId: string): Promise<SessionRecord> {
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

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }
}
