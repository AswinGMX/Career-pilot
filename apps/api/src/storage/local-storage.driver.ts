import { createHmac, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";

import type { SignedDownloadUrl, SignedUploadTarget } from "@career-pilot/types";

import { PutObjectInput, SignedUrlOptions, StorageDriver } from "./storage.driver";

export interface LocalDriverConfig {
  rootDir: string;
  /** Base URL the signed local routes are served from, e.g. http://127.0.0.1:4000/v1 */
  publicBaseUrl: string;
  signingSecret: string;
  defaultExpiresInSeconds: number;
}

/**
 * Development driver backed by the local filesystem. It mirrors S3 semantics by
 * issuing real HMAC-signed, time-limited URLs that resolve to the local storage
 * routes ({@link StorageController}). Not for production use.
 */
export class LocalStorageDriver extends StorageDriver {
  readonly name = "local" as const;

  constructor(private readonly config: LocalDriverConfig) {
    super();
  }

  private pathForKey(key: string): string {
    // Prevent path traversal: the resolved path must stay under rootDir.
    const root = resolve(this.config.rootDir);
    const target = resolve(root, normalize(key));
    if (target !== root && !target.startsWith(root + "/")) {
      throw new Error("Invalid storage key.");
    }
    return target;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const path = this.pathForKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);
  }

  async getObject(key: string): Promise<Buffer> {
    return readFile(this.pathForKey(key));
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await unlink(this.pathForKey(key));
    } catch {
      // already gone — idempotent delete
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.pathForKey(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Compute the signature for a key+expiry+operation tuple. */
  sign(key: string, expiresAtEpoch: number, operation: "GET" | "PUT"): string {
    return createHmac("sha256", this.config.signingSecret)
      .update(`${operation}:${key}:${expiresAtEpoch}`)
      .digest("base64url");
  }

  verify(key: string, expiresAtEpoch: number, operation: "GET" | "PUT", signature: string): boolean {
    if (Number.isNaN(expiresAtEpoch) || expiresAtEpoch * 1000 <= Date.now()) {
      return false;
    }
    const expected = this.sign(key, expiresAtEpoch, operation);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private buildUrl(key: string, operation: "GET" | "PUT", expiresInSeconds: number): { url: string; expiresInSeconds: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = this.sign(key, expiresAt, operation);
    const params = new URLSearchParams({ key, exp: String(expiresAt), sig, op: operation });
    return { url: `${this.config.publicBaseUrl}/storage/objects?${params.toString()}`, expiresInSeconds };
  }

  async createSignedUpload(key: string, options: SignedUrlOptions = {}): Promise<SignedUploadTarget> {
    const expiresInSeconds = options.expiresInSeconds ?? this.config.defaultExpiresInSeconds;
    const { url } = this.buildUrl(key, "PUT", expiresInSeconds);
    return {
      key,
      url,
      method: "PUT",
      headers: options.contentType ? { "content-type": options.contentType } : {},
      expiresInSeconds
    };
  }

  async createSignedDownload(key: string, options: SignedUrlOptions = {}): Promise<SignedDownloadUrl> {
    const expiresInSeconds = options.expiresInSeconds ?? this.config.defaultExpiresInSeconds;
    return this.buildUrl(key, "GET", expiresInSeconds);
  }
}
