import { Inject, Injectable } from "@nestjs/common";

import type { SignedDownloadUrl, SignedUploadTarget, StorageDriverName } from "@career-pilot/types";

import { LocalStorageDriver } from "./local-storage.driver";
import { PutObjectInput, SignedUrlOptions, StorageDriver } from "./storage.driver";

export const STORAGE_DRIVER = Symbol("STORAGE_DRIVER");

/**
 * Facade over the configured {@link StorageDriver}. Domain code depends on this
 * and is unaware of the provider (S3 vs local).
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  get driverName(): StorageDriverName {
    return this.driver.name;
  }

  /** Returns the local driver when running on it, else null (for dev routes). */
  get localDriver(): LocalStorageDriver | null {
    return this.driver instanceof LocalStorageDriver ? this.driver : null;
  }

  putObject(input: PutObjectInput): Promise<void> {
    return this.driver.putObject(input);
  }

  getObject(key: string): Promise<Buffer> {
    return this.driver.getObject(key);
  }

  deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  createSignedUpload(key: string, options?: SignedUrlOptions): Promise<SignedUploadTarget> {
    return this.driver.createSignedUpload(key, options);
  }

  createSignedDownload(key: string, options?: SignedUrlOptions): Promise<SignedDownloadUrl> {
    return this.driver.createSignedDownload(key, options);
  }
}
