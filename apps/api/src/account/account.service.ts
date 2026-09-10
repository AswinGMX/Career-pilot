import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { MediaKind, MediaStatus, Prisma } from "@prisma/client";

import type {
  AccountOptionsResponse,
  AccountProfile,
  AccountResponse,
  AvatarUploadInitPayload,
  AvatarUploadInitResponse,
  UpdateAccountPayload
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { AntivirusService } from "../storage/antivirus.service";
import { StorageService } from "../storage/storage.service";
import {
  composeFullName,
  listLocales,
  listTimeZones,
  normalizeLocale,
  normalizePhone,
  normalizeTimezone
} from "./identity-rules";

type AccountUserRecord = Prisma.UserGetPayload<{
  include: { avatarMedia: true; oauthAccounts: true };
}>;

/**
 * Self-service account management: the profile fields a signed-in user owns
 * about themselves — names, contact, locale and avatar.
 *
 * Credentials are deliberately out of scope. There is no route here to change
 * an email or a password, so nothing in this service needs to re-authenticate;
 * if those are reintroduced, they must require the current password, because a
 * stolen session cookie should not be enough to take an account permanently.
 *
 * Uploads are verified server-side: declared MIME and size are client claims,
 * so the stored object is re-read and identified by its magic bytes.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  private static readonly AVATAR_MAX_BYTES = 5 * 1024 * 1024;

  /**
   * Raster formats only. SVG is deliberately excluded: it is a document that
   * can carry script, and these objects are served from an app origin.
   */
  private static readonly AVATAR_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly storage: StorageService,
    private readonly antivirus: AntivirusService
  ) {}

  async getAccount(token: string | undefined): Promise<AccountResponse> {
    const { user } = await this.requireAccount(token);
    return { account: await this.toProfile(user) };
  }

  /** Choices for the timezone/locale pickers, from the server's own ICU data. */
  async getOptions(token: string | undefined): Promise<AccountOptionsResponse> {
    await this.requireAccount(token);
    return { timezones: listTimeZones(), locales: listLocales() };
  }

  async updateAccount(token: string | undefined, payload: UpdateAccountPayload): Promise<AccountResponse> {
    const { user } = await this.requireAccount(token);

    const data: Prisma.UserUpdateInput = {};

    if (payload.firstName !== undefined) {
      data.firstName = payload.firstName.trim() || null;
    }
    if (payload.lastName !== undefined) {
      data.lastName = payload.lastName.trim() || null;
    }
    if (payload.phone !== undefined) {
      data.phone = payload.phone === null ? null : normalizePhone(payload.phone);
    }
    if (payload.timezone !== undefined) {
      data.timezone = payload.timezone === null ? null : normalizeTimezone(payload.timezone);
    }
    if (payload.locale !== undefined) {
      data.locale = payload.locale === null ? null : normalizeLocale(payload.locale);
    }

    if (Object.keys(data).length === 0) {
      return { account: await this.toProfile(user) };
    }

    // `fullName` is the display name every other feature reads, so it follows
    // the parts rather than drifting out of sync with them.
    const nextFirst = (data.firstName as string | null | undefined) ?? user.firstName;
    const nextLast = (data.lastName as string | null | undefined) ?? user.lastName;
    data.fullName = composeFullName(nextFirst ?? null, nextLast ?? null, user.fullName);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      include: { avatarMedia: true, oauthAccounts: true }
    });

    await this.audit(user.id, "account.updated", { fields: Object.keys(data) });

    return { account: await this.toProfile(updated) };
  }

  /** Step 1 of avatar upload: reserve a media row and hand back a signed PUT. */
  async initAvatarUpload(
    token: string | undefined,
    payload: AvatarUploadInitPayload
  ): Promise<AvatarUploadInitResponse> {
    const { user } = await this.requireAccount(token);

    const mimeType = payload.mimeType.trim().toLowerCase();

    if (!AccountService.AVATAR_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException("Profile photos must be a PNG, JPEG or WebP image.");
    }
    if (payload.sizeBytes > AccountService.AVATAR_MAX_BYTES) {
      throw new BadRequestException(
        `Profile photos must be under ${Math.round(AccountService.AVATAR_MAX_BYTES / (1024 * 1024))}MB.`
      );
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        kind: MediaKind.image,
        status: MediaStatus.uploaded,
        storageKey: "pending",
        mimeType,
        bytes: payload.sizeBytes,
        createdByUserId: user.id
      }
    });

    const storageKey = `avatars/${user.id}/${asset.id}`;
    await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { storageKey } });

    const upload = await this.storage.createSignedUpload(storageKey, { contentType: mimeType });

    return { mediaId: asset.id, upload };
  }

  /**
   * Step 2: verify what actually landed in storage, then adopt it.
   *
   * The declared size and MIME from step 1 are client claims. This re-reads the
   * stored object and checks its real length and magic bytes, so a signed PUT
   * cannot be used to park an oversized file or an HTML document that later
   * gets served from the app's origin.
   */
  async completeAvatarUpload(token: string | undefined, mediaId: string): Promise<AccountResponse> {
    const { user } = await this.requireAccount(token);

    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });

    if (!asset || asset.createdByUserId !== user.id || !asset.storageKey.startsWith(`avatars/${user.id}/`)) {
      throw new BadRequestException("Unknown upload.");
    }

    const scan = await this.antivirus.scan(asset.storageKey);
    if (!scan.clean) {
      await this.failAvatar(asset.id, asset.storageKey);
      throw new BadRequestException("The uploaded file failed a safety scan and was rejected.");
    }

    let object: Buffer;
    try {
      object = await this.storage.getObject(asset.storageKey);
    } catch {
      throw new BadRequestException("The upload did not complete. Please try again.");
    }

    if (object.byteLength > AccountService.AVATAR_MAX_BYTES) {
      await this.failAvatar(asset.id, asset.storageKey);
      throw new BadRequestException("Profile photo is too large.");
    }

    const sniffed = sniffImageMime(object);
    if (!sniffed || !AccountService.AVATAR_MIME_TYPES.has(sniffed)) {
      await this.failAvatar(asset.id, asset.storageKey);
      throw new BadRequestException("That file is not a valid PNG, JPEG or WebP image.");
    }

    const previous = user.avatarMedia;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: { status: MediaStatus.ready, mimeType: sniffed, bytes: object.byteLength }
      });

      return tx.user.update({
        where: { id: user.id },
        data: { avatarMediaId: asset.id },
        include: { avatarMedia: true, oauthAccounts: true }
      });
    });

    // Best-effort cleanup of the replaced image; a leaked object is preferable
    // to failing a request that already succeeded.
    if (previous) {
      await this.discardAvatarAsset(previous.id, previous.storageKey);
    }

    await this.audit(user.id, "account.avatar_updated", { mediaId: asset.id, bytes: object.byteLength });

    return { account: await this.toProfile(updated) };
  }

  async deleteAvatar(token: string | undefined): Promise<AccountResponse> {
    const { user } = await this.requireAccount(token);

    if (!user.avatarMedia) {
      return { account: await this.toProfile(user) };
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarMediaId: null },
      include: { avatarMedia: true, oauthAccounts: true }
    });

    await this.discardAvatarAsset(user.avatarMedia.id, user.avatarMedia.storageKey);
    await this.audit(user.id, "account.avatar_removed", {});

    return { account: await this.toProfile(updated) };
  }

  // ── internals ──────────────────────────────────────────────────

  private async requireAccount(
    token: string | undefined
  ): Promise<{ user: AccountUserRecord; sessionId: string }> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      include: { avatarMedia: true, oauthAccounts: true }
    });

    if (!user) {
      throw new UnauthorizedException("Authentication required.");
    }
    if (user.status !== "active") {
      throw new ForbiddenException("This account is not active.");
    }

    return { user, sessionId: session.id };
  }

  private async toProfile(user: AccountUserRecord): Promise<AccountProfile> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      phone: user.phone,
      timezone: user.timezone,
      locale: user.locale,
      avatarUrl: await this.avatarUrl(user),
      accountType: user.accountType,
      status: user.status,
      linkedProviders: user.oauthAccounts.map((account) => account.provider),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private async avatarUrl(user: AccountUserRecord): Promise<string | null> {
    if (!user.avatarMedia || user.avatarMedia.status !== MediaStatus.ready) {
      return null;
    }

    try {
      return (await this.storage.createSignedDownload(user.avatarMedia.storageKey)).url;
    } catch (error) {
      this.logger.warn(`Failed to sign avatar URL for user ${user.id}: ${(error as Error)?.message}`);
      return null;
    }
  }

  private async failAvatar(mediaId: string, storageKey: string): Promise<void> {
    await this.prisma.mediaAsset.update({ where: { id: mediaId }, data: { status: MediaStatus.failed } });
    await this.storage.deleteObject(storageKey).catch(() => undefined);
  }

  private async discardAvatarAsset(mediaId: string, storageKey: string): Promise<void> {
    try {
      await this.storage.deleteObject(storageKey);
      await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
    } catch (error) {
      this.logger.warn(`Failed to discard replaced avatar ${mediaId}: ${(error as Error)?.message}`);
    }
  }

  private async audit(userId: string, action: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action,
          entityType: "user",
          entityId: userId,
          metadata: metadata as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit entry "${action}": ${(error as Error)?.message}`);
    }
  }

}

/**
 * Identify an image by its magic bytes. Content-Type is attacker-controlled on
 * a direct-to-storage PUT, so the bytes are the only trustworthy signal.
 */
function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
