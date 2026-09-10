import type { Server } from "node:http";

import type { Redis } from "ioredis";

import assert = require("node:assert/strict");
import cookieParser = require("cookie-parser");
import request = require("supertest");

import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { REDIS_COMMAND_CONNECTION } from "../src/queue/queue.constants";

/** A 1x1 PNG — real bytes, so the magic-byte check passes. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const PASSWORD = "account1234";

/**
 * Account settings: profile fields and avatar.
 *
 * Weighted towards the properties that matter rather than the happy path:
 * the account is private to its owner, field validation normalises rather than
 * trusts, and an uploaded avatar is identified by its bytes rather than by the
 * MIME type the client claimed.
 */
async function main(): Promise<void> {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://career_pilot:career_pilot@127.0.0.1:5432/career_pilot";

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();

  const server = app.getHttpServer() as Server;
  const prisma = app.get(PrismaService);

  // Registering twice per run burns through the auth-register limit after a few
  // consecutive runs, so clear this suite's counters first — otherwise a rerun
  // fails with 429 for reasons that have nothing to do with the code.
  const redis = app.get<Redis>(REDIS_COMMAND_CONNECTION);
  const limiterKeys = await redis.keys("ratelimit:auth-*");
  if (limiterKeys.length) {
    await redis.del(...limiterKeys);
  }

  const stamp = Date.now();
  const email = `account-smoke-${stamp}@example.com`;
  const otherEmail = `account-other-${stamp}@example.com`;
  const newEmail = `account-new-${stamp}@example.com`;

  try {
    // ── setup: two accounts, so "address already in use" can be exercised ──
    const register = await request(server)
      .post("/v1/auth/register")
      .send({ accountType: "individual", fullName: "Account Smoke", email, password: PASSWORD })
      .expect(201);
    const cookie = register.headers["set-cookie"]?.[0];
    assert.ok(cookie, "expected a session cookie");

    await request(server)
      .post("/v1/auth/register")
      .send({ accountType: "individual", fullName: "Other Person", email: otherEmail, password: PASSWORD })
      .expect(201);

    // ── the account is private to its owner ──
    await request(server).get("/v1/account").expect(401);

    const initial = await request(server).get("/v1/account").set("Cookie", cookie).expect(200);
    assert.equal(initial.body.account.email, email);
    assert.equal(initial.body.account.firstName, null, "a fresh account has no name parts yet");

    // ── profile fields ──
    const updated = await request(server)
      .patch("/v1/account")
      .set("Cookie", cookie)
      .send({ firstName: "Priya", lastName: "Sharma", phone: "+91 98765 43210", timezone: "Asia/Kolkata", locale: "en-IN" })
      .expect(200);
    assert.equal(updated.body.account.firstName, "Priya");
    assert.equal(updated.body.account.phone, "+919876543210", "phone should be normalised to E.164");
    // Stored as the runtime's resolved spelling: ICU still canonicalises
    // Asia/Kolkata to the Asia/Calcutta alias, and both name the same zone.
    const storedZone: string = updated.body.account.timezone;
    assert.ok(
      ["Asia/Kolkata", "Asia/Calcutta"].includes(storedZone),
      `expected an India zone, got ${storedZone}`
    );
    assert.equal(updated.body.account.fullName, "Priya Sharma", "display name should follow the parts");

    // A bad zone must be refused, not stored and silently misused later.
    await request(server)
      .patch("/v1/account")
      .set("Cookie", cookie)
      .send({ timezone: "Mars/Olympus" })
      .expect(400);

    // Null clears; omitted leaves alone.
    const cleared = await request(server)
      .patch("/v1/account")
      .set("Cookie", cookie)
      .send({ phone: null })
      .expect(200);
    assert.equal(cleared.body.account.phone, null);
    assert.equal(cleared.body.account.timezone, storedZone, "an omitted field must not be touched");

    // The avatar flow needs a session; the one from registration still holds.
    const freshCookie = cookie;

    // ── avatar: signed PUT, then server-side verification of what landed ──
    const init = await request(server)
      .post("/v1/account/avatar")
      .set("Cookie", freshCookie)
      .send({ mimeType: "image/png", sizeBytes: TINY_PNG.length })
      .expect(201);

    const target = new URL(init.body.upload.url);
    await request(server)
      .put(`${target.pathname}${target.search}`)
      .set({ ...init.body.upload.headers, "content-type": "image/png" })
      .send(TINY_PNG)
      .expect(200);

    const withAvatar = await request(server)
      .post(`/v1/account/avatar/${init.body.mediaId}/complete`)
      .set("Cookie", freshCookie)
      .expect(200);
    assert.ok(withAvatar.body.account.avatarUrl, "a ready avatar should return a signed URL");

    // Bytes that are not an image must be rejected even though the declared
    // MIME says otherwise — Content-Type is attacker-controlled on a direct PUT.
    const badInit = await request(server)
      .post("/v1/account/avatar")
      .set("Cookie", freshCookie)
      .send({ mimeType: "image/png", sizeBytes: 32 })
      .expect(201);
    const badTarget = new URL(badInit.body.upload.url);
    await request(server)
      .put(`${badTarget.pathname}${badTarget.search}`)
      .set({ "content-type": "image/png" })
      .send(Buffer.from("<svg onload=alert(1)></svg>"))
      .expect(200);
    await request(server)
      .post(`/v1/account/avatar/${badInit.body.mediaId}/complete`)
      .set("Cookie", freshCookie)
      .expect(400);

    // SVG is refused up front too.
    await request(server)
      .post("/v1/account/avatar")
      .set("Cookie", freshCookie)
      .send({ mimeType: "image/svg+xml", sizeBytes: 128 })
      .expect(400);

    const removed = await request(server).delete("/v1/account/avatar").set("Cookie", freshCookie).expect(200);
    assert.equal(removed.body.account.avatarUrl, null);

    console.log("[account-smoke] PASS — profile fields, validation, avatar upload and verification.");
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail, newEmail] } } });
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
