import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { MediaKind, MediaStatus, MembershipRole, Prisma } from "@prisma/client";

import type {
  MediaView,
  SignedUploadTarget,
  TranscodeMediaJobPayload
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";
import { TRANSCODER, Transcoder } from "./transcoder";

/**
 * Ingests licensed media: issues a signed upload target, then (on completion)
 * transcodes asynchronously and marks the asset ready. Transcoding is a stub
 * here (marks ready + records renditions); a real encoder slots in behind the
 * same job without changing callers.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly storage: StorageService,
    private readonly queueService: QueueService,
    @Inject(TRANSCODER) private readonly transcoder: Transcoder
  ) {}

  async initUpload(
    token: string | undefined,
    input: { kind: MediaKind; mimeType: string; license?: Record<string, unknown> }
  ): Promise<{ mediaId: string; upload: SignedUploadTarget }> {
    await this.requireAdmin(token);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        kind: input.kind,
        mimeType: input.mimeType,
        status: MediaStatus.uploaded,
        storageKey: "pending",
        licenseJson: (input.license ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });

    const key = `media/${asset.kind}/${asset.id}`;
    await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { storageKey: key } });

    const upload = await this.storage.createSignedUpload(key, { contentType: input.mimeType });
    return { mediaId: asset.id, upload };
  }

  async completeUpload(token: string | undefined, mediaId: string): Promise<MediaView> {
    await this.requireAdmin(token);
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset) {
      throw new NotFoundException("Media asset not found.");
    }

    await this.prisma.mediaAsset.update({ where: { id: mediaId }, data: { status: MediaStatus.transcoding } });

    const enqueued = await this.queueService.enqueue<TranscodeMediaJobPayload>(
      QUEUE_NAMES.transcoding,
      JOB_NAMES.transcodeMedia,
      { mediaAssetId: mediaId },
      { idempotencyKey: `media:transcode:${mediaId}` }
    );
    if (!enqueued) {
      this.logger.warn(`Transcoding queue unavailable; transcoding ${mediaId} inline.`);
      await this.runTranscode(mediaId);
    }

    return this.getMedia(token, mediaId);
  }

  /**
   * Worker entrypoint. Delegates to the configured {@link Transcoder} (default
   * passthrough; a real HLS encoder slots in via the `MEDIA_TRANSCODER` provider
   * without changing this method). Marks the asset `failed` on error so the
   * queue retries. Idempotent.
   */
  async runTranscode(mediaId: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset || asset.status === MediaStatus.ready) {
      return;
    }
    try {
      const output = await this.transcoder.transcode(asset);
      await this.prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          status: MediaStatus.ready,
          renditionsJson: output.renditionsJson,
          captionsKey: output.captionsKey ?? asset.captionsKey,
          durationSec: output.durationSec ?? asset.durationSec
        }
      });
      this.logger.log(`Transcoded media ${mediaId} via ${this.transcoder.name}.`);
    } catch (error) {
      await this.prisma.mediaAsset.update({ where: { id: mediaId }, data: { status: MediaStatus.failed } });
      this.logger.error(`Transcode failed for media ${mediaId}: ${(error as Error)?.message}`);
      throw error;
    }
  }

  async getMedia(token: string | undefined, mediaId: string): Promise<MediaView> {
    await this.requireAdmin(token);
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset) {
      throw new NotFoundException("Media asset not found.");
    }
    const url =
      asset.status === MediaStatus.ready ? (await this.storage.createSignedDownload(asset.storageKey)).url : null;
    return {
      id: asset.id,
      kind: asset.kind,
      status: asset.status,
      mimeType: asset.mimeType,
      url,
      durationSec: asset.durationSec ?? null
    };
  }

  async attachToBlock(token: string | undefined, contentBlockId: string, mediaId: string): Promise<{ ok: true }> {
    await this.requireAdmin(token);
    const [block, media] = await Promise.all([
      this.prisma.contentBlock.findUnique({ where: { id: contentBlockId } }),
      this.prisma.mediaAsset.findUnique({ where: { id: mediaId } })
    ]);
    if (!block) {
      throw new NotFoundException("Content block not found.");
    }
    if (!media) {
      throw new NotFoundException("Media asset not found.");
    }
    if (!["video", "audio", "panorama360"].includes(block.kind)) {
      throw new BadRequestException("Media can only attach to media blocks.");
    }
    await this.prisma.contentBlock.update({ where: { id: contentBlockId }, data: { mediaAssetId: mediaId } });
    return { ok: true };
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
