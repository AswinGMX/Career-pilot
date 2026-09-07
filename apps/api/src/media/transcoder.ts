import { Injectable, Logger } from "@nestjs/common";
import type { MediaAsset, Prisma } from "@prisma/client";

export const TRANSCODER = Symbol("TRANSCODER");

export interface TranscodeOutput {
  renditionsJson: Prisma.InputJsonValue;
  captionsKey?: string | null;
  durationSec?: number | null;
}

/**
 * Pluggable media-transcoding contract. The worker calls {@link transcode}; a
 * production implementation (ffmpeg sidecar, AWS MediaConvert, Mux) produces HLS
 * renditions + captions and slots in behind this interface by swapping the DI
 * provider — no caller changes. Selected via `MEDIA_TRANSCODER`.
 */
export abstract class Transcoder {
  abstract readonly name: string;
  abstract transcode(asset: MediaAsset): Promise<TranscodeOutput>;
}

/**
 * Default driver: no re-encoding. Records the original as a single rendition and
 * marks the asset ready. Correct for images and already-web-playable clips;
 * adequate until an HLS encoder is provisioned. NOT adaptive-bitrate.
 */
@Injectable()
export class PassthroughTranscoder extends Transcoder {
  readonly name = "passthrough";
  private readonly logger = new Logger(PassthroughTranscoder.name);

  async transcode(asset: MediaAsset): Promise<TranscodeOutput> {
    this.logger.log(`Passthrough transcode for media ${asset.id} (${asset.kind}); no re-encode.`);
    return {
      renditionsJson: {
        note: "passthrough",
        renditions: [{ key: asset.storageKey, profile: "original" }]
      } as Prisma.InputJsonValue,
      captionsKey: asset.captionsKey ?? null,
      durationSec: asset.durationSec ?? null
    };
  }
}

/** Chooses the transcoder implementation from `MEDIA_TRANSCODER` (default: passthrough). */
export function buildTranscoder(): Transcoder {
  const name = process.env.MEDIA_TRANSCODER || "passthrough";
  // Real encoders (e.g. "hls") register here once their infra is provisioned.
  if (name !== "passthrough") {
    new Logger("Transcoder").warn(`MEDIA_TRANSCODER="${name}" is not wired; falling back to passthrough.`);
  }
  return new PassthroughTranscoder();
}
