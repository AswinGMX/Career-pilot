import type {
  AuthMeResponse,
  CareerCategoriesResponse,
  CareerDetailResponse,
  CareerListResponse,
  GenerateQuestionsResponse,
  McqGeneratePayload,
  McqSetResponse,
  McqSetsListResponse,
  ParentSharedReportResponse,
  ProfileSubmitResponse,
  ProfileUpdatePayload,
  ProofSessionAnswerPayload,
  ProofSessionListResponse,
  ProofSessionResponse,
  ProofSessionStartPayload,
  RecommendationLatestResponse,
  RecommendationRecomputeResponse,
  SchoolGenerateReportResponse,
  SchoolLatestReportResponse,
  SchoolStudentCreatePayload,
  SchoolStudentCreateResponse,
  SchoolStudentDetailResponse,
  SchoolStudentsResponse,
  StudentGenerateReportResponse,
  StudentLatestReportResponse,
  StudentProfileResponse,
  StudentShareCreatePayload,
  StudentShareCreateResponse,
  StudentShareRevokeResponse,
  SubmitProfileAssessmentPayload,
  SubmitProfileAssessmentResponse,
  ProgramListResponse,
  ProgramDetailResponse,
  EnrollResponse,
  EnrollmentListResponse,
  EnrollmentDetailResponse,
  EnrollmentDayResponse,
  EnrollmentResultResponse,
  BlockProgressResponse,
  ProgramAdminListResponse,
  EvidenceUploadInitResponse,
  EvidenceKind,
  SignedUploadTarget,
  ProgramOutcomeReportResponse,
  MentorBrowseResponse,
  BecomeMentorPayload,
  RequestMentorPayload,
  StudentMentorsResponse,
  MentorRequestsResponse,
  MentorStudentsResponse,
  MentorStudentDetailResponse,
  GuidancePlanResponse,
  GuidancePlanPayload,
  GuidanceStepStatus,
  MentorMessagesResponse
} from "@career-pilot/types";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  return process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/v1";
}

export async function getSession(cookieHeader?: string): Promise<AuthMeResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return {
        authenticated: false,
        session: null
      };
    }

    return (await response.json()) as AuthMeResponse;
  } catch {
    return {
      authenticated: false,
      session: null
    };
  }
}

export async function getStudentProfile(cookieHeader?: string): Promise<StudentProfileResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/student-profile`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return { profile: null };
    }

    return (await response.json()) as StudentProfileResponse;
  } catch {
    return { profile: null };
  }
}

export async function updateStudentProfile(payload: ProfileUpdatePayload): Promise<StudentProfileResponse> {
  const response = await fetch(`${getApiBaseUrl()}/student-profile`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as StudentProfileResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Profile update failed.");
  }

  return json;
}

export async function submitStudentProfile(): Promise<ProfileSubmitResponse> {
  const response = await fetch(`${getApiBaseUrl()}/student-profile/submit`, {
    method: "POST",
    credentials: "include"
  });

  const json = (await response.json()) as ProfileSubmitResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Profile submission failed.");
  }

  return json;
}

export async function generateAssessmentQuestions(): Promise<GenerateQuestionsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/assessments/generate-questions`, {
    method: "POST",
    credentials: "include"
  });

  const text = await response.text();
  let json: GenerateQuestionsResponse & { message?: string; error?: string };

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to generate questions.");
  }

  return json;
}

export async function submitProfileAssessment(payload: SubmitProfileAssessmentPayload): Promise<SubmitProfileAssessmentResponse> {
  const response = await fetch(`${getApiBaseUrl()}/assessments/score-profile-assessment`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json: SubmitProfileAssessmentResponse & { message?: string; error?: string };

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("AI service temporarily unavailable. Please try again.");
  }

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to score assessment.");
  }

  return json;
}

export async function getCareerCategories(): Promise<CareerCategoriesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/careers/categories`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return { categories: [] };
  }

  return (await response.json()) as CareerCategoriesResponse;
}

export async function getCareers(params?: {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<CareerListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.q) {
    searchParams.set("q", params.q);
  }

  if (params?.category) {
    searchParams.set("category", params.category);
  }

  if (params?.page) {
    searchParams.set("page", String(params.page));
  }

  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const response = await fetch(`${getApiBaseUrl()}/careers?${searchParams.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      items: [],
      page: 1,
      pageSize: params?.pageSize || 12,
      total: 0
    };
  }

  return (await response.json()) as CareerListResponse;
}

export async function getCareerBySlug(slug: string): Promise<CareerDetailResponse | null> {
  const response = await fetch(`${getApiBaseUrl()}/careers/${slug}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CareerDetailResponse;
}

export async function getLatestRecommendations(cookieHeader?: string): Promise<RecommendationLatestResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/recommendations/latest`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return { snapshot: null };
    }

    return (await response.json()) as RecommendationLatestResponse;
  } catch {
    return { snapshot: null };
  }
}

export async function recomputeRecommendations(): Promise<RecommendationRecomputeResponse> {
  const response = await fetch(`${getApiBaseUrl()}/recommendations/recompute`, {
    method: "POST",
    credentials: "include"
  });

  const text = await response.text();
  let json: (RecommendationRecomputeResponse & { message?: string; error?: string }) | null = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const message = json?.error || json?.message || text?.trim() || `Recommendation recompute failed (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (!json) {
    throw new Error("Recommendation recompute returned an invalid response.");
  }

  return json;
}

export async function startProofSession(payload: ProofSessionStartPayload): Promise<ProofSessionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/assessments/proof-sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as ProofSessionResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to start proof session.");
  }

  return json;
}

export async function submitProofSessionAnswers(
  sessionId: string,
  payload: ProofSessionAnswerPayload
): Promise<ProofSessionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/assessments/proof-sessions/${sessionId}/answers`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as ProofSessionResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to submit proof session.");
  }

  return json;
}

export async function getProofSessions(cookieHeader?: string): Promise<ProofSessionListResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/assessments/proof-sessions`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return { sessions: [] };
    }

    return (await response.json()) as ProofSessionListResponse;
  } catch {
    return { sessions: [] };
  }
}

export async function getProofSession(sessionId: string, cookieHeader?: string): Promise<ProofSessionResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/assessments/proof-sessions/${sessionId}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ProofSessionResponse;
  } catch {
    return null;
  }
}

export async function getSchoolStudents(
  tenantId: string,
  params?: {
    q?: string;
    page?: number;
    pageSize?: number;
  },
  cookieHeader?: string
): Promise<SchoolStudentsResponse | null> {
  try {
    const searchParams = new URLSearchParams();

    if (params?.q) {
      searchParams.set("q", params.q);
    }

    if (params?.page) {
      searchParams.set("page", String(params.page));
    }

    if (params?.pageSize) {
      searchParams.set("pageSize", String(params.pageSize));
    }

    const query = searchParams.toString();
    const response = await fetch(`${getApiBaseUrl()}/reports/schools/${tenantId}/students${query ? `?${query}` : ""}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SchoolStudentsResponse;
  } catch {
    return null;
  }
}

export async function getSchoolStudentDetail(
  tenantId: string,
  studentId: string,
  cookieHeader?: string
): Promise<SchoolStudentDetailResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/reports/schools/${tenantId}/students/${studentId}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SchoolStudentDetailResponse;
  } catch {
    return null;
  }
}

export async function createSchoolStudent(
  tenantId: string,
  payload: SchoolStudentCreatePayload
): Promise<SchoolStudentCreateResponse> {
  const response = await fetch(`${getApiBaseUrl()}/tenants/${tenantId}/students`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as SchoolStudentCreateResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to create student.");
  }

  return json;
}

export async function getLatestStudentReport(cookieHeader?: string): Promise<StudentLatestReportResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/reports/student/latest`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return { report: null };
    }

    return (await response.json()) as StudentLatestReportResponse;
  } catch {
    return { report: null };
  }
}

export async function generateStudentReport(): Promise<StudentGenerateReportResponse> {
  const response = await fetch(`${getApiBaseUrl()}/reports/student/generate`, {
    method: "POST",
    credentials: "include"
  });

  const json = (await response.json()) as StudentGenerateReportResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to generate student report.");
  }

  return json;
}

export async function createStudentReportShare(
  payload?: StudentShareCreatePayload
): Promise<StudentShareCreateResponse> {
  const response = await fetch(`${getApiBaseUrl()}/reports/student/latest/share`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const json = (await response.json()) as StudentShareCreateResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to create share link.");
  }

  return json;
}

export async function revokeStudentReportShare(shareId: string): Promise<StudentShareRevokeResponse> {
  const response = await fetch(`${getApiBaseUrl()}/reports/student/shares/${shareId}/revoke`, {
    method: "POST",
    credentials: "include"
  });

  const json = (await response.json()) as StudentShareRevokeResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to revoke share link.");
  }

  return json;
}

export async function getParentSharedReport(shareToken: string): Promise<ParentSharedReportResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/reports/parent/${shareToken}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ParentSharedReportResponse;
  } catch {
    return null;
  }
}

export async function getLatestSchoolReport(
  tenantId: string,
  cookieHeader?: string
): Promise<SchoolLatestReportResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/reports/schools/${tenantId}/latest`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SchoolLatestReportResponse;
  } catch {
    return null;
  }
}

export async function generateSchoolReport(tenantId: string): Promise<SchoolGenerateReportResponse> {
  const response = await fetch(`${getApiBaseUrl()}/reports/schools/${tenantId}/generate`, {
    method: "POST",
    credentials: "include"
  });

  const json = (await response.json()) as SchoolGenerateReportResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to generate school report.");
  }

  return json;
}

export async function generateMcqSet(payload: McqGeneratePayload): Promise<McqSetResponse> {
  const response = await fetch(`${getApiBaseUrl()}/mcq/generate`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as McqSetResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to generate MCQ set.");
  }

  return json;
}

export async function getMcqSet(setId: string, cookieHeader?: string): Promise<McqSetResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mcq/${setId}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as McqSetResponse;
  } catch {
    return null;
  }
}

export async function listMcqSets(cookieHeader?: string): Promise<McqSetsListResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mcq/sets`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader
        ? {
            cookie: cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return { sets: [] };
    }

    return (await response.json()) as McqSetsListResponse;
  } catch {
    return { sets: [] };
  }
}

// ── Experience Programs ─────────────────────────────────────────────

export async function listPrograms(cookieHeader?: string): Promise<ProgramListResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/programs`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { programs: [] };
    }
    return (await response.json()) as ProgramListResponse;
  } catch {
    return { programs: [] };
  }
}

export async function getProgram(slug: string, cookieHeader?: string): Promise<ProgramDetailResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/programs/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { program: null };
    }
    return (await response.json()) as ProgramDetailResponse;
  } catch {
    return { program: null };
  }
}

export async function listEnrollments(cookieHeader?: string): Promise<EnrollmentListResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/enrollments`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { enrollments: [] };
    }
    return (await response.json()) as EnrollmentListResponse;
  } catch {
    return { enrollments: [] };
  }
}

export async function getEnrollment(id: string, cookieHeader?: string): Promise<EnrollmentDetailResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/enrollments/${id}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { enrollment: null };
    }
    return (await response.json()) as EnrollmentDetailResponse;
  } catch {
    return { enrollment: null };
  }
}

export async function getEnrollmentDay(
  id: string,
  dayIndex: number,
  cookieHeader?: string
): Promise<EnrollmentDayResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/enrollments/${id}/days/${dayIndex}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as EnrollmentDayResponse;
  } catch {
    return null;
  }
}

export async function getEnrollmentResult(
  id: string,
  cookieHeader?: string
): Promise<EnrollmentResultResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/enrollments/${id}/result`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { status: "none", result: null };
    }
    return (await response.json()) as EnrollmentResultResponse;
  } catch {
    return { status: "none", result: null };
  }
}

// ── Program authoring (admin) ───────────────────────────────────────

export async function adminListPrograms(cookieHeader?: string): Promise<ProgramAdminListResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/admin/programs`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { programs: [] };
    }
    return (await response.json()) as ProgramAdminListResponse;
  } catch {
    return { programs: [] };
  }
}

export async function adminCreateProgram(input: {
  slug: string;
  title: string;
  summary: string;
}): Promise<{ id: string; slug: string }> {
  const response = await fetch(`${getApiBaseUrl()}/admin/programs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = (await response.json()) as { id: string; slug: string; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to create program.");
  }
  return json;
}

export async function adminGenerateDraft(programId: string, durationDays?: number): Promise<{ queued: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/admin/programs/${programId}/draft`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(durationDays ? { durationDays } : {})
  });
  const json = (await response.json()) as { queued: boolean; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to generate draft.");
  }
  return json;
}

export async function adminPublishVersion(versionId: string): Promise<{ ok: true }> {
  const response = await fetch(`${getApiBaseUrl()}/admin/programs/versions/${versionId}/publish`, {
    method: "POST",
    credentials: "include"
  });
  const json = (await response.json()) as { ok: true; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to publish.");
  }
  return json;
}

export async function enrollInProgram(programSlug: string): Promise<EnrollResponse> {
  const response = await fetch(`${getApiBaseUrl()}/enrollments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ programSlug })
  });
  const json = (await response.json()) as EnrollResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to enroll in program.");
  }
  return json;
}

export async function markBlockProgress(
  enrollmentId: string,
  blockId: string,
  state: "in_progress" | "completed",
  interaction?: Record<string, unknown>
): Promise<BlockProgressResponse> {
  const response = await fetch(`${getApiBaseUrl()}/enrollments/${enrollmentId}/blocks/${blockId}/progress`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, ...(interaction ? { interaction } : {}) })
  });
  const json = (await response.json()) as BlockProgressResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to update progress.");
  }
  return json;
}

/** Step 1: provision a media-evidence upload and get a signed PUT target. */
export async function requestEvidenceUpload(
  enrollmentId: string,
  blockId: string,
  input: { mimeType: string; kind?: EvidenceKind; sizeBytes?: number }
): Promise<EvidenceUploadInitResponse> {
  const response = await fetch(`${getApiBaseUrl()}/enrollments/${enrollmentId}/blocks/${blockId}/evidence`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = (await response.json()) as EvidenceUploadInitResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to start upload.");
  }
  return json;
}

/**
 * Uploads a file directly to the signed target. For the local-dev storage
 * driver the target is an absolute API URL; we route it through the same-origin
 * `/api` proxy so it inherits the configured API origin and avoids CORS. S3
 * presigned URLs (no `/v1/` segment) are uploaded to directly.
 */
export async function uploadToSignedTarget(target: SignedUploadTarget, file: File | Blob): Promise<void> {
  let uploadUrl = target.url;
  if (typeof window !== "undefined") {
    const marker = "/v1/";
    const idx = target.url.indexOf(marker);
    if (idx !== -1) {
      uploadUrl = `/api/${target.url.slice(idx + marker.length)}`;
    }
  }
  const response = await fetch(uploadUrl, {
    method: target.method,
    headers: target.headers,
    body: file
  });
  if (!response.ok) {
    throw new Error("Upload failed.");
  }
}

/** Fetches the durable program-outcome report for a completed enrollment. */
export async function getProgramReport(
  enrollmentId: string,
  cookieHeader?: string
): Promise<ProgramOutcomeReportResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/enrollments/${enrollmentId}/report`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { report: null, fileUrl: null };
    }
    return (await response.json()) as ProgramOutcomeReportResponse;
  } catch {
    return { report: null, fileUrl: null };
  }
}

/** Step 2: finalise the evidence submission and mark the block complete. */
export async function completeEvidence(
  enrollmentId: string,
  blockId: string,
  evidenceId: string
): Promise<BlockProgressResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/enrollments/${enrollmentId}/blocks/${blockId}/evidence/${evidenceId}/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    }
  );
  const json = (await response.json()) as BlockProgressResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to submit evidence.");
  }
  return json;
}

// ── Mentor feature ──────────────────────────────────────────────────

export async function browseMentors(
  params?: { q?: string; page?: number; pageSize?: number },
  cookieHeader?: string
): Promise<MentorBrowseResponse> {
  try {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("pageSize", String(params.pageSize));
    const query = search.toString();
    const response = await fetch(`${getApiBaseUrl()}/mentors${query ? `?${query}` : ""}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { mentors: [], page: 1, pageSize: 12, total: 0 };
    }
    return (await response.json()) as MentorBrowseResponse;
  } catch {
    return { mentors: [], page: 1, pageSize: 12, total: 0 };
  }
}

export async function becomeMentor(payload: BecomeMentorPayload): Promise<{ ok: true; mentorId: string }> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/become`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = (await response.json()) as { ok: true; mentorId: string; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to save mentor profile.");
  }
  return json;
}

export async function requestMentor(mentorProfileId: string, payload: RequestMentorPayload): Promise<{ ok: true }> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/${mentorProfileId}/request`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = (await response.json()) as { ok: true; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to send request.");
  }
  return json;
}

export async function getMyMentors(cookieHeader?: string): Promise<StudentMentorsResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/me`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { mentors: [] };
    }
    return (await response.json()) as StudentMentorsResponse;
  } catch {
    return { mentors: [] };
  }
}

export async function getMentorRequests(cookieHeader?: string): Promise<MentorRequestsResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/requests`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { requests: [] };
    }
    return (await response.json()) as MentorRequestsResponse;
  } catch {
    return { requests: [] };
  }
}

export async function respondToMentorRequest(requestId: string, accept: boolean): Promise<{ ok: true }> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/requests/${requestId}/${accept ? "accept" : "decline"}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const json = (await response.json()) as { ok: true; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to update request.");
  }
  return json;
}

export async function getMentorStudents(cookieHeader?: string): Promise<MentorStudentsResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/students`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { students: [] };
    }
    return (await response.json()) as MentorStudentsResponse;
  } catch {
    return { students: [] };
  }
}

export async function getMentorStudentDetail(
  studentUserId: string,
  cookieHeader?: string
): Promise<MentorStudentDetailResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/students/${studentUserId}`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { student: null };
    }
    return (await response.json()) as MentorStudentDetailResponse;
  } catch {
    return { student: null };
  }
}

export async function getGuidancePlan(studentUserId: string, cookieHeader?: string): Promise<GuidancePlanResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/students/${studentUserId}/plan`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { plan: null };
    }
    return (await response.json()) as GuidancePlanResponse;
  } catch {
    return { plan: null };
  }
}

export async function saveGuidancePlan(
  studentUserId: string,
  payload: GuidancePlanPayload
): Promise<GuidancePlanResponse> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/students/${studentUserId}/plan`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = (await response.json()) as GuidancePlanResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to save guidance plan.");
  }
  return json;
}

export async function updateGuidanceStepStatus(
  planId: string,
  stepId: string,
  status: GuidanceStepStatus
): Promise<GuidancePlanResponse> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/me/plans/${planId}/steps/${stepId}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const json = (await response.json()) as GuidancePlanResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to update step.");
  }
  return json;
}

export async function getMentorMessages(
  requestId: string,
  cookieHeader?: string
): Promise<MentorMessagesResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/mentors/conversations/${requestId}/messages`, {
      cache: "no-store",
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!response.ok) {
      return { messages: [], viewerUserId: "" };
    }
    return (await response.json()) as MentorMessagesResponse;
  } catch {
    return { messages: [], viewerUserId: "" };
  }
}

export async function sendMentorMessage(requestId: string, body: string): Promise<MentorMessagesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/mentors/conversations/${requestId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
  const json = (await response.json()) as MentorMessagesResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || "Unable to send message.");
  }
  return json;
}
