# Experience Program Plan — 7–10 Day Multi-Modal Career Assessment

> **Status:** Plan (approved decisions, pre-execution)
> **Date:** 2026-06-11
> **Supersedes scope of:** the single-session 8-question "proof session" (kept as a quick-check; see §10)
> **Engineering bar:** enterprise-grade — designed for millions of users, high concurrency, and durable multi-day state. No component may be single-instance-only.

## 1. Product decisions (locked)

| Decision | Choice | Architectural consequence |
|---|---|---|
| Content production | **Hybrid: AI draft → human review → publish** | First-class content domain with draft/review/publish lifecycle, versioning, and an admin authoring workspace. |
| "Real-world experience" | **Simulated in-app scenarios + offline tasks with evidence upload** | A scenario (branching decision) runtime **and** an evidence-submission + async-evaluation pipeline (text/audio/video). |
| Media | **Source / license existing media** | Full media **ingestion + transcoding + CDN streaming + 360 player**, plus license tracking. No capture/production pipeline. |
| Mentors ("Human Connection") | **Deferred** | Designed-around but not built in this plan; see §11 Future. |

## 2. What changes, in one paragraph

Today an assessment is one `ProofSession` row: 8 questions in, answers out, scored synchronously. The Experience Program is a **longitudinal state machine**: a versioned, published curriculum of 7–10 days, each day composed of modules and content blocks (text, licensed video/audio/360, branching scenarios, and offline-task prompts). A student **enrolls**, progresses day-by-day over real time, interacts with scenarios, uploads evidence, and is evaluated asynchronously as signals accumulate into a final readiness profile. This requires media infrastructure, a job queue, a content CMS, an enrollment/progression engine, and an engagement loop — none of which exist today.

## 3. Dependency on the audit (why foundations come first)

This vision is gated on the two largest gaps from `implementation-tracker.md`:

- **Object storage + media pipeline** — there is none today (local FS only). Video/audio/360 cannot exist without it.
- **Real job queue / worker** — today a no-op scaffold. Multi-day scheduling, transcoding, async evaluation, and daily reminders all require it.

Building these as **Phase A foundations** also closes those audit blockers for the *existing* features (it lets us move the current synchronous AI and report work onto the queue too). The infra is reusable, not throwaway.

---

## 4. Target architecture (additions)

```
apps/web      → student program runtime, admin authoring workspace, 360/video player
apps/api      → program, content, enrollment, evidence, evaluation, media, notification modules
apps/worker    → REAL BullMQ worker (queues: transcoding, evaluation, scheduling, notifications, ai-draft)
Redis         → queue backend + distributed rate limit + session/cache (today: provisioned, unused)
Object storage → S3/GCS: media assets, renditions, evidence uploads, report exports (signed URLs)
CDN           → adaptive streaming (HLS) for video/360, audio, captions
Email provider → daily reminders + lifecycle notifications (SES/SendGrid behind an adapter)
```

Reliability pattern: a **transactional outbox** for enqueueing jobs (write the job intent in the same DB transaction as the state change; a relay publishes to Redis) so no job is lost if enqueue fails after commit.

---

## 5. Data model (new Prisma models)

Spine (normalized where it aids analytics/integrity; versioned JSON where it aids velocity):

**Content (authoring side)**
- `ExperienceProgram` — `id, careerId, slug, title, summary, status(draft|in_review|published|archived), currentPublishedVersionId, createdBy, timestamps`
- `ProgramVersion` — `id, programId, version, state, durationDays(7–10), generationSource(ai|human|hybrid), promptVersion, generatedByJobId, reviewedBy, publishedAt, changelog` (published versions are **immutable**)
- `ProgramDay` — `id, programVersionId, dayIndex, title, objective, estimatedMinutes`
- `Module` — `id, programDayId, order, type(lesson|scenario|task|reflection), title`
- `ContentBlock` — `id, moduleId, order, kind(text|video|audio|panorama360|scenario|task_prompt), bodyJson, mediaAssetId?`
- `Scenario` — `id, contentBlockId, graphJson` (branching nodes/options + score signals; validated against a JSON schema in v1, normalize later if analytics demand)
- `Rubric` — `id, programVersionId, dimensionsJson, scaleJson`
- `MediaAsset` — `id, tenantId?, kind, storageKey, mimeType, bytes, durationSec, status(uploaded|transcoding|ready|failed), renditionsJson, captionsKey, licenseJson(source,type,expiresAt,attribution), createdBy`

**Runtime (student side)**
- `Enrollment` — `id, userId, tenantId, programId, programVersionId(pinned at enroll for reproducibility), status(active|completed|paused|expired|abandoned), startedAt, scheduleJson, currentDayIndex, dueAt, completedAt`
- `DayProgress` — `id, enrollmentId, dayIndex, status(locked|available|in_progress|completed), unlocksAt, startedAt, completedAt` — `@@index([enrollmentId, dayIndex])`
- `BlockProgress` — `id, enrollmentId, contentBlockId, status, interactionJson(scenario choices, etc.), updatedAt`
- `EvidenceSubmission` — `id, enrollmentId, dayIndex, contentBlockId, kind(text|audio|video), mediaAssetId?, textBody?, status(submitted|evaluating|scored|failed), createdAt`
- `EvaluationResult` — `id, enrollmentId, scope(block|day|final), rubricVersion, scoringSource, promptVersion, scoresJson, narrative, points, readinessBand, jobId, createdAt` (versioned + reproducible — fixes the audit's prompt-versioning gap)

**Cross-cutting**
- `Notification` — `id, userId, type, channel(email|in_app), payloadJson, status, sentAt, readAt`
- `OutboxEvent` — `id, aggregateType, aggregateId, type, payloadJson, status, createdAt, publishedAt` (reliable enqueue)

All student-side tables carry `tenantId` and are indexed for tenant-scoped reads.

---

## 6. Phased delivery

Each phase ends with: code merged, contracts documented, **automated tests** (the audit's missing gate), observability, and acceptance criteria met.

### Phase A — Platform foundations (prerequisites)
**A1. Object storage adapter** — S3/GCS abstraction (`StorageService`): put/get, multipart/resumable upload, short-TTL signed URLs, lifecycle/expiry. Migrate report exports off local FS.
**A2. Real worker + queue** — BullMQ on Redis; queues `transcoding | evaluation | scheduling | notifications | ai-draft`; retries w/ backoff, DLQ, idempotency keys, concurrency caps. Transactional outbox + relay. Move existing synchronous AI/report work onto it.
**A3. Distributed rate limiting + observability** — Redis-backed limiter (replaces in-memory `Map`); structured JSON logging everywhere; error tracking (Sentry-class); metrics persisted/scrapeable.
**A4. Notification service skeleton** — email adapter + `Notification` model + in-app feed; throttling + quiet-hours scaffolding.
**Acceptance:** worker processes a real job end-to-end; a file round-trips through object storage via signed URL; rate limiting holds across 2+ API instances; an email + in-app notification can be sent.

### Phase B — Program domain & contracts
Prisma models from §5 (content + runtime) + migrations. Read APIs for program catalog/detail (empty content initially). Shared `@career-pilot/types` contracts.
**Acceptance:** schema migrated; program/detail endpoints serve stable contracts; tenant scoping enforced; no business logic in pages.

### Phase C — Content pipeline (Hybrid CMS)
**C1. AI draft generator** — worker job: LLM generates a structured 7–10 day `ProgramVersion` in `draft`, prompt-versioned, validated against the program JSON schema; deterministic fallback skeleton on AI failure.
**C2. Admin authoring workspace** — review/edit/approve flow: `draft → in_review → published`; published versions immutable; changelog; role-gated to admins.
**C3. Media ingestion** — admin uploads licensed video/audio/360 → object storage → `transcoding` job (HLS renditions + thumbnails; captions/transcript attach) → `ready`; license metadata + expiry tracked; AV scan + type/size limits.
**Acceptance:** for a chosen career, a program can be AI-drafted, edited, have media attached, and be published as an immutable version; media streams via signed CDN URL.

### Phase D — Enrollment & progression engine
**D1. Enrollment lifecycle** — enroll (pins program version), build `scheduleJson` (day unlock dates across 7–10 days; supports compressed/demo mode), resume, pause, expire.
**D2. Daily delivery + progress** — day unlock logic, per-block progress, **idempotent** state transitions; "today" view.
**D3. Scenario runtime** — branching decision player; captures choices into `BlockProgress.interactionJson`.
**D4. Scheduling jobs** — daily `scheduling` job unlocks days and enqueues reminder `notifications` (idempotent — must never double-fire to millions).
**Acceptance:** a student enrolls, progresses day-by-day over real (or compressed) time, resumes mid-day, completes scenarios, and receives daily reminders.

### Phase E — Evidence submission & async evaluation
**E1. Evidence upload** — text/audio/video → object storage (multipart for large media) → `EvidenceSubmission`.
**E2. Async evaluation** — `evaluation` jobs score scenario choices + uploaded evidence against the `Rubric` (AI + deterministic rules), per-block/per-day; retryable, idempotent, deterministic fallback; per-user AI token/cost budget.
**E3. Final synthesis** — aggregate multi-day signals into a versioned, reproducible readiness profile (`EvaluationResult` scope=`final`).
**Acceptance:** evidence flows through the queue, is scored, survives worker crash/retry; final result persisted with rubric+prompt versions; no AI call runs in the request path.

### Phase F — Reporting & surfacing
Program-outcome report (extends existing `Report` domain) exported to object storage; student/school/parent views of progress + outcome; parent share reused.
**Acceptance:** outcomes visible to student, school, and parent (via existing share tokens); report export durable in object storage.

### Phase G — Hardening & scale validation
Load tests (concurrent enrollments, queue throughput, media streaming); SLOs (p95 latency, evaluation turnaround, reminder delivery); runbooks; security review (signed-URL abuse, upload abuse, enrolled-only media access, tenant isolation, content access control); cost controls (storage lifecycle, CDN, AI budgets).
**Acceptance:** meets defined SLOs under load; security review passed; cost guardrails in place.

---

## 7. API surface (representative, all under `/v1`)

- Content/admin: `POST /programs`, `POST /programs/:id/versions/ai-draft`, `GET/PUT /program-versions/:id`, `POST /program-versions/:id/submit-review`, `POST /program-versions/:id/publish`, `POST /media` (init upload), `POST /media/:id/complete`, `GET /media/:id`
- Enrollment/runtime: `POST /programs/:id/enroll`, `GET /enrollments/:id`, `GET /enrollments/:id/today`, `POST /enrollments/:id/blocks/:blockId/progress`, `POST /enrollments/:id/scenario/:blockId/choice`
- Evidence/eval: `POST /enrollments/:id/evidence` (→ signed upload), `GET /enrollments/:id/evaluation`, `GET /enrollments/:id/result`
- Reporting: `POST /reports/program/:enrollmentId/generate`, `GET /reports/program/:enrollmentId`

---

## 8. Enterprise scale & security (cross-cutting, mandatory)

- **Media:** HLS adaptive bitrate; CDN with short-TTL signed URLs/cookies; equirectangular 360 player; **only enrolled, tenant-matched students** can stream.
- **Uploads:** resumable/multipart, strict type/size limits, AV scan, per-user quotas.
- **Queue:** separate queues, concurrency caps, exponential backoff, DLQ, idempotency keys; backpressure over synchronous calls.
- **Progress writes at scale:** high write volume → indexed by `(enrollmentId, dayIndex)`; avoid hot rows; consider tenant/time partitioning before peak.
- **AI:** prompt versioning on every generated artifact (reproducibility); per-user/per-tenant token + cost budgets; circuit breaker; deterministic fallbacks.
- **Notifications:** idempotent daily jobs, throttling, quiet hours, batching — never double-send.
- **Security/tenancy:** every enrollment/media/evidence query enforces `tenantId` from session; signed URLs scoped + short-lived; admin authoring role-gated.
- **Licensing/legal:** `MediaAsset.licenseJson` tracks source/type/expiry/attribution; expiry sweep job; takedown path.
- **Accessibility:** captions/transcripts required for video/audio; keyboard-navigable scenario runtime.

---

## 9. Testing & quality (closes the audit gap)

Per phase: unit tests (scoring, scheduling, state transitions), integration tests (queue jobs, upload→transcode→ready, enroll→progress→evaluate), E2E (full multi-day journey in compressed-time mode). Wire **real ESLint** into CI; add coverage gate. No phase merges without its tests.

## 10. Coexistence with the current proof session

Keep the 8-question proof session as a **fast "quick-check"** (low-commitment entry point). Position the Experience Program as the **deep assessment**. The proof result can seed the program's day-0 baseline. Both write into the same reporting/readiness vocabulary so school/parent views stay coherent. No destructive migration; the proof tables are untouched.

## 11. Deferred / future (designed-around, not built now)

Mentor marketplace + live sessions ("Human Connection"); real media production pipeline; 3D/photoreal beyond 360; cross-program longitudinal analytics. The schema leaves room (e.g., a future `MentorSession` relating to `Enrollment`) without rework.

## 12. Critical path & sequencing

`A (foundations) → B (domain) → C (content) → D (enrollment) → E (evidence/eval) → F (reporting) → G (hardening)`.
A is the unblocker and must come first. C and D can partly parallelize once B lands (content authoring vs. enrollment engine are separable). E depends on D + A2. F depends on E. G runs continuously but gates cutover.

## 13. Top risks

1. **Content cost/throughput** — 199 careers × hybrid review is real human effort; mitigate with strong AI drafts + reusable scenario templates + prioritizing top careers first.
2. **Media cost & licensing** — storage/CDN/egress and license expiry; mitigate with lifecycle policies, license sweeps, and lazy transcoding.
3. **Multi-day engagement/drop-off** — students abandon long programs; mitigate with reminders, streaks, compressed-time option, and partial-credit scoring.
4. **Scale of progress writes + evaluation fan-out** — mitigate with queue backpressure, indexing/partitioning, and idempotent jobs.
5. **Scope creep toward mentors/3D** — explicitly deferred (§11).
