import type { Redis } from "ioredis";

import assert = require("node:assert/strict");
import cookieParser = require("cookie-parser");
import request = require("supertest");

import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { REDIS_COMMAND_CONNECTION } from "../src/queue/queue.constants";
import { resolveTrustProxy } from "../src/platform/trust-proxy";

const LOGIN_LIMIT = 10;

/**
 * Regression coverage for request-path hardening:
 * 1. the rate limiter cannot be bypassed by rotating `x-forwarded-for`;
 * 2. `TRUST_PROXY` parsing defaults to trusting nothing;
 * 3. `/v1/health` always answers, and answers quickly.
 */
async function main(): Promise<void> {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://career_pilot:career_pilot@127.0.0.1:5432/career_pilot";

  // Trust-proxy parsing is pure, so assert it before paying for a Nest boot.
  assert.equal(resolveTrustProxy(undefined), false, "unset TRUST_PROXY must trust nothing");
  assert.equal(resolveTrustProxy(""), false, "blank TRUST_PROXY must trust nothing");
  assert.equal(resolveTrustProxy("false"), false);
  assert.equal(resolveTrustProxy("0"), false);
  assert.equal(resolveTrustProxy("1"), 1, "a hop count must pass through as a number");
  assert.equal(resolveTrustProxy("loopback, 10.0.0.0/8"), "loopback, 10.0.0.0/8");

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();

  const redis = app.get<Redis>(REDIS_COMMAND_CONNECTION);

  try {
    const existing = await redis.keys("ratelimit:auth-login:*");
    if (existing.length) {
      await redis.del(...existing);
    }

    // A forged, per-request x-forwarded-for must NOT mint a fresh limiter key.
    // With no trusted proxy configured, every attempt counts against the socket
    // address, so the limit still trips.
    let sawRateLimit = false;
    for (let attempt = 1; attempt <= LOGIN_LIMIT + 1; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .set("x-forwarded-for", `203.0.113.${attempt}`)
        .send({ email: `no-such-user-${attempt}@example.com`, password: "wrong-password" });

      if (response.status === 429) {
        sawRateLimit = true;
        break;
      }

      assert.equal(response.status, 401, `attempt ${attempt} should be rejected credentials, got ${response.status}`);
    }
    assert.ok(sawRateLimit, "rotating x-forwarded-for bypassed the login rate limit");

    // Health must answer within its own deadline even when a dependency is slow.
    const startedAt = Date.now();
    const health = await request(app.getHttpServer()).get("/v1/health");
    const elapsedMs = Date.now() - startedAt;
    assert.ok([200, 503].includes(health.status), `unexpected health status ${health.status}`);
    assert.equal(typeof health.body.ok, "boolean");
    assert.ok(elapsedMs < 10_000, `health took ${elapsedMs}ms; probes must not hang`);

    console.log("[security-smoke] PASS — limiter keys off trusted IP, health answers, trust-proxy defaults closed.");
  } finally {
    const keys = await redis.keys("ratelimit:auth-login:*");
    if (keys.length) {
      await redis.del(...keys);
    }
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
