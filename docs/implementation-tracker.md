# Career Pilot Implementation Tracker

> **Audit date:** 2026-06-11
> **Method:** Per-phase code audit against the acceptance criteria in `rebuild-roadmap.md`.
> Status reflects what is **verifiable in code**, not what was previously claimed.
> Prior versions of this file marked everything `[x]`; that was inaccurate and has been corrected below.

## Status legend

- `[x]` **MET** — implemented and verifiable in code.
- `[~]` **PARTIAL** — implemented for the happy path but missing a stated acceptance criterion (tests, async, scale, security).
- `[ ]` **MISSING** — not implemented.

---

## Stack snapshot

- Monorepo: `apps/web` (Next.js 13.5), `apps/api` (NestJS 10 + Prisma 5 + Postgres), `apps/worker` (scaffold only), `packages/*`.
- Both `apps/web` and `apps/api` **typecheck clean** as of the audit.
- AI: provider abstraction with Groq (primary) → Gemini (fallback) → deterministic hardcoded fallback (`apps/api/src/ai/llm.service.ts`).
- ~199 careers seeded (`apps/api/prisma/seed-careers.ts`).
- 9 Prisma migrations applied (Phases 1–7 + MCQ + cache fields).

---

## Roadmap phase status

### Phase 0 — Platform foundation — MET
- [x] pnpm + Turborepo monorepo, `apps/*`, `packages/*`
- [x] docker-compose for Postgres + Redis
- [x] `.env.example` strategy
- [x] CI workflow (`.github/workflows/ci.yml`)
- [~] CI quality gates are weak: **lint is a no-op placeholder**, **test = single smoke run**. Typecheck is real.

### Phase 1 — Identity, tenants, auth — MET (with scale/security caveats)
- [x] register / login / refresh / logout (`auth.service.ts`) — scrypt hashing, opaque tokens, refresh-token rotation, hashes only persisted
- [x] tenants + relational `TenantMembership`
- [x] sessions + password-reset tables
- [x] role enforcement (school_admin vs student) on backend and frontend
- [x] audit log writes on register/login/password-reset
- [x] httpOnly + SameSite=Lax cookies; conditional Secure in prod; origin enforcement on mutating requests
- [ ] **E2E tests for login/registration** — covered only by the shared smoke script, no dedicated E2E
- [ ] **CSRF token protection** — only origin checks + SameSite=Lax (no token/double-submit)
- Scale caveats: `scryptSync` blocks the event loop on every login/register; no session caching (every authed request hits Postgres); no account lockout (per-IP limit only).

### Phase 2 — Student profile — MET (validation + tests partial)
- [x] create/update/get/submit profile (`profile.service.ts`)
- [x] `ProfileVersion` written transactionally on every update and on submit
- [x] tenant-aware scoping
- [~] validation: server DTOs via class-validator + global ValidationPipe; **client-side validation is minimal/manual** (no shared schema)
- [ ] component/integration tests for profile flows (smoke only)

### Phase 3 — Career catalog & search — MET (text search unindexed)
- [x] catalog persisted in Postgres; `CareerCategory` / `Career` / `CareerDetail`
- [x] ~199 careers seeded (≥150 requirement met)
- [x] detail includes how-to-become, challenges, positives, negatives, salary progression, crisis/resilience view
- [x] list endpoint paginated (page/pageSize, capped) with `@@index([categoryId, status])`
- [~] **case-insensitive text search has no supporting index** (full scan; fine at 199 rows, degrades as catalog grows)
- [ ] E2E tests for search/detail navigation

### Phase 4 — Assessment engine (incl. MCQ) — PARTIAL (key acceptance criterion unmet)
- [x] proof + profile assessment flows persist questions, answers, results
- [x] deterministic numeric scoring (fixed score scale) + AI narrative with deterministic fallback
- [x] AI retry/backoff per provider + Groq→Gemini fallback chain
- [x] MCQ generation with cache key + persisted sets
- [~] versioning partial: `questionSetVersion` hardcoded `proof-v1`, `scoringSource` tracked — **no prompt versioning**, so AI-generated content is not reproducible across prompt changes
- [ ] **"Assessment flow survives worker failure and retry" — NOT MET.** All AI calls run synchronously in the HTTP request path; there is no queue and no worker to retry against
- [ ] tests for scoring/submission (smoke touches the path; no unit coverage of scoring logic)
- Scale caveats: no per-user AI token/cost quota; no circuit breaker; synchronous LLM calls tie up request threads.

### Phase 5 — Recommendations — MET
- [x] `RecommendationSnapshot` derived from persisted profile/assessment
- [x] version metadata (`engineVersion`, `profileVersionCount`)
- [x] recompute path audited/observable
- Note: `inputSummary` truncated to 12 items (minor reproducibility loss).

### Phase 6 — School admin workspace — MET (tests missing)
- [x] tenant-boundary enforcement on school-scoped queries (`requireSchoolAdmin`, tenantId in where-clauses) — no obvious IDOR
- [x] roster + report pagination (capped pageSize)
- [x] audit logs on student creation and report generation
- [ ] E2E tests for school workflows
- Scale caveat: roster/detail queries pull nested relations; add `(tenantId, createdAt)` indexes on child tables before high volume.

### Phase 7 — Reports & parent sharing — PARTIAL (async + storage unmet)
- [x] `Report` + `ReportShare`; report payload persisted in Postgres
- [x] share tokens: 192-bit entropy, SHA256-hashed, 1–30 day expiry, revocable; access checks expiry + revocation
- [ ] **"Report generation is async and observable" — NOT MET.** Generation runs synchronously in the request handler (status flips queued→ready inline); will time out for large school reports
- [ ] **Object storage adapter — NOT MET.** File export only writes to local `.generated-reports/` in development (`NODE_ENV` gated); no S3/GCS, no signed URLs in production

### Phase 8 — Production hardening — LARGELY MISSING
- [~] rate limiting exists but is **in-memory `Map`, single-instance only** — does not coordinate across replicas
- [~] structured logging only for HTTP request lines (`request-context.middleware.ts`); errors elsewhere use console/Nest Logger
- [~] metrics: Prometheus-text endpoint exists but counters are **in-memory** (lost on restart, not aggregated across instances); no dashboards/alerts
- [ ] CSRF protection (token-based)
- [ ] external secret manager (dev uses local `.env`; not committed, but no vault integration)
- [ ] error tracking (no Sentry/Rollbar)
- [ ] backup/restore procedure
- [ ] runbooks
- [ ] SLO/SLI definitions
- [ ] load testing
- [ ] security review

### Phase 9 — Cutover & prototype retirement — NOT STARTED
- [ ] staging deployed from monorepo, signoff completed
- [ ] production rollout executed
- [ ] rollback tested
- [ ] prototype frozen/decommissioned
- (Plan docs exist: `production-cutover-checklist.md`, `staging-signoff.md`, `rollback-plan.md`, `prototype-decommission-plan.md`.)

---

## Original product requirements (corrected status)

1. **Registration / login / tenant / individual access** — [x] MET
2. **AI-driven profile creation** — [x] functionally MET; [~] AI runs synchronously, prompts unversioned
3. **Dashboard career recommendations** — [x] MET
4. **150+ careers with deep detail** — [x] MET (~199 careers, full detail sections)
5. **AI-based career proofing (8 Qs, mental/behavioral readiness)** — [x] functionally MET; [~] synchronous, no queue/retry-after-failure
6. **Points, parent proof, school support** — [x] MET
7. **Build & verification** — [~] typecheck + one smoke suite pass; no unit/web/E2E tests; lint not enforced

---

## Cross-cutting gaps

- **Tests:** one integration smoke suite (`apps/api/test/smoke.ts`, ~570 lines, @nestjs/testing + supertest). No unit tests, no web tests, no Playwright/E2E, no coverage gates. Web `test` and worker `test` are echo placeholders.
- **Lint:** all `lint` scripts are `console.log` placeholders; `packages/eslint-config` is effectively empty; CI "lint" step is a no-op.
- **Worker:** `apps/worker/src/main.js` is a 4-line scaffold that only prints a startup message. Nothing enqueues to it; nothing consumes from it.
- **Redis:** provisioned in docker-compose but **not used by any code** (sessions, rate limiting, and cache all bypass it).
- **DB:** Prisma connection pool unconfigured (defaults); good index coverage on most tables; text search and some child tables lack indexes.

---

## Production blockers for scale (enterprise-grade gate)

Ordered by how hard they block horizontal scaling to high concurrency:

1. **No async job queue / worker is a no-op.** AI generation, scoring, and report generation all run inline in API request threads → no backpressure, lost work on provider outage, request timeouts. *(Biggest architectural gap.)*
2. **In-memory rate limiting.** Breaks the moment more than one API instance runs; bypassable across replicas. Needs Redis-backed limiter.
3. **Reports/exports not in object storage.** Local-filesystem (dev-only) export is not durable or multi-instance safe. Needs S3/GCS + signed URLs.
4. **In-memory metrics + no error tracking + console-level error logging.** No cross-instance observability; incidents invisible in production. Needs persistent metrics + Sentry-class error tracking + structured logs.
5. **Synchronous CPU-bound password hashing** (`scryptSync`) blocks the event loop under load; no session caching multiplies DB load.
6. **Test + lint enforcement.** One smoke suite and no real lint gate is insufficient to protect Phases 1–7 against regression as hardening lands.

> Items 1–3 are explicitly listed as "risks accepted before cutover" in `staging-signoff.md`. They must be closed for the enterprise-scale target, not merely accepted.

---

## Corrections applied to prior tracker claims

- "Tests done" — corrected: only a single integration smoke suite exists; no unit/web/E2E.
- "Smoke-test main flows [x]" — accurate, but was being read as full test coverage.
- Assumption that secrets were committed (raised during audit) — **false**: `.env` is gitignored and untracked. Local dev keys should still be rotated and moved to a secret manager for production.
