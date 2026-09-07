# Experience Program — Hardening & Scale (Phases C-debt + G)

> **Status:** living doc. Tracks what is **implemented in code** vs. what is an
> **infrastructure/ops** task that cannot be "done" in a commit alone.
> Engineering bar: enterprise-grade — designed for high concurrency and durable
> multi-day state.

## Implemented in code (this stream of work)

| Area | What landed | File(s) |
|---|---|---|
| **E2 — Evidence/scenario scoring** | Readiness eval replays scenario decisions into per-dimension signal ratios and folds in submitted evidence; AI prompt + deterministic fallback both signal-aware; prompt versioned `eval-prompt-v2` | `enrollment/evaluation.service.ts` |
| **Upload quotas/limits** | Per-kind MIME allowlist + size ceilings (video 200MB / audio 50MB / image 25MB), rolling-24h per-user quota (50), in-memory cap on the local upload route | `enrollment/enrollment.service.ts`, `storage/storage.controller.ts` |
| **AV-scan seam** | `AntivirusService` invoked before evidence is marked ready; **fails closed** when `AV_SCAN_ENABLED=true` but no scanner is wired | `storage/antivirus.service.ts` |
| **Transcoder seam** | Pluggable `Transcoder` (default `PassthroughTranscoder`); worker delegates; marks `failed` + rethrows for retry | `media/transcoder.ts`, `media/media.service.ts` |
| **F — Program-outcome report** | `GET /enrollments/:id/report` assembles the outcome and exports durable JSON to object storage with a signed URL; student download button | `enrollment/enrollment.service.ts`, web `ProgramReportButton.tsx` |
| **AI circuit breaker + cost guard** | Per-provider breaker (open after N failures, cooldown) + max-prompt-chars guard; callers fall back deterministically | `ai/llm.service.ts` |
| **Self-heal eval/report** | Read-path reconcile so a downed worker never strands a poll | `enrollment/enrollment.service.ts`, `reports/reports.service.ts` |

## Infrastructure / ops tasks (cannot be a code-only "done")

### Real transcoding (HLS adaptive bitrate)
The seam exists (`Transcoder`, selected by `MEDIA_TRANSCODER`). A production driver
runs **ffmpeg** (sidecar/Lambda) or **AWS MediaConvert / Mux**: generate HLS
renditions + thumbnails, attach captions, write `renditionsJson`, then mark
`ready`. Wire it as a new `Transcoder` impl and register in `media.module.ts` — no
caller changes. Until then `passthrough` serves the original (fine for images and
web-playable clips; **not** adaptive-bitrate).

### Multipart / resumable upload
Current signed **single-part PUT** covers the evidence size envelope (S3 single PUT
≤ 5GB; our ceilings are ≤ 200MB), so it is adequate today and we deliberately did
**not** add unused multipart machinery. When >5GB or resumability is needed, add to
`StorageDriver`: `createMultipartUpload(key) → uploadId`, `signPart(key, uploadId,
partNo)`, `completeMultipart(key, uploadId, parts[])`, `abortMultipart`. S3 supports
these natively; the browser uploads parts in parallel with retry. Enforce
`content-length-range` via a presigned POST policy for true server-side size caps.

### Cost controls
- **AI:** prompt-size guard + circuit breaker are in code. **Per-user/per-tenant
  token budgets** need a shared counter (Redis `INCR` with daily TTL, or a usage
  table) checked at each call site — in-memory won't hold across replicas.
- **Storage/CDN:** lifecycle rules (expire `evidence/` and `reports/` exports,
  transition cold media to IA/Glacier), short-TTL signed URLs (already 900s),
  CDN egress caps + alerts. These are bucket/CDN config, not code.

### SLOs (enforced as k6 thresholds in `apps/api/test/load/programs.k6.js`)
| Indicator | Target |
|---|---|
| Read-path p95 latency (`/enrollments/*`) | < 400 ms |
| Error rate | < 1% |
| Evaluation turnaround (complete → result ready) | < 30 s p95 |
| Reminder/scheduling job delivery | within the scheduled minute, never double-fire |

### Load testing
`k6 run apps/api/test/load/programs.k6.js` ramps to 200 VUs against the read paths
and asserts the SLO thresholds. **Meaningful results require a staged environment**
(real Postgres/Redis sizing, multiple API replicas) — running it against a single
dev process measures the laptop, not the system.

### Security review checklist (program surface)
- [ ] Signed-URL scope + TTL (no key reuse across users; evidence keys namespaced by enrollment)
- [ ] Enrolled+tenant-matched access enforced on every media/evidence read
- [ ] Upload abuse: type/size/quota (done) + AV scan (seam) + content sniffing
- [ ] IDOR on `/enrollments/:id/*` (ownership checked via `loadOwnedEnrollment`)
- [ ] Evidence cannot be submitted to another student's enrollment/block (checked)
- [ ] Rate limiting is Redis-backed across replicas (tracker item — still in-memory)
