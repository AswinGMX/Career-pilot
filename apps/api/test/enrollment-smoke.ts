import type { Server } from "node:http";

import type { Redis } from "ioredis";

import assert = require("node:assert/strict");
import cookieParser = require("cookie-parser");
import request = require("supertest");

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { REDIS_CONNECTION } from "../src/queue/queue.constants";
import { WorkerModule } from "../src/worker/worker.module";
import { WorkerRunner } from "../src/worker/worker.runner";

const PROGRAM_SLUG = "software-engineer-reality";

const REFLECTION = "A thoughtful reflection of sufficient length to count.";

const EVIDENCE_MIME: Record<string, string> = {
  video: "video/mp4",
  audio: "audio/mpeg",
  image: "image/png"
};

/**
 * A 1x1 PNG. Nothing inspects the payload (AV scanning is off outside
 * production and no format check runs), it only has to be real bytes the local
 * storage driver can persist.
 */
const EVIDENCE_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

type DayBlock = {
  id: string;
  kind: string;
  body: Record<string, unknown> | null;
};

/**
 * Completes one block the way the UI would. What counts as "completed" depends
 * on the block kind (see `EnrollmentService.validateBlockCompletion`):
 * a media task needs evidence uploaded (init -> signed PUT -> complete), a
 * scenario needs recorded choices, and everything else takes a written
 * reflection above the minimum length.
 */
async function completeBlock(
  server: Server,
  cookie: string,
  enrollmentId: string,
  block: DayBlock
): Promise<void> {
  const declaredKind = typeof block.body?.evidenceKind === "string" ? block.body.evidenceKind : null;

  if (block.kind === "task_prompt" && declaredKind && declaredKind in EVIDENCE_MIME) {
    const mimeType = EVIDENCE_MIME[declaredKind];

    const init = await request(server)
      .post(`/v1/enrollments/${enrollmentId}/blocks/${block.id}/evidence`)
      .set("Cookie", cookie)
      .send({ mimeType, kind: declaredKind, sizeBytes: EVIDENCE_BYTES.length })
      .expect(201);

    const upload = init.body.upload as { url: string; headers: Record<string, string> };
    const target = new URL(upload.url);
    await request(server)
      .put(`${target.pathname}${target.search}`)
      .set({ ...upload.headers, "content-type": mimeType })
      .send(EVIDENCE_BYTES)
      .expect(200);

    // completeEvidence routes through markBlockProgress itself, so the block is
    // completed by this call — do not also post progress for it.
    await request(server)
      .post(`/v1/enrollments/${enrollmentId}/blocks/${block.id}/evidence/${init.body.evidenceId}/complete`)
      .set("Cookie", cookie)
      .expect(201);
    return;
  }

  const interaction =
    block.kind === "scenario" ? { choices: [{ nodeId: "start", optionId: "a" }] } : { response: REFLECTION };

  await request(server)
    .post(`/v1/enrollments/${enrollmentId}/blocks/${block.id}/progress`)
    .set("Cookie", cookie)
    .send({ state: "completed", interaction })
    .expect(201);
}

/**
 * Full Experience Program runtime test: enroll -> walk every day -> program
 * completes -> async readiness evaluation produces a result.
 * Requires `pnpm --filter @career-pilot/api seed:program`.
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

  // Run the worker in-process so the async evaluation job is consumed.
  const worker = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  worker.get(WorkerRunner).start();

  const prisma = app.get(PrismaService);
  const redis = app.get<Redis>(REDIS_CONNECTION);
  const rateLimitKeys = await redis.keys("ratelimit:*");
  if (rateLimitKeys.length) {
    await redis.del(...rateLimitKeys);
  }

  const email = `enroll-smoke-${Date.now()}@example.com`;

  try {
    const program = await prisma.experienceProgram.findFirst({ where: { slug: PROGRAM_SLUG } });
    assert.ok(program, `Seed the program first: pnpm --filter @career-pilot/api seed:program`);

    const register = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ accountType: "individual", fullName: "Enroll Smoke", email, password: "enroll1234" })
      .expect(201);
    const cookie = register.headers["set-cookie"]?.[0];
    assert.ok(cookie, "expected session cookie");

    const enrolled = await request(app.getHttpServer())
      .post("/v1/enrollments")
      .set("Cookie", cookie)
      .send({ programSlug: PROGRAM_SLUG })
      .expect(201);
    const enrollmentId = enrolled.body.enrollment.id;
    const durationDays: number = enrolled.body.enrollment.durationDays;
    assert.ok(enrollmentId);
    assert.equal(durationDays, 7);

    // Walk every day, completing all of its blocks.
    for (let dayIndex = 1; dayIndex <= durationDays; dayIndex += 1) {
      const dayRes = await request(app.getHttpServer())
        .get(`/v1/enrollments/${enrollmentId}/days/${dayIndex}`)
        .set("Cookie", cookie)
        .expect(200);
      assert.ok(dayRes.body.day, `expected day ${dayIndex} to be unlocked`);
      const blocks: DayBlock[] = dayRes.body.day.modules.flatMap((m: { blocks: DayBlock[] }) => m.blocks);
      for (const block of blocks) {
        await completeBlock(app.getHttpServer(), cookie, enrollmentId, block);
      }
    }

    // Program should be completed.
    const finalEnrollment = await request(app.getHttpServer())
      .get(`/v1/enrollments/${enrollmentId}`)
      .set("Cookie", cookie)
      .expect(200);
    assert.equal(finalEnrollment.body.enrollment.status, "completed");
    assert.equal(finalEnrollment.body.enrollment.completedDays, durationDays);

    // Poll for the async readiness result.
    let result: { status: string; result: { readinessBand: string | null; dimensions: unknown[] } | null } | null = null;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get(`/v1/enrollments/${enrollmentId}/result`)
        .set("Cookie", cookie)
        .expect(200);
      if (res.body.status === "ready") {
        result = res.body;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.ok(result, "expected a readiness result within 30s");
    assert.ok(result.result, "expected result payload");
    assert.ok(result.result.readinessBand, "expected a readiness band");
    assert.ok(Array.isArray(result.result.dimensions) && result.result.dimensions.length > 0, "expected dimension scores");

    // Notifications: enrolled + result-ready should be present in-app.
    const notifs = await request(app.getHttpServer())
      .get("/v1/notifications")
      .set("Cookie", cookie)
      .expect(200);
    const types: string[] = notifs.body.notifications.map((n: { type: string }) => n.type);
    assert.ok(types.includes("program.enrolled"), "expected enroll notification");
    assert.ok(types.includes("program.result_ready"), "expected result-ready notification");

    console.log(`[enrollment-smoke] PASS — program walk, readiness (band=${result.result.readinessBand}), notifications.`);
  } finally {
    await prisma.enrollment.deleteMany({ where: { user: { email } } });
    await prisma.session.deleteMany({ where: { user: { email } } });
    await prisma.auditLog.deleteMany({ where: { actorUser: { email } } });
    await prisma.tenantMembership.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await worker.close();
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
