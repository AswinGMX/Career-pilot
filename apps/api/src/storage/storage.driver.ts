import type { SignedDownloadUrl, SignedUploadTarget, StorageDriverName } from "@career-pilot/types";

export interface PutObjectInput {
  key: string;
  body: Buffer | string;
  contentType?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
}

/**
 * Provider-agnostic object storage contract. Implemented by an S3-compatible
 * driver (AWS S3 / Cloudflare R2 / GCS S3-endpoint / MinIO) for production and
 * a local-filesystem driver for development. Callers depend on this, never on
 * a concrete provider.
 */
export abstract class StorageDriver {
  abstract readonly name: StorageDriverName;
  abstract putObject(input: PutObjectInput): Promise<void>;
  abstract getObject(key: string): Promise<Buffer>;
  abstract deleteObject(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  /** Short-lived URL a client can PUT to directly (browser uploads). */
  abstract createSignedUpload(key: string, options?: SignedUrlOptions): Promise<SignedUploadTarget>;
  /** Short-lived URL to read a private object. */
  abstract createSignedDownload(key: string, options?: SignedUrlOptions): Promise<SignedDownloadUrl>;
}
