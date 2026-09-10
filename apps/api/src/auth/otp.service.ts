import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";

import { EmailService } from "../notifications/email.service";
import { PrismaService } from "../prisma/prisma.service";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 45_000;
const MAX_VERIFY_ATTEMPTS = 5;
/** How long a verified OTP stays valid for the registration step that follows it. */
const VERIFIED_GRACE_MS = 30 * 60_000;
const SIGNUP_PURPOSE = "signup";

/**
 * Proves a signup email is reachable before an account is created.
 *
 * Not backed by a session or user row — the challenge is keyed on the raw
 * email address so it can run before any account exists. `assertVerified` is
 * the enforcement point `AuthService.register` calls before provisioning.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) { }

  async sendSignupOtp(rawEmail: string): Promise<{ ok: true; message: string; devCode?: string }> {
    const email = this.normalizeEmail(rawEmail);

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    const mostRecent = await this.prisma.emailOtp.findFirst({
      where: { email, purpose: SIGNUP_PURPOSE },
      orderBy: { createdAt: "desc" }
    });

    if (mostRecent && Date.now() - mostRecent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException("Please wait a moment before requesting another code.");
    }

    const code = this.generateCode();

    await this.prisma.emailOtp.create({
      data: {
        email,
        purpose: SIGNUP_PURPOSE,
        codeHash: this.hashCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS)
      }
    });

    try {
      await this.emailService.send(
        email,
        "Your Career Pilot verification code",
        `Your verification code is ${code}. It expires in ${OTP_TTL_MS / 60_000} minutes. If you didn't request this, you can ignore this email.`
      );
    } catch (err) {
      this.logger.error(`Failed to send signup OTP email to ${email}: ${(err as Error)?.message}`);
      throw new BadRequestException("Couldn't send the verification email. Please check email delivery configuration and try again.");
    }

    return {
      ok: true,
      message: "Verification code sent. Check your inbox.",
      devCode: process.env.NODE_ENV === "production" ? undefined : code
    };
  }

  async verifySignupOtp(rawEmail: string, code: string): Promise<{ ok: true; message: string }> {
    const email = this.normalizeEmail(rawEmail);

    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: SIGNUP_PURPOSE,
        verifiedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      throw new BadRequestException("That code has expired or wasn't found. Please request a new one.");
    }

    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException("Too many incorrect attempts. Please request a new code.");
    }

    if (!this.matchesCode(code, otp.codeHash)) {
      await this.prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } }
      });
      throw new BadRequestException("That code is incorrect. Please try again.");
    }

    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() }
    });

    return { ok: true, message: "Email verified." };
  }

  /** Enforcement point: throws unless this email passed OTP verification recently. */
  async assertVerified(rawEmail: string): Promise<void> {
    const email = this.normalizeEmail(rawEmail);

    const verified = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: SIGNUP_PURPOSE,
        verifiedAt: { gt: new Date(Date.now() - VERIFIED_GRACE_MS) }
      },
      orderBy: { verifiedAt: "desc" }
    });

    if (!verified) {
      throw new BadRequestException("Please verify your email with the code sent to your inbox before creating an account.");
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
  }

  private hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  private matchesCode(code: string, expectedHash: string): boolean {
    const candidateHash = Buffer.from(this.hashCode(code));
    const expected = Buffer.from(expectedHash);
    return candidateHash.length === expected.length && timingSafeEqual(candidateHash, expected);
  }
}
