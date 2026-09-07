import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { MembershipRole, Prisma, UserAccountType } from "@prisma/client";

import type {
  AuthMeResponse,
  AuthSessionPayload,
  ForgotPasswordPayload,
  LoginPayload,
  PasswordResetResponse,
  RegisterPayload,
  ResetPasswordPayload
} from "@career-pilot/types";

import { PrismaService } from "../prisma/prisma.service";

export const SESSION_COOKIE_NAME = "career_pilot_session";

/**
 * Raised when an OAuth identity resolves to an email that already belongs to an
 * account, but the provider does not assert that the identity owns that address.
 *
 * Linking would hand the caller full access to the existing account, so the
 * flow stops here: the user signs in with their password and links the provider
 * from account settings instead.
 */
export class OAuthLinkNotVerifiedError extends Error {
  constructor(provider: string) {
    super(`${provider} did not verify this email address, so it cannot be linked to an existing account.`);
    this.name = "OAuthLinkNotVerifiedError";
  }
}
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const passwordResetLifetimeMs = 60 * 60 * 1000;

type SessionUserRecord = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        tenant: true;
      };
    };
    mentorProfile: true;
  };
}>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  getSessionCookieName(): string {
    return SESSION_COOKIE_NAME;
  }

  buildSessionCookie(token: string): string {
    const isProduction = process.env.NODE_ENV === "production";
    const securePart = isProduction ? "; Secure" : "";

    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      sessionLifetimeMs / 1000
    )}${securePart}`;
  }

  buildLogoutCookie(): string {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }

  async register(payload: RegisterPayload, userAgent?: string, ipAddress?: string): Promise<{ token: string; session: AuthSessionPayload }> {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    if (payload.accountType === "school_admin" && (!payload.schoolName || !payload.tenantSlug)) {
      throw new BadRequestException("School name and tenant slug are required for school admin registration.");
    }

    if (payload.accountType === "school_student" && !payload.tenantSlug) {
      throw new BadRequestException("Tenant slug is required for school student registration.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let tenantId: string | null = null;

      if (payload.accountType === "school_admin") {
        const slug = payload.tenantSlug!.trim().toLowerCase();
        const existingTenant = await tx.tenant.findUnique({
          where: { slug }
        });

        if (existingTenant) {
          throw new ConflictException("That tenant slug is already in use.");
        }

        const tenant = await tx.tenant.create({
          data: {
            name: payload.schoolName!.trim(),
            slug
          }
        });

        tenantId = tenant.id;
      }

      if (payload.accountType === "school_student") {
        const tenant = await tx.tenant.findUnique({
          where: { slug: payload.tenantSlug!.trim().toLowerCase() }
        });

        if (!tenant) {
          throw new NotFoundException("School tenant not found.");
        }

        tenantId = tenant.id;
      }

      const user = await tx.user.create({
        data: {
          email,
          fullName: payload.fullName.trim(),
          passwordHash: this.hashPassword(payload.password),
          accountType: tenantId ? UserAccountType.tenant_member : UserAccountType.individual
        }
      });

      if (tenantId) {
        await tx.tenantMembership.create({
          data: {
            tenantId,
            userId: user.id,
            role: payload.accountType === "school_admin" ? MembershipRole.school_admin : MembershipRole.student
          }
        });
      }

      if (payload.accountType === "mentor") {
        await tx.mentorProfile.create({
          data: {
            userId: user.id,
            headline: payload.headline?.trim() || null,
            expertiseJson: (payload.expertise ?? []) as Prisma.InputJsonValue
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          tenantId,
          action: "auth.register",
          entityType: "user",
          entityId: user.id,
          metadata: {
            accountType: payload.accountType
          },
          ipAddress
        }
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: "",
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + sessionLifetimeMs)
        }
      });

      const token = this.generateOpaqueToken();
      await tx.session.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: this.hashOpaqueToken(token)
        }
      });

      const hydratedUser = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          memberships: {
            include: {
              tenant: true
            }
          },
          mentorProfile: true
        }
      });

      return {
        token,
        session: this.toSessionPayload(hydratedUser)
      };
    });

    return result;
  }

  async login(payload: LoginPayload, userAgent?: string, ipAddress?: string): Promise<{ token: string; session: AuthSessionPayload }> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email.trim().toLowerCase()
      },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        },
        mentorProfile: true
      }
    });

    if (!user || !user.passwordHash || !this.verifyPassword(payload.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = this.generateOpaqueToken();

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashOpaqueToken(token),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + sessionLifetimeMs)
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        tenantId: user.memberships[0]?.tenantId || null,
        action: "auth.login",
        entityType: "session",
        metadata: {
          email: user.email
        },
        ipAddress
      }
    });

    return {
      token,
      session: this.toSessionPayload(user)
    };
  }

  /** Creates a session for an already-authenticated user (used by OAuth callbacks). */
  async createSessionForUser(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const token = this.generateOpaqueToken();
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashOpaqueToken(token),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + sessionLifetimeMs)
      }
    });
    return token;
  }

  /**
   * Resolves an OAuth identity to a user: returns the linked account's user if
   * present, otherwise links to an existing account ONLY when the provider has
   * verified the email, otherwise provisions a new passwordless individual
   * account. Returns the user id.
   *
   * `emailVerified` is load-bearing, not advisory: an unverified email that
   * matches an existing account is refused ({@link OAuthLinkNotVerifiedError})
   * because an attacker can put any address in their own provider profile.
   */
  async findOrCreateOAuthUser(input: {
    provider: string;
    providerAccountId: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
  }): Promise<string> {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } }
    });
    if (linked) {
      return linked.userId;
    }

    const email = input.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      if (!input.emailVerified) {
        await this.prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: "auth.oauth_link_refused",
            entityType: "user",
            entityId: user.id,
            metadata: { provider: input.provider, reason: "email_unverified" }
          }
        });
        throw new OAuthLinkNotVerifiedError(input.provider);
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: input.fullName.trim() || email,
          passwordHash: null,
          accountType: UserAccountType.individual
        }
      });
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "auth.oauth_register",
          entityType: "user",
          entityId: user.id,
          metadata: { provider: input.provider, emailVerified: input.emailVerified }
        }
      });
    }

    await this.prisma.oAuthAccount.create({
      data: { userId: user.id, provider: input.provider, providerAccountId: input.providerAccountId }
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "auth.oauth_login",
        entityType: "oauth_account",
        entityId: user.id,
        metadata: { provider: input.provider, emailVerified: input.emailVerified }
      }
    });

    return user.id;
  }

  async refresh(token: string | undefined): Promise<{ token: string; session: AuthSessionPayload } | null> {
    const sessionRecord = await this.resolveSession(token);

    if (!sessionRecord) {
      return null;
    }

    const nextToken = this.generateOpaqueToken();
    await this.prisma.session.update({
      where: {
        id: sessionRecord.id
      },
      data: {
        refreshTokenHash: this.hashOpaqueToken(nextToken),
        expiresAt: new Date(Date.now() + sessionLifetimeMs)
      }
    });

    return {
      token: nextToken,
      session: this.toSessionPayload(sessionRecord.user)
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }

    const tokenHash = this.hashOpaqueToken(token);

    await this.prisma.session.updateMany({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  async requestPasswordReset(payload: ForgotPasswordPayload): Promise<PasswordResetResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email.trim().toLowerCase()
      }
    });

    if (!user) {
      return {
        ok: true,
        message: "If the account exists, a reset link has been prepared."
      };
    }

    const rawToken = this.generateOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + passwordResetLifetimeMs)
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "auth.password_reset_requested",
        entityType: "password_reset_token",
        entityId: user.id
      }
    });

    return {
      ok: true,
      message: "If the account exists, a reset link has been prepared.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : rawToken
    };
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<PasswordResetResponse> {
    const tokenHash = this.hashOpaqueToken(payload.token);
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!resetToken) {
      throw new UnauthorizedException("Reset token is invalid or expired.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: resetToken.userId
        },
        data: {
          passwordHash: this.hashPassword(payload.newPassword)
        }
      });

      await tx.passwordResetToken.update({
        where: {
          id: resetToken.id
        },
        data: {
          consumedAt: new Date()
        }
      });

      await tx.session.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    });

    return {
      ok: true,
      message: "Password updated successfully."
    };
  }

  async getMe(token: string | undefined): Promise<AuthMeResponse> {
    const session = await this.resolveSession(token);

    if (!session) {
      return {
        authenticated: false,
        session: null
      };
    }

    return {
      authenticated: true,
      session: this.toSessionPayload(session.user)
    };
  }

  async getAuthenticatedSession(token: string | undefined): Promise<Prisma.SessionGetPayload<{
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
  }> | null> {
    return this.resolveSession(token);
  }

  private async resolveSession(token: string | undefined): Promise<Prisma.SessionGetPayload<{
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
  }> | null> {
    if (!token) {
      return null;
    }

    const tokenHash = this.hashOpaqueToken(token);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                tenant: true
              }
            },
            mentorProfile: true
          }
        }
      }
    });

    return session;
  }

  private toSessionPayload(user: SessionUserRecord): AuthSessionPayload {
    const activeMembership = user.memberships.find((membership) => membership.status === "active") || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountType: user.accountType,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      activeMembership: activeMembership
        ? {
            id: activeMembership.id,
            role: activeMembership.role,
            status: activeMembership.status,
            tenant: {
              id: activeMembership.tenant.id,
              name: activeMembership.tenant.name,
              slug: activeMembership.tenant.slug,
              type: activeMembership.tenant.type,
              status: activeMembership.tenant.status
            }
          }
        : null,
      mentor: user.mentorProfile ? { id: user.mentorProfile.id } : null,
      permissions: this.getPermissions(activeMembership?.role || null)
    };
  }

  toTenantSummary(user: SessionUserRecord): NonNullable<AuthSessionPayload["activeMembership"]>["tenant"] | null {
    const activeMembership = user.memberships.find((membership) => membership.status === "active") || null;

    if (!activeMembership) {
      return null;
    }

    return {
      id: activeMembership.tenant.id,
      name: activeMembership.tenant.name,
      slug: activeMembership.tenant.slug,
      type: activeMembership.tenant.type,
      status: activeMembership.tenant.status
    };
  }

  private getPermissions(role: MembershipRole | null): string[] {
    if (role === MembershipRole.school_admin) {
      return ["school:read", "school:write", "student:read", "student:write"];
    }

    if (role === MembershipRole.student) {
      return ["profile:read", "profile:write"];
    }

    return ["self:read"];
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");

    if (!salt || !hash) {
      return false;
    }

    const candidate = scryptSync(password, salt, 64);
    const target = Buffer.from(hash, "hex");

    return target.length === candidate.length && timingSafeEqual(target, candidate);
  }

  private generateOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
