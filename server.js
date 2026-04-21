const http = require("http");
const crypto = require("crypto");

const { analyzeProfile, evaluateProofSession, generateProfileQuestionSet, generateProofQuestionSet } = require("./src/server/assessment");
const { buildLogoutCookie, buildSessionCookie, hashPassword, parseSessionToken, sessionCookieName, verifyPassword } = require("./src/server/auth");
const { getCareerById, getCareerLibrary, searchCareers } = require("./src/server/careers");
const { createRecord, ensureDatabase, findTenantBySlug, findUserByEmail, getProfileByUserId, getProofSessionsByUserId, logActivity, mutateDb, readDb, sanitizeUser } = require("./src/server/db");
const { getRequestInfo, parseCookies, parseJsonBody, sendJson, sendText, serveStaticAsset } = require("./src/server/http");
const { isGeminiConfigured } = require("./src/server/gemini");
const { rankCareers } = require("./src/server/recommendations");
const { ensureDemoData, getDemoAccounts } = require("./src/server/seed");

const projectRoot = __dirname;
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

ensureDatabase();
ensureDemoData();

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assert(condition, statusCode, message) {
  if (!condition) {
    throw createError(statusCode, message);
  }
}

function getSessionContext(request) {
  const db = readDb();
  const cookies = parseCookies(request);
  const token = cookies[sessionCookieName];
  const session = parseSessionToken(token);

  if (!session) {
    return { db, user: null, tenant: null };
  }

  const user = db.users.find((item) => item.id === session.sub) || null;
  const tenant = user?.tenantId ? db.tenants.find((item) => item.id === user.tenantId) || null : null;

  return { db, user, tenant };
}

function requireAuth(context) {
  assert(context.user, 401, "Authentication required.");
  return context.user;
}

function requireStudent(user) {
  assert(user.role === "student_individual" || user.role === "student_school", 403, "Student access required.");
}

function requireSchoolAdmin(user) {
  assert(user.role === "school_admin", 403, "School admin access required.");
}

function createTenantJoinCode(name) {
  const prefix = String(name || "SCH")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function buildSettingsPayload(user, tenant) {
  return {
    fullName: user.fullName,
    email: user.email,
    grade: user.grade || "",
    role: user.role,
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        }
      : null
  };
}

function normalizeProofSession(session) {
  if (!session) {
    return null;
  }

  const career = session.careerId ? getCareerById(session.careerId) : null;

  return {
    ...session,
    careerCategory: session.careerCategory || career?.category || ""
  };
}

function summarizeProofSession(session) {
  const normalizedSession = normalizeProofSession(session);

  if (!normalizedSession?.evaluation) {
    return null;
  }

  return {
    id: normalizedSession.id,
    careerId: normalizedSession.careerId,
    careerTitle: normalizedSession.careerTitle,
    careerCategory: normalizedSession.careerCategory,
    points: normalizedSession.evaluation.points,
    overallScore: normalizedSession.evaluation.overallScore,
    readinessBand: normalizedSession.evaluation.readinessBand,
    completedAt: normalizedSession.completedAt
  };
}

function buildStudentReport(user, db) {
  const profile = getProfileByUserId(db, user.id);
  const proofSessions = getProofSessionsByUserId(db, user.id)
    .filter((session) => session.status === "completed")
    .map((session) => normalizeProofSession(session))
    .sort((left, right) => new Date(right.completedAt || right.createdAt) - new Date(left.completedAt || left.createdAt));
  const recommendations = profile ? rankCareers(profile.analysis, getCareerLibrary(), 8) : [];
  const totalPoints = proofSessions.reduce((sum, session) => sum + (session.evaluation?.points || 0), 0);

  return {
    student: sanitizeUser(user),
    profile,
    recommendations,
    proofSessions,
    totalPoints
  };
}

function buildSchoolStudentCards(db, tenantId) {
  return db.users
    .filter((user) => user.role === "student_school" && user.tenantId === tenantId)
    .map((student) => {
      const report = buildStudentReport(student, db);
      const latestProof = report.proofSessions[0] ? summarizeProofSession(report.proofSessions[0]) : null;

      return {
        student: report.student,
        profileCompleted: Boolean(report.profile),
        topRecommendation: report.recommendations[0] || null,
        latestProof,
        totalPoints: report.totalPoints
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints);
}

async function handleRegister(request, response) {
  const body = await parseJsonBody(request);
  const accountType = body.accountType;

  assert(["individual", "school_admin", "school_student"].includes(accountType), 400, "Invalid account type.");
  assert(body.fullName, 400, "Full name is required.");
  assert(body.email, 400, "Email is required.");
  assert(body.password && body.password.length >= 6, 400, "Password must be at least 6 characters.");

  const result = mutateDb((db) => {
    assert(!findUserByEmail(db, body.email), 409, "An account with this email already exists.");

    let tenant = null;

    if (accountType === "school_admin") {
      assert(body.schoolName, 400, "School name is required.");
      assert(body.tenantSlug, 400, "Tenant slug is required.");
      assert(!findTenantBySlug(db, body.tenantSlug), 409, "Tenant slug is already taken.");

      tenant = createRecord({
        name: body.schoolName,
        slug: body.tenantSlug,
        joinCode: createTenantJoinCode(body.schoolName),
        type: "school"
      });

      db.tenants.push(tenant);
    }

    if (accountType === "school_student") {
      assert(body.tenantSlug || body.joinCode, 400, "Tenant slug or join code is required.");
      tenant =
        (body.tenantSlug ? findTenantBySlug(db, body.tenantSlug) : null) ||
        db.tenants.find((item) => item.joinCode === body.joinCode) ||
        null;
      assert(tenant, 404, "School tenant not found.");
    }

    const user = createRecord({
      fullName: body.fullName,
      email: String(body.email).toLowerCase(),
      passwordHash: hashPassword(body.password),
      grade: body.grade || "",
      role:
        accountType === "school_admin"
          ? "school_admin"
          : accountType === "school_student"
            ? "student_school"
            : "student_individual",
      tenantId: tenant?.id || null
    });

    db.users.push(user);
    logActivity(db, "user_registered", {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId
    });

    return { db, user, tenant };
  });

  sendJson(
    response,
    201,
    {
      user: sanitizeUser(result.user),
      tenant: result.tenant,
      geminiConfigured: isGeminiConfigured()
    },
    { "Set-Cookie": buildSessionCookie(result.user) }
  );
}

async function handleLogin(request, response) {
  const body = await parseJsonBody(request);
  const db = readDb();
  const user = findUserByEmail(db, body.email);

  assert(user, 404, "User not found.");
  assert(verifyPassword(body.password, user.passwordHash), 401, "Incorrect password.");

  if (body.tenantSlug) {
    const tenant = findTenantBySlug(db, body.tenantSlug);
    assert(tenant && user.tenantId === tenant.id, 403, "This user does not belong to the selected school tenant.");
  }

  sendJson(
    response,
    200,
    {
      user: sanitizeUser(user),
      tenant: user.tenantId ? db.tenants.find((tenant) => tenant.id === user.tenantId) || null : null,
      geminiConfigured: isGeminiConfigured()
    },
    { "Set-Cookie": buildSessionCookie(user) }
  );
}

async function handleForgotPassword(request, response) {
  const body = await parseJsonBody(request);
  const email = String(body.email || "").trim().toLowerCase();

  assert(email, 400, "Email is required.");

  let preview = null;

  mutateDb((db) => {
    const user = findUserByEmail(db, email);

    db.passwordResetTokens = db.passwordResetTokens.filter((item) => item.expiresAt > new Date().toISOString() && item.email !== email);

    if (!user) {
      return db;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.passwordResetTokens.push(
      createRecord({
        email,
        userId: user.id,
        token,
        expiresAt
      })
    );

    logActivity(db, "password_reset_requested", {
      userId: user.id
    });

    preview = {
      resetToken: token,
      resetUrl: `/reset-password/${token}`
    };

    return db;
  });

  sendJson(response, 200, {
    ok: true,
    message: "If an account exists for that email, a reset path has been prepared.",
    ...(process.env.NODE_ENV === "production" ? {} : preview || {})
  });
}

async function handleResetPassword(request, response, token) {
  const body = await parseJsonBody(request);
  assert(body.password && body.password.length >= 6, 400, "Password must be at least 6 characters.");

  mutateDb((db) => {
    const resetRecord = db.passwordResetTokens.find((item) => item.token === token);
    assert(resetRecord, 404, "Reset token not found.");
    assert(new Date(resetRecord.expiresAt) > new Date(), 410, "Reset token has expired.");

    const user = db.users.find((item) => item.id === resetRecord.userId);
    assert(user, 404, "User not found for this reset token.");

    user.passwordHash = hashPassword(body.password);
    db.passwordResetTokens = db.passwordResetTokens.filter((item) => item.userId !== user.id);

    logActivity(db, "password_reset_completed", {
      userId: user.id
    });

    return db;
  });

  sendJson(response, 200, {
    ok: true,
    message: "Password updated successfully."
  });
}

function handleSession(request, response) {
  const context = getSessionContext(request);

  if (!context.user) {
    sendJson(response, 200, {
      authenticated: false,
      user: null,
      tenant: null,
      geminiConfigured: isGeminiConfigured(),
      careerCount: getCareerLibrary().length
    });
    return;
  }

  sendJson(response, 200, {
    authenticated: true,
    user: sanitizeUser(context.user),
    tenant: context.tenant,
    geminiConfigured: isGeminiConfigured(),
    careerCount: getCareerLibrary().length
  });
}

function handleLogout(response) {
  sendJson(
    response,
    200,
    { ok: true },
    { "Set-Cookie": buildLogoutCookie() }
  );
}

function handleSettingsGet(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);

  sendJson(response, 200, {
    settings: buildSettingsPayload(user, context.tenant)
  });
}

async function handleSettingsProfileUpdate(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  const body = await parseJsonBody(request);

  assert(String(body.fullName || "").trim(), 400, "Full name is required.");

  const updatedDb = mutateDb((db) => {
    const storedUser = db.users.find((item) => item.id === user.id);
    assert(storedUser, 404, "User not found.");

    storedUser.fullName = String(body.fullName).trim();
    storedUser.grade = String(body.grade || "").trim();

    logActivity(db, "settings_profile_updated", {
      userId: storedUser.id
    });

    return db;
  });

  const updatedUser = updatedDb.users.find((item) => item.id === user.id);
  const tenant = updatedUser?.tenantId ? updatedDb.tenants.find((item) => item.id === updatedUser.tenantId) || null : null;

  sendJson(response, 200, {
    settings: buildSettingsPayload(updatedUser, tenant)
  });
}

async function handleSettingsPasswordUpdate(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  const body = await parseJsonBody(request);

  assert(body.currentPassword, 400, "Current password is required.");
  assert(body.newPassword && body.newPassword.length >= 6, 400, "New password must be at least 6 characters.");
  assert(verifyPassword(body.currentPassword, user.passwordHash), 401, "Current password is incorrect.");

  mutateDb((db) => {
    const storedUser = db.users.find((item) => item.id === user.id);
    assert(storedUser, 404, "User not found.");

    storedUser.passwordHash = hashPassword(body.newPassword);
    db.passwordResetTokens = db.passwordResetTokens.filter((item) => item.userId !== storedUser.id);

    logActivity(db, "settings_password_updated", {
      userId: storedUser.id
    });

    return db;
  });

  sendJson(response, 200, {
    ok: true,
    message: "Password updated successfully."
  });
}

function handleStudentDashboard(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);

  sendJson(response, 200, buildStudentReport(user, context.db));
}

function handleSchoolOverview(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireSchoolAdmin(user);

  const studentCards = buildSchoolStudentCards(context.db, user.tenantId);
  const completedProfiles = studentCards.filter((item) => item.profileCompleted).length;
  const proofCount = studentCards.filter((item) => item.latestProof).length;
  const totalPoints = studentCards.reduce((sum, item) => sum + item.totalPoints, 0);

  sendJson(response, 200, {
    tenant: context.tenant,
    stats: {
      totalStudents: studentCards.length,
      completedProfiles,
      proofCount,
      totalPoints
    },
    students: studentCards
  });
}

async function handleCreateSchoolStudent(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireSchoolAdmin(user);
  const body = await parseJsonBody(request);

  assert(body.fullName, 400, "Student name is required.");
  assert(body.email, 400, "Student email is required.");
  assert(body.password && body.password.length >= 6, 400, "Temporary password must be at least 6 characters.");

  const updatedDb = mutateDb((db) => {
    assert(!findUserByEmail(db, body.email), 409, "Student email already exists.");

    const student = createRecord({
      fullName: body.fullName,
      email: String(body.email).toLowerCase(),
      passwordHash: hashPassword(body.password),
      grade: body.grade || "",
      role: "student_school",
      tenantId: user.tenantId
    });

    db.users.push(student);
    logActivity(db, "school_student_created", {
      adminId: user.id,
      studentId: student.id,
      tenantId: user.tenantId
    });
    return db;
  });

  const createdStudent = findUserByEmail(updatedDb, body.email);
  sendJson(response, 201, {
    student: sanitizeUser(createdStudent)
  });
}

function handleSchoolStudents(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireSchoolAdmin(user);

  sendJson(response, 200, {
    students: buildSchoolStudentCards(context.db, user.tenantId)
  });
}

function handleSchoolStudentDetail(request, response, studentId) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireSchoolAdmin(user);

  const student = context.db.users.find(
    (item) => item.id === studentId && item.role === "student_school" && item.tenantId === user.tenantId
  );

  assert(student, 404, "Student not found.");
  sendJson(response, 200, buildStudentReport(student, context.db));
}

function handleProfileGet(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);

  sendJson(response, 200, {
    profile: getProfileByUserId(context.db, user.id)
  });
}

async function handleProfileQuestionSet(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);
  const body = await parseJsonBody(request);

  const questionSet = await generateProfileQuestionSet({
    studentName: user.fullName,
    grade: body.grade || user.grade || "",
    favoriteSubjects: body.favoriteSubjects || "",
    favoriteActivities: body.favoriteActivities || "",
    topicsCuriousAbout: body.topicsCuriousAbout || ""
  });

  sendJson(response, 200, questionSet);
}

async function handleProfileSubmit(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);
  const body = await parseJsonBody(request);

  assert(body.basicInfo, 400, "Profile basics are required.");
  assert(body.questionSet?.questions?.length, 400, "Question set is required.");
  assert(Array.isArray(body.answers) && body.answers.length, 400, "Answers are required.");

  const analysis = await analyzeProfile({
    basicInfo: {
      ...body.basicInfo,
      studentName: user.fullName
    },
    answers: body.answers,
    questionSet: body.questionSet
  });

  const updatedDb = mutateDb((db) => {
    const existing = db.profiles.find((profile) => profile.userId === user.id);
    const payload = {
      userId: user.id,
      basicInfo: body.basicInfo,
      questionSet: body.questionSet,
      answers: body.answers,
      analysis,
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      Object.assign(existing, payload);
    } else {
      db.profiles.push(
        createRecord({
          ...payload
        })
      );
    }

    logActivity(db, "profile_submitted", {
      userId: user.id,
      tenantId: user.tenantId || null
    });

    return db;
  });

  sendJson(response, 200, {
    profile: getProfileByUserId(updatedDb, user.id)
  });
}

function handleRecommendations(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);
  const profile = getProfileByUserId(context.db, user.id);

  assert(profile, 400, "Complete the AI profile before requesting recommendations.");

  sendJson(response, 200, {
    recommendations: rankCareers(profile.analysis, getCareerLibrary(), 12)
  });
}

function handleCareers(request, response) {
  const { searchParams } = getRequestInfo(request);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const limitParam = Number(searchParams.get("limit") || "165");
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 165;

  const careers = searchCareers({ search, category }).slice(0, limit);

  sendJson(response, 200, {
    careers,
    total: careers.length,
    allCareerCount: getCareerLibrary().length
  });
}

function handleCareerDetail(response, careerId) {
  const career = getCareerById(careerId);
  assert(career, 404, "Career not found.");
  sendJson(response, 200, { career });
}

async function handleCreateProofSession(request, response, careerId) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);
  const career = getCareerById(careerId);
  assert(career, 404, "Career not found.");
  const profile = getProfileByUserId(context.db, user.id);
  assert(profile, 400, "Complete the student profile before starting a proof session.");

  const questionSet = await generateProofQuestionSet({
    career,
    profile: profile.analysis
  });

  const updatedDb = mutateDb((db) => {
    db.proofSessions.push(
      createRecord({
        userId: user.id,
        careerId: career.id,
        careerTitle: career.title,
        careerCategory: career.category,
        status: "draft",
        questionSet,
        answers: []
      })
    );
    return db;
  });

  const session = updatedDb.proofSessions.find(
    (item) => item.userId === user.id && item.careerId === career.id && item.status === "draft"
  );

  sendJson(response, 201, { session: normalizeProofSession(session) });
}

async function handleSubmitProofSession(request, response, sessionId) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);
  const body = await parseJsonBody(request);

  const session = context.db.proofSessions.find((item) => item.id === sessionId && item.userId === user.id);
  assert(session, 404, "Proof session not found.");
  assert(Array.isArray(body.answers) && body.answers.length === session.questionSet.questions.length, 400, "All answers are required.");

  const career = getCareerById(session.careerId);
  assert(career, 404, "Career not found for this proof session.");
  const profile = getProfileByUserId(context.db, user.id);
  assert(profile, 400, "Profile is required to evaluate proof readiness.");

  const evaluation = await evaluateProofSession({
    career,
    profile: profile.analysis,
    answers: body.answers,
    questionSet: session.questionSet
  });

  const updatedDb = mutateDb((db) => {
    const storedSession = db.proofSessions.find((item) => item.id === sessionId && item.userId === user.id);
    Object.assign(storedSession, {
      answers: body.answers,
      evaluation,
      status: "completed",
      completedAt: new Date().toISOString()
    });

    logActivity(db, "proof_completed", {
      userId: user.id,
      careerId: career.id,
      points: evaluation.points
    });

    return db;
  });

  const storedSession = updatedDb.proofSessions.find((item) => item.id === sessionId);
  sendJson(response, 200, { session: normalizeProofSession(storedSession) });
}

function handleProofSessions(request, response) {
  const context = getSessionContext(request);
  const user = requireAuth(context);
  requireStudent(user);

  const sessions = getProofSessionsByUserId(context.db, user.id).sort(
    (left, right) => new Date(right.completedAt || right.createdAt) - new Date(left.completedAt || left.createdAt)
  );

  sendJson(response, 200, { sessions: sessions.map((session) => normalizeProofSession(session)) });
}

function handleAppConfig(response) {
  sendJson(response, 200, {
    geminiConfigured: isGeminiConfigured(),
    careerCount: getCareerLibrary().length,
    demoAccounts: getDemoAccounts()
  });
}

async function routeApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "career-reality-platform" });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/app-config") {
    handleAppConfig(response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/auth/session") {
    handleSession(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    await handleRegister(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    await handleLogin(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/forgot-password") {
    await handleForgotPassword(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    handleLogout(response);
    return true;
  }

  const resetPasswordMatch = pathname.match(/^\/api\/auth\/reset-password\/([a-z0-9]+)$/);
  if (request.method === "POST" && resetPasswordMatch) {
    await handleResetPassword(request, response, resetPasswordMatch[1]);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/dashboard") {
    handleStudentDashboard(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/profile") {
    handleProfileGet(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/settings/profile") {
    handleSettingsGet(request, response);
    return true;
  }

  if (request.method === "PUT" && pathname === "/api/settings/profile") {
    await handleSettingsProfileUpdate(request, response);
    return true;
  }

  if (request.method === "PUT" && pathname === "/api/settings/password") {
    await handleSettingsPasswordUpdate(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/profile/question-set") {
    await handleProfileQuestionSet(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/profile/submit") {
    await handleProfileSubmit(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/recommendations") {
    handleRecommendations(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/careers") {
    handleCareers(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/proof-sessions") {
    handleProofSessions(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/schools/overview") {
    handleSchoolOverview(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/schools/students") {
    handleSchoolStudents(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/schools/students") {
    await handleCreateSchoolStudent(request, response);
    return true;
  }

  const schoolStudentMatch = pathname.match(/^\/api\/schools\/students\/([a-z0-9-]+)$/);
  if (request.method === "GET" && schoolStudentMatch) {
    handleSchoolStudentDetail(request, response, schoolStudentMatch[1]);
    return true;
  }

  const careerMatch = pathname.match(/^\/api\/careers\/([a-z0-9-]+)$/);
  if (request.method === "GET" && careerMatch) {
    handleCareerDetail(response, careerMatch[1]);
    return true;
  }

  const proofStartMatch = pathname.match(/^\/api\/careers\/([a-z0-9-]+)\/proof-session$/);
  if (request.method === "POST" && proofStartMatch) {
    await handleCreateProofSession(request, response, proofStartMatch[1]);
    return true;
  }

  const proofSubmitMatch = pathname.match(/^\/api\/proof-sessions\/([a-z0-9-]+)\/submit$/);
  if (request.method === "POST" && proofSubmitMatch) {
    await handleSubmitProofSession(request, response, proofSubmitMatch[1]);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  try {
    setCorsHeaders(request, response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const { pathname } = getRequestInfo(request);

    if (pathname.startsWith("/api/")) {
      const handled = await routeApi(request, response, pathname);

      if (!handled) {
        sendJson(response, 404, { error: "API route not found." });
      }
      return;
    }

    serveStaticAsset(projectRoot, pathname, response);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(response, statusCode, {
      error: error.message || "Internal server error."
    });
  }
});

server.listen(port, host, () => {
  console.log(`Career Reality platform is running at http://${host}:${port}`);
});
