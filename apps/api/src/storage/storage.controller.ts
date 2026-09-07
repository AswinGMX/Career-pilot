import type { Request, Response } from "express";

import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Put,
  Query,
  Req,
  Res
} from "@nestjs/common";

import { StorageService } from "./storage.service";

/**
 * Serves HMAC-signed local-storage URLs in development only. In production the
 * S3 driver issues presigned URLs straight to the object store, so these routes
 * are never linked and respond 404.
 */
@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get("objects")
  async download(
    @Query("key") key: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
    @Res() res: Response
  ): Promise<void> {
    const local = this.storage.localDriver;
    if (!local) {
      throw new NotFoundException();
    }
    if (!key || !local.verify(key, Number(exp), "GET", sig ?? "")) {
      throw new ForbiddenException("Invalid or expired URL.");
    }
    if (!(await local.exists(key))) {
      throw new NotFoundException();
    }
    const buffer = await local.getObject(key);
    res.setHeader("content-type", "application/octet-stream");
    // Defense-in-depth: never let the browser sniff an uploaded object into an
    // executable type (e.g. SVG/HTML) when served from the app origin.
    res.setHeader("x-content-type-options", "nosniff");
    res.send(buffer);
  }

  @Put("objects")
  async upload(
    @Query("key") key: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
    @Req() req: Request
  ): Promise<{ ok: true; key: string }> {
    const local = this.storage.localDriver;
    if (!local) {
      throw new NotFoundException();
    }
    if (!key || !local.verify(key, Number(exp), "PUT", sig ?? "")) {
      throw new ForbiddenException("Invalid or expired URL.");
    }
    const body = await readRawBody(req);
    await local.putObject({ key, body, contentType: req.headers["content-type"] });
    return { ok: true, key };
  }
}

/** Hard ceiling for the in-memory local-dev upload route (S3 streams in prod). */
const MAX_LOCAL_UPLOAD_BYTES = 256 * 1024 * 1024;

function readRawBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_LOCAL_UPLOAD_BYTES) {
        req.destroy();
        reject(new Error("Upload exceeds the maximum allowed size."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
