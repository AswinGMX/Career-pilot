import { randomBytes } from "node:crypto";

import { Global, Logger, Module } from "@nestjs/common";

import type { StorageDriverName } from "@career-pilot/types";

import { AntivirusService } from "./antivirus.service";
import { LocalStorageDriver } from "./local-storage.driver";
import { S3StorageDriver } from "./s3-storage.driver";
import { StorageController } from "./storage.controller";
import { STORAGE_DRIVER, StorageService } from "./storage.service";
import { StorageDriver } from "./storage.driver";

const DEFAULT_TTL_SECONDS = 900;
const MIN_SIGNING_SECRET_LENGTH = 32;

/**
 * Resolve the HMAC secret for the local driver's signed URLs.
 *
 * Those URLs guard report exports and submitted student evidence, and the
 * signing scheme is public (`HMAC-SHA256("GET:<key>:<exp>")`), so a shared
 * default secret is a forgeable-URL vulnerability in any environment that is
 * reachable — not only in production. There is therefore no constant fallback:
 * production refuses to boot without a secret, and every other environment gets
 * a per-process random one. The trade-off of the random secret is that signed
 * URLs issued before a restart stop verifying, which is the correct behaviour
 * for a driver documented as local-development-only.
 */
function resolveLocalSigningSecret(logger: Logger): string {
  const configured = process.env.STORAGE_SIGNING_SECRET?.trim();

  if (configured) {
    if (configured.length < MIN_SIGNING_SECRET_LENGTH) {
      throw new Error(`STORAGE_SIGNING_SECRET must be at least ${MIN_SIGNING_SECRET_LENGTH} characters.`);
    }

    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("STORAGE_SIGNING_SECRET is required when using the local storage driver in production.");
  }

  logger.warn(
    "STORAGE_SIGNING_SECRET is not set; using an ephemeral per-process secret. Signed URLs will not verify after a restart, and will not verify across instances."
  );

  return randomBytes(32).toString("hex");
}

function buildDriver(): StorageDriver {
  const logger = new Logger("StorageModule");
  const driverName = (process.env.STORAGE_DRIVER || "local") as StorageDriverName;
  const ttl = Number(process.env.STORAGE_SIGNED_URL_TTL || DEFAULT_TTL_SECONDS);

  if (driverName === "s3") {
    const bucket = process.env.STORAGE_S3_BUCKET;
    const region = process.env.STORAGE_S3_REGION;
    if (!bucket || !region) {
      throw new Error("STORAGE_DRIVER=s3 requires STORAGE_S3_BUCKET and STORAGE_S3_REGION.");
    }
    logger.log(`Using S3 storage driver (bucket=${bucket}, region=${region}).`);
    return new S3StorageDriver({
      bucket,
      region,
      endpoint: process.env.STORAGE_S3_ENDPOINT,
      forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
      defaultExpiresInSeconds: ttl
    });
  }

  const rootDir = process.env.STORAGE_LOCAL_DIR || `${process.cwd()}/.storage`;
  const signingSecret = resolveLocalSigningSecret(logger);
  logger.log(`Using local storage driver (dir=${rootDir}). Not for production.`);
  return new LocalStorageDriver({
    rootDir,
    publicBaseUrl: process.env.STORAGE_LOCAL_PUBLIC_URL || "http://127.0.0.1:4000/v1",
    signingSecret,
    defaultExpiresInSeconds: ttl
  });
}

/**
 * Provides the configured object-storage driver and {@link StorageService}.
 * Global so any feature module can persist/retrieve objects.
 */
@Global()
@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_DRIVER,
      useFactory: buildDriver
    },
    StorageService,
    AntivirusService
  ],
  exports: [StorageService, AntivirusService]
})
export class StorageModule {}
