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
  SubmitProfileAssessmentResponse
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
