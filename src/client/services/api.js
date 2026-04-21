async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(payload?.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  getAppConfig() {
    return request("/api/app-config");
  },
  getSession() {
    return request("/api/auth/session");
  },
  register(payload) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return request("/api/auth/logout", {
      method: "POST"
    });
  },
  getDashboard() {
    return request("/api/dashboard");
  },
  getProfile() {
    return request("/api/profile");
  },
  generateProfileQuestionSet(payload) {
    return request("/api/profile/question-set", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  submitProfile(payload) {
    return request("/api/profile/submit", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getRecommendations() {
    return request("/api/recommendations");
  },
  getCareers(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.search) {
      searchParams.set("search", params.search);
    }

    if (params.category) {
      searchParams.set("category", params.category);
    }

    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    return request(`/api/careers${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
  },
  getCareer(careerId) {
    return request(`/api/careers/${careerId}`);
  },
  startProofSession(careerId) {
    return request(`/api/careers/${careerId}/proof-session`, {
      method: "POST"
    });
  },
  submitProofSession(sessionId, answers) {
    return request(`/api/proof-sessions/${sessionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
  },
  getProofSessions() {
    return request("/api/proof-sessions");
  },
  getSchoolOverview() {
    return request("/api/schools/overview");
  },
  createSchoolStudent(payload) {
    return request("/api/schools/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getSchoolStudent(studentId) {
    return request(`/api/schools/students/${studentId}`);
  }
};
