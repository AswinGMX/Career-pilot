import type { Redis } from "ioredis";

import assert = require("node:assert/strict");
import cookieParser = require("cookie-parser");
import request = require("supertest");

import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { REDIS_CONNECTION } from "../src/queue/queue.constants";

/**
 * Mentor flow: register mentor + student -> student requests -> mentor accepts
 * -> mentor builds a guidance plan (manual + program-linked steps) -> student
 * sees it, marks a manual step done, and the two exchange a message. Also
 * checks access control (mentor can't see a non-accepted student).
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

  const prisma = app.get(PrismaService);
  const redis = app.get<Redis>(REDIS_CONNECTION);
  const rateLimitKeys = await redis.keys("ratelimit:*");
  if (rateLimitKeys.length) {
    await redis.del(...rateLimitKeys);
  }
  const server = app.getHttpServer();
  const stamp = Date.now();
  const mentorEmail = `mentor-smoke-${stamp}@example.com`;
  const studentEmail = `mentee-smoke-${stamp}@example.com`;
  const otherEmail = `other-smoke-${stamp}@example.com`;
  const emails = [mentorEmail, studentEmail, otherEmail];

  const cookieOf = (res: request.Response): string => {
    const cookie = res.headers["set-cookie"]?.[0];
    assert.ok(cookie, "expected session cookie");
    return cookie;
  };

  try {
    // ── Mentor registers and is recognised as a mentor ──
    const mentorReg = await request(server)
      .post("/v1/auth/register")
      .send({ accountType: "mentor", fullName: "Mentor Smoke", email: mentorEmail, password: "mentor1234", headline: "Senior Engineer" })
      .expect(201);
    const mentorCookie = cookieOf(mentorReg);
    const me = await request(server).get("/v1/auth/me").set("Cookie", mentorCookie).expect(200);
    assert.ok(me.body.session.mentor, "mentor session should carry a mentor profile");

    // ── Student registers and browses mentors ──
    const studentReg = await request(server)
      .post("/v1/auth/register")
      .send({ accountType: "individual", fullName: "Mentee Smoke", email: studentEmail, password: "mentee1234" })
      .expect(201);
    const studentCookie = cookieOf(studentReg);

    const browse = await request(server).get("/v1/mentors").set("Cookie", studentCookie).expect(200);
    const target = browse.body.mentors.find((m: { fullName: string }) => m.fullName === "Mentor Smoke");
    assert.ok(target, "student should see the mentor in browse");

    // ── Student requests, mentor accepts ──
    await request(server).post(`/v1/mentors/${target.id}/request`).set("Cookie", studentCookie).send({ message: "Please mentor me" }).expect(201);

    const incoming = await request(server).get("/v1/mentors/requests").set("Cookie", mentorCookie).expect(200);
    assert.equal(incoming.body.requests.length, 1, "mentor should have one pending request");
    const reqId = incoming.body.requests[0].id;
    await request(server).post(`/v1/mentors/requests/${reqId}/accept`).set("Cookie", mentorCookie).expect(201);

    const students = await request(server).get("/v1/mentors/students").set("Cookie", mentorCookie).expect(200);
    assert.equal(students.body.students.length, 1, "mentor should have one connected student");
    const studentUserId = students.body.students[0].userId;

    // ── Mentor builds a plan (one manual step, one program-linked step) ──
    const planRes = await request(server)
      .put(`/v1/mentors/students/${studentUserId}/plan`)
      .set("Cookie", mentorCookie)
      .send({
        title: "Path to Software Engineering",
        summary: "From foundations to proof.",
        notes: "Proud of you.",
        steps: [
          { id: "s1", title: "Lock the fundamentals", status: "todo", order: 0 },
          { id: "s2", title: "Finish the SWE program", status: "todo", order: 1, link: { kind: "program", slug: "software-engineer-reality", label: "SWE Reality" } }
        ]
      })
      .expect(200);
    assert.equal(planRes.body.plan.steps.length, 2);
    const linkedStep = planRes.body.plan.steps.find((s: { id: string }) => s.id === "s2");
    assert.ok(linkedStep.link, "linked step keeps its link");
    assert.ok(linkedStep.liveStatus, "linked step has a computed liveStatus");

    // ── Student sees the plan and updates a manual step ──
    const mine = await request(server).get("/v1/mentors/me").set("Cookie", studentCookie).expect(200);
    const accepted = mine.body.mentors.find((m: { status: string }) => m.status === "accepted");
    assert.ok(accepted?.plan, "student sees the accepted mentor's plan");
    const planId = accepted.plan.id;

    const progressed = await request(server)
      .post(`/v1/mentors/me/plans/${planId}/steps/s1/status`)
      .set("Cookie", studentCookie)
      .send({ status: "done" })
      .expect(201);
    const manualStep = progressed.body.plan.steps.find((s: { id: string }) => s.id === "s1");
    assert.equal(manualStep.status, "done", "student can mark a manual step done");

    // Student cannot manually change a program-linked step.
    await request(server)
      .post(`/v1/mentors/me/plans/${planId}/steps/s2/status`)
      .set("Cookie", studentCookie)
      .send({ status: "done" })
      .expect(400);

    // ── Messaging both ways ──
    await request(server).post(`/v1/mentors/conversations/${reqId}/messages`).set("Cookie", studentCookie).send({ body: "Thank you!" }).expect(201);
    await request(server).post(`/v1/mentors/conversations/${reqId}/messages`).set("Cookie", mentorCookie).send({ body: "You're welcome." }).expect(201);
    const thread = await request(server).get(`/v1/mentors/conversations/${reqId}/messages`).set("Cookie", mentorCookie).expect(200);
    assert.equal(thread.body.messages.length, 2, "both messages are in the thread");

    // ── Access control: mentor can't view a non-accepted student ──
    const otherReg = await request(server)
      .post("/v1/auth/register")
      .send({ accountType: "individual", fullName: "Other Smoke", email: otherEmail, password: "other1234" })
      .expect(201);
    const otherCookie = cookieOf(otherReg);
    const otherMe = await request(server).get("/v1/auth/me").set("Cookie", otherCookie).expect(200);
    await request(server).get(`/v1/mentors/students/${otherMe.body.session.user.id}`).set("Cookie", mentorCookie).expect(403);

    console.log("[mentor-smoke] PASS — request, accept, plan (manual + linked), progress, messaging, access control.");
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
