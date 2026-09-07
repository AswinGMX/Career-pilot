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
      const blockIds: string[] = dayRes.body.day.modules.flatMap((m: { blocks: { id: string }[] }) =>
        m.blocks.map((b) => b.id)
      );
      for (const blockId of blockIds) {
        await request(app.getHttpServer())
          .post(`/v1/enrollments/${enrollmentId}/blocks/${blockId}/progress`)
          .set("Cookie", cookie)
          .send({ state: "completed", interaction: { response: "A thoughtful reflection of sufficient length to count." } })
          .expect(201);
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
