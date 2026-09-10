// k6 load test for the Experience Program read paths.
//
//   Run:   API_BASE=http://localhost:4000/v1 \
//          LOAD_EMAIL=student@example.com LOAD_PASSWORD=... \
//          k6 run apps/api/test/load/programs.k6.js
//
// Execution requires a deployed/staged environment and the k6 binary; this
// script + the thresholds below encode the SLOs from experience-program-hardening.md.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.API_BASE || "http://localhost:4000/v1";
const EMAIL = __ENV.LOAD_EMAIL || "student@example.com";
const PASSWORD = __ENV.LOAD_PASSWORD || "password";

export const options = {
  scenarios: {
    steady: { executor: "ramping-vus", startVUs: 0, stages: [
      { duration: "1m", target: 50 },
      { duration: "3m", target: 200 },
      { duration: "1m", target: 0 }
    ] }
  },
  // SLOs — see experience-program-hardening.md §SLOs.
  thresholds: {
    http_req_failed: ["rate<0.01"],            // <1% errors
    "http_req_duration{group:::read}": ["p(95)<400"] // p95 read latency < 400ms
  }
};

function login() {
  const res = http.post(`${BASE}/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" }
  });
  check(res, { "login ok": (r) => r.status === 200 });
  return res.cookies; // session cookie reused for subsequent requests
}

export default function () {
  const jar = http.cookieJar();
  login();
  const params = { tags: { group: "read" } };

  const enrollments = http.get(`${BASE}/enrollments`, params);
  check(enrollments, { "enrollments 200": (r) => r.status === 200 });

  const list = JSON.parse(enrollments.body || "{}").enrollments || [];
  if (list.length > 0) {
    const id = list[0].id;
    http.get(`${BASE}/enrollments/${id}`, params);
    http.get(`${BASE}/enrollments/${id}/days/1`, params);
    http.get(`${BASE}/enrollments/${id}/result`, params); // the hot poll path
  }
  void jar;
  sleep(1);
}
