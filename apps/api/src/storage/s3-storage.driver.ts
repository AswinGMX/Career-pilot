import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { SignedDownloadUrl, SignedUploadTarget } from "@career-pilot/types";

import { PutObjectInput, SignedUrlOptions, StorageDriver } from "./storage.driver";

export interface S3DriverConfig {
  bucket: string;
  region: string;
  /** Override for S3-compatible providers (R2, MinIO, GCS). */
  endpoint?: string;
  /** Required for MinIO and some S3-compatible stores. */
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultExpiresInSeconds: number;
}

/** S3-compatible object storage driver (AWS S3, Cloudflare R2, GCS, MinIO). */
export class S3StorageDriver extends StorageDriver {
  readonly name = "s3" as const;
  private readonly client: S3Client;

  constructor(private readonly config: S3DriverConfig) {
    super();
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
          : undefined
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key })
    );
    if (!response.Body) {
      throw new Error(`Empty body for object "${key}".`);
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async createSignedUpload(key: string, options: SignedUrlOptions = {}): Promise<SignedUploadTarget> {
    const expiresInSeconds = options.expiresInSeconds ?? this.config.defaultExpiresInSeconds;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: options.contentType }),
      { expiresIn: expiresInSeconds }
    );
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
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
    return { url, expiresInSeconds };
  }
}
