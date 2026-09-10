import "reflect-metadata";

import assert = require("node:assert/strict");
import cookieParser = require("cookie-parser");
import request = require("supertest");

import type { Redis } from "ioredis";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { REDIS_CONNECTION } from "../src/queue/queue.constants";
import { WorkerModule } from "../src/worker/worker.module";
import { WorkerRunner } from "../src/worker/worker.runner";

/** Polls a "latest report" endpoint until the worker marks it ready. */
async function pollReportReady(
  server: Parameters<typeof request>[0],
  url: string,
  cookie: string,
  timeoutMs = 20_000
): Promise<{ id: string; status: string; fileUrl: string | null; report: Record<string, unknown> }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request(server).get(url).set("Cookie", cookie).expect(200);
    const report = response.body.report;
    if (report?.status === "ready") {
      return report;
    }
    if (report?.status === "failed") {
      throw new Error(`Report generation failed: ${report.errorMessage ?? "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Report at ${url} did not become ready within ${timeoutMs}ms.`);
}

async function main(): Promise<void> {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://career_pilot:career_pilot@127.0.0.1:5432/career_pilot";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.init();

  // Boot the background worker in-process so queued jobs (report generation)
  // are actually processed during the smoke run — exercising the full async path.
  const worker = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  worker.get(WorkerRunner).start();

  const prisma = app.get(PrismaService);

  // The rate limiter is Redis-backed and persists across process restarts;
  // clear its counters so repeated smoke runs don't trip the auth limits.
  const redis = app.get<Redis>(REDIS_CONNECTION);
  const rateLimitKeys = await redis.keys("ratelimit:*");
  if (rateLimitKeys.length > 0) {
    await redis.del(...rateLimitKeys);
  }
  const suffix = Date.now().toString();
  const studentEmail = `phase1-smoke-student-${suffix}@example.com`;
  const adminEmail = `phase1-smoke-admin-${suffix}@example.com`;
  const schoolStudentEmail = `phase1-smoke-school-student-${suffix}@example.com`;
  const createdStudentEmail = `phase1-created-school-student-${suffix}@example.com`;
  const tenantSlug = `phase1-smoke-${suffix}`;
  let seededCategoryId: string | null = null;
  let seededCareerId: string | null = null;

  try {
    const studentRegister = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        accountType: "individual",
        fullName: "Smoke Student",
        email: studentEmail,
        password: "phase1pass"
      })
      .expect(201);

    assert.equal(studentRegister.body.authenticated, true);
    const studentCookie = studentRegister.headers["set-cookie"]?.[0];
    assert.ok(studentCookie, "expected student session cookie");

    const studentMe = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Cookie", studentCookie)
      .expect(200);

    assert.equal(studentMe.body.authenticated, true);
    assert.equal(studentMe.body.session.user.email, studentEmail);

    const updatedProfile = await request(app.getHttpServer())
      .put("/v1/student-profile")
      .set("Cookie", studentCookie)
      .send({
        gradeLevel: "Grade 11",
        ageBand: "16-17",
        favoriteSubjects: ["Mathematics", "Physics"],
        favoriteActivities: ["Coding", "Projects"],
        topicsCuriousAbout: ["AI", "Systems"],
        personalStrengths: ["Focus", "Pattern recognition"],
        avoidsOrDislikes: ["Ambiguous instructions"]
      })
      .expect(200);

    assert.equal(updatedProfile.body.profile.gradeLevel, "Grade 11");
    assert.equal(updatedProfile.body.profile.versionCount, 1);

    const fetchedProfile = await request(app.getHttpServer())
      .get("/v1/student-profile")
      .set("Cookie", studentCookie)
      .expect(200);

    assert.equal(fetchedProfile.body.profile.favoriteSubjects.length, 2);

    const submittedProfile = await request(app.getHttpServer())
      .post("/v1/student-profile/submit")
      .set("Cookie", studentCookie)
      .expect(201);

    assert.equal(submittedProfile.body.ok, true);
    assert.equal(submittedProfile.body.profile.completionStatus, "submitted");
    assert.equal(submittedProfile.body.profile.versionCount, 2);

    const seededCategory = await prisma.careerCategory.create({
      data: {
        slug: `phase3-category-${suffix}`,
        name: "Phase 3 Testing"
      }
    });
    seededCategoryId = seededCategory.id;

    const seededCareer = await prisma.career.create({
      data: {
        categoryId: seededCategory.id,
        slug: `phase3-career-${suffix}`,
        title: "Phase 3 Career",
        summary: "A managed catalog test career."
      }
    });
    seededCareerId = seededCareer.id;

    await prisma.careerDetail.create({
      data: {
        careerId: seededCareer.id,
        educationPath: ["Step 1", "Step 2"],
        skills: ["Research", "Execution"],
        positives: ["High impact"],
        challenges: ["Complexity"],
        drawbacks: ["Tradeoffs"],
        salaryMeta: { entryLevelLpa: 5 },
        outlookMeta: { demandScore: 80 },
        resilienceMeta: { score: 75 }
      }
    });

    const careersList = await request(app.getHttpServer())
      .get("/v1/careers?q=Phase 3 Career")
      .expect(200);

    assert.equal(careersList.body.items.length, 1);
    assert.equal(careersList.body.items[0].slug, seededCareer.slug);

    const careerDetail = await request(app.getHttpServer())
      .get(`/v1/careers/${seededCareer.slug}`)
      .expect(200);

    assert.equal(careerDetail.body.career.title, "Phase 3 Career");

    const categories = await request(app.getHttpServer())
      .get("/v1/careers/categories")
      .expect(200);

    assert.ok(categories.body.categories.some((item: { slug: string }) => item.slug === seededCategory.slug));

    const proofSession = await request(app.getHttpServer())
      .post("/v1/assessments/proof-sessions")
      .set("Cookie", studentCookie)
      .send({
        careerSlug: seededCareer.slug
      })
      .expect(201);

    assert.equal(proofSession.body.session.career.slug, seededCareer.slug);
    assert.equal(proofSession.body.session.questionSet.questions.length, 8);

    const proofAnswers = proofSession.body.session.questionSet.questions.map((question: { id: string }, index: number) => ({
      questionId: question.id,
      optionIndex: index % 4
    }));

    const completedProof = await request(app.getHttpServer())
      .post(`/v1/assessments/proof-sessions/${proofSession.body.session.id}/answers`)
      .set("Cookie", studentCookie)
      .send({
        answers: proofAnswers
      })
      .expect(201);

    assert.equal(completedProof.body.session.status, "completed");
    assert.ok(completedProof.body.session.result);

    const listedProofSessions = await request(app.getHttpServer())
      .get("/v1/assessments/proof-sessions")
      .set("Cookie", studentCookie)
      .expect(200);

    assert.equal(listedProofSessions.body.sessions.length, 1);

    const recomputedRecommendations = await request(app.getHttpServer())
      .post("/v1/recommendations/recompute")
      .set("Cookie", studentCookie)
      .expect(201);

    assert.equal(recomputedRecommendations.body.ok, true);
    assert.equal(recomputedRecommendations.body.snapshot.engineVersion, "rules-v1");
    assert.ok(recomputedRecommendations.body.snapshot.items.length > 0);

    const latestRecommendations = await request(app.getHttpServer())
      .get("/v1/recommendations/latest")
      .set("Cookie", studentCookie)
      .expect(200);

    assert.equal(latestRecommendations.body.snapshot.id, recomputedRecommendations.body.snapshot.id);
    assert.equal(latestRecommendations.body.snapshot.profileVersionCount, 2);

    const generatedStudentReport = await request(app.getHttpServer())
      .post("/v1/reports/student/generate")
      .set("Cookie", studentCookie)
      .expect(202);

    assert.equal(generatedStudentReport.body.ok, true);
    assert.ok(generatedStudentReport.body.report.id, "expected a queued report id");

    // Async generation: poll until the worker marks the report ready.
    const readyStudentReport = await pollReportReady(
      app.getHttpServer(),
      "/v1/reports/student/latest",
      studentCookie
    );

    assert.equal(readyStudentReport.id, generatedStudentReport.body.report.id);
    assert.equal(readyStudentReport.status, "ready");
    assert.ok(readyStudentReport.fileUrl, "expected a signed report fileUrl");
    assert.ok((readyStudentReport.report as { topRecommendationTitle?: string }).topRecommendationTitle);

    const createdShare = await request(app.getHttpServer())
      .post("/v1/reports/student/latest/share")
      .set("Cookie", studentCookie)
      .send({
        expiresInDays: 7
      })
      .expect(201);

    assert.equal(createdShare.body.ok, true);
    assert.ok(createdShare.body.share.publicUrl);
    const shareToken = String(createdShare.body.share.publicUrl).split("/").pop();
    assert.ok(shareToken);

    const parentView = await request(app.getHttpServer())
      .get(`/v1/reports/parent/${shareToken}`)
      .expect(200);

    assert.equal(parentView.body.report.id, generatedStudentReport.body.report.id);
    assert.equal(parentView.body.report.report.student.email, studentEmail);

    const revokedShare = await request(app.getHttpServer())
      .post(`/v1/reports/student/shares/${createdShare.body.share.id}/revoke`)
      .set("Cookie", studentCookie)
      .expect(201);

    assert.equal(revokedShare.body.ok, true);
    assert.ok(revokedShare.body.share.revokedAt);

    const adminRegister = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        accountType: "school_admin",
        fullName: "Smoke Admin",
        email: adminEmail,
        password: "phase1pass",
        schoolName: "Smoke School",
        tenantSlug
      })
      .expect(201);

    assert.equal(adminRegister.body.authenticated, true);
    assert.equal(adminRegister.body.session.activeMembership.role, "school_admin");

    const adminCookie = adminRegister.headers["set-cookie"]?.[0];
    assert.ok(adminCookie, "expected admin session cookie");

    const tenantId = adminRegister.body.session.activeMembership.tenant.id as string;

    const schoolStudentRegister = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        accountType: "school_student",
        fullName: "Smoke School Student",
        email: schoolStudentEmail,
        password: "phase1pass",
        tenantSlug
      })
      .expect(201);

    const schoolStudentCookie = schoolStudentRegister.headers["set-cookie"]?.[0];
    assert.ok(schoolStudentCookie, "expected school student session cookie");

    await request(app.getHttpServer())
      .put("/v1/student-profile")
      .set("Cookie", schoolStudentCookie)
      .send({
        gradeLevel: "Grade 10",
        ageBand: "15-16",
        favoriteSubjects: ["History", "Civics"],
        favoriteActivities: ["Debate", "Helping"],
        topicsCuriousAbout: ["Policy", "Leadership"],
        personalStrengths: ["Communication", "Empathy"],
        avoidsOrDislikes: ["Isolation"]
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/v1/student-profile/submit")
      .set("Cookie", schoolStudentCookie)
      .expect(201);

    await request(app.getHttpServer())
      .post("/v1/recommendations/recompute")
      .set("Cookie", schoolStudentCookie)
      .expect(201);

    const schoolStudentProofSession = await request(app.getHttpServer())
      .post("/v1/assessments/proof-sessions")
      .set("Cookie", schoolStudentCookie)
      .send({
        careerSlug: "civil-services-officer"
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/assessments/proof-sessions/${schoolStudentProofSession.body.session.id}/answers`)
      .set("Cookie", schoolStudentCookie)
      .send({
        answers: schoolStudentProofSession.body.session.questionSet.questions.map((question: { id: string }, index: number) => ({
          questionId: question.id,
          optionIndex: (index + 1) % 4
        }))
      })
      .expect(201);

    const tenantMe = await request(app.getHttpServer())
      .get("/v1/tenants/me")
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(tenantMe.body.tenant.slug, tenantSlug);

    const tenantMembers = await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantId}/members`)
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(tenantMembers.body.members.length, 2);
    assert.ok(tenantMembers.body.members.some((member: { email: string }) => member.email === adminEmail));
    assert.ok(tenantMembers.body.members.some((member: { email: string }) => member.email === schoolStudentEmail));

    const schoolRoster = await request(app.getHttpServer())
      .get(`/v1/reports/schools/${tenantId}/students`)
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(schoolRoster.body.students.length, 1);
    assert.equal(schoolRoster.body.students[0].email, schoolStudentEmail);
    assert.equal(schoolRoster.body.students[0].recommendationStatus, "ready");
    assert.equal(schoolRoster.body.students[0].completedProofSessions, 1);

    const schoolStudentId = schoolStudentRegister.body.session.user.id as string;

    const schoolStudentReport = await request(app.getHttpServer())
      .get(`/v1/reports/schools/${tenantId}/students/${schoolStudentId}`)
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(schoolStudentReport.body.report.student.email, schoolStudentEmail);
    assert.ok(schoolStudentReport.body.report.latestRecommendation);
    assert.equal(schoolStudentReport.body.report.proofSessions.length, 1);

    const createdStudent = await request(app.getHttpServer())
      .post(`/v1/tenants/${tenantId}/students`)
      .set("Cookie", adminCookie)
      .send({
        fullName: "Created By School Admin",
        email: createdStudentEmail,
        password: "phase1pass"
      })
      .expect(201);

    assert.equal(createdStudent.body.student.email, createdStudentEmail);
    assert.equal(createdStudent.body.student.membershipRole, "student");

    const searchedRoster = await request(app.getHttpServer())
      .get(`/v1/reports/schools/${tenantId}/students?q=Created&page=1&pageSize=1`)
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(searchedRoster.body.students.length, 1);
    assert.equal(searchedRoster.body.total, 1);
    assert.equal(searchedRoster.body.students[0].email, createdStudentEmail);

    const generatedSchoolReport = await request(app.getHttpServer())
      .post(`/v1/reports/schools/${tenantId}/generate`)
      .set("Cookie", adminCookie)
      .expect(202);

    assert.equal(generatedSchoolReport.body.ok, true);
    assert.ok(generatedSchoolReport.body.report.id, "expected a queued school report id");

    const readySchoolReport = await pollReportReady(
      app.getHttpServer(),
      `/v1/reports/schools/${tenantId}/latest`,
      adminCookie
    );

    assert.equal(readySchoolReport.id, generatedSchoolReport.body.report.id);
    assert.equal(readySchoolReport.status, "ready");
    assert.ok((readySchoolReport.report as { totals: { students: number } }).totals.students >= 2);

    const latestSchoolReport = await request(app.getHttpServer())
      .get(`/v1/reports/schools/${tenantId}/latest`)
      .set("Cookie", adminCookie)
      .expect(200);

    assert.equal(latestSchoolReport.body.tenant.slug, tenantSlug);

    const refreshed = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .set("Cookie", adminCookie)
      .expect(201);

    assert.equal(refreshed.body.authenticated, true);
    const refreshedCookie = refreshed.headers["set-cookie"]?.[0];
    assert.ok(refreshedCookie, "expected refreshed session cookie");

    await request(app.getHttpServer())
      .post("/v1/auth/logout")
      .set("Cookie", refreshedCookie)
      .expect(201);

    const loggedOut = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Cookie", refreshedCookie)
      .expect(200);

    assert.equal(loggedOut.body.authenticated, false);

    const metrics = await request(app.getHttpServer()).get("/v1/metrics").expect(200);

    assert.match(String(metrics.text), /career_pilot_api_requests_total/);
    assert.match(String(metrics.text), /career_pilot_api_uptime_seconds/);
  } finally {
    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.passwordResetToken.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.auditLog.deleteMany({
      where: {
        actorUser: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.reportShare.deleteMany({
      where: {
        report: {
          user: {
            email: {
              in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
            }
          }
        }
      }
    });

    await prisma.report.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.tenantMembership.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.profileVersion.deleteMany({
      where: {
        studentProfile: {
          user: {
            email: {
              in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
            }
          }
        }
      }
    });

    await prisma.proofSession.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.recommendationSnapshot.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.studentProfile.deleteMany({
      where: {
        user: {
          email: {
            in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
          }
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [studentEmail, adminEmail, schoolStudentEmail, createdStudentEmail]
        }
      }
    });

    await prisma.tenant.deleteMany({
      where: {
        slug: tenantSlug
      }
    });

    if (seededCareerId) {
      await prisma.careerDetail.deleteMany({
        where: {
          careerId: seededCareerId
        }
      });

      await prisma.career.deleteMany({
        where: {
          id: seededCareerId
        }
      });
    }

    if (seededCategoryId) {
      await prisma.careerCategory.deleteMany({
        where: {
          id: seededCategoryId
        }
      });
    }

    await worker.close();
    await app.close();
  }
}

main()
  .then(() => {
    console.log("[smoke] PASS — all flows green.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
