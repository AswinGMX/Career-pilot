# Career Pilot Backend API and Database Schema

## Purpose

This document defines the production backend architecture, domain modules, API contracts, and relational schema for Career Pilot.

It is the source of truth for backend implementation.

## Backend Technology Recommendation

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- OpenAPI
- Jest for unit and integration tests

## Backend Module Map

### `auth`

- registration
- login
- refresh
- logout
- password reset
- session revocation

### `tenants`

- school tenant creation
- tenant settings
- membership lookup

### `users`

- user profile
- role assignment
- account status

### `student-profiles`

- profile basics
- preferences
- profile completion status
- version history

### `assessments`

- question set templates
- generated question sets
- answer submissions
- scoring results

### `careers`

- career catalog
- categories
- search
- fit explanations

### `recommendations`

- recommendation generation
- recommendation snapshots

### `reports`

- student report
- parent summary
- school report
- exports

### `admin`

- platform administration
- audit logs
- support actions

## API Conventions

Base path:

- `/v1`

Response envelope for success:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Response envelope for failure:

```json
{
  "data": null,
  "meta": {
    "requestId": "req_123"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload is invalid",
    "details": []
  }
}
```

Rules:

- all write routes validate with DTOs and Zod or class-validator
- all list routes support pagination
- all IDs are UUIDs
- all timestamps are ISO UTC
- all breaking changes require a new API version

## Authentication Model

Recommended browser auth:

- access token in secure HttpOnly cookie
- refresh token in secure HttpOnly cookie
- CSRF token for mutations

Core endpoints:

### `POST /v1/auth/register`

Creates an individual student account or accepts an invitation flow.

### `POST /v1/auth/login`

Authenticates a user with `email` and `password`. A login for an unknown email
verifies a dummy password hash before failing, so response timing does not
reveal whether an account exists.

### `POST /v1/auth/refresh`

Rotates access and refresh tokens.

### `POST /v1/auth/logout`

Revokes current session.

### `POST /v1/auth/forgot-password`

Creates password reset request.

### `POST /v1/auth/reset-password`

Consumes reset token and updates password.

### `GET /v1/auth/me`

Returns current session context:

- user
- role
- tenant membership
- permissions

## Account Settings

Self-service management of the caller's own account. Every route acts on the
session holder and takes no user id, so one account cannot address another.

Credential changes (email, password) are **not exposed** — no route here alters
a way of signing in. Reintroducing them means re-adding the schema alongside the
endpoints; nothing dormant is left behind for them.

### `GET /v1/account`

Returns the caller's profile: names, phone, timezone, locale, a signed avatar
URL, linked OAuth providers, and whether a password is set.

### `GET /v1/account/options`

Timezone and locale suggestions for the pickers. Suggestions only — timezone
validation accepts any zone the runtime's ICU data knows, including aliases such
as `Asia/Kolkata`, which `Intl.supportedValuesOf` omits.

### `PATCH /v1/account`

Partial update of `firstName`, `lastName`, `phone`, `timezone`, `locale`. An
omitted key is unchanged; `null` clears it. `fullName` is recomputed from the
name parts so existing readers of it stay correct. Phone is normalised to E.164.

### `POST /v1/account/avatar` → signed `PUT` → `POST /v1/account/avatar/:mediaId/complete`

Three-step upload straight to object storage, mirroring the evidence pipeline.
PNG/JPEG/WebP only (SVG is refused: it is a scriptable document served from an
app origin), 5MB ceiling, antivirus scan, then magic-byte identification of the
stored bytes before the image is adopted. `DELETE /v1/account/avatar` removes it.

## Tenant and Membership Model

### `POST /v1/tenants`

Create school tenant.

### `GET /v1/tenants/:tenantId`

Get tenant details.

### `PATCH /v1/tenants/:tenantId`

Update tenant settings.

### `POST /v1/tenants/:tenantId/invitations`

Invite users to tenant.

### `GET /v1/tenants/:tenantId/members`

List tenant members.

## Student Profile Domain

### `GET /v1/student-profile`

Get current student profile.

### `PUT /v1/student-profile`

Create or update profile basics.

Suggested payload:

```json
{
  "gradeLevel": "11",
  "ageBand": "16-17",
  "favoriteSubjects": ["Mathematics", "Physics"],
  "favoriteActivities": ["Coding", "Maker projects"],
  "topicsCuriousAbout": ["AI", "Cybersecurity"],
  "personalStrengths": ["Focus", "Pattern recognition"],
  "avoidsOrDislikes": ["Unclear communication"]
}
```

### `POST /v1/student-profile/submit`

Marks the profile ready for assessment generation.

## Assessment Domain

Assessment is versioned. Never overwrite scoring rules invisibly.

### `POST /v1/assessments/profile-question-sets`

Generates a question set for profile analysis.

### `POST /v1/assessments/profile-question-sets/:id/answers`

Submits profile assessment answers.

### `GET /v1/assessments/profile-results/latest`

Gets latest computed profile result.

### `POST /v1/assessments/proof-sessions`

Starts a proof session for a career.

Payload:

```json
{
  "careerId": "uuid"
}
```

### `POST /v1/assessments/proof-sessions/:id/answers`

Submits proof answers.

### `GET /v1/assessments/proof-sessions`

Lists student proof sessions.

### `GET /v1/assessments/proof-sessions/:id`

Gets one proof session and result.

## Career Domain

The career catalog should be managed data, not generated in code at runtime.

### `GET /v1/careers`

Supports:

- `q`
- `category`
- `page`
- `pageSize`
- `sort`

### `GET /v1/careers/:id`

Returns:

- summary
- education path
- skills
- demand outlook
- salary metadata
- positives
- challenges
- drawbacks
- related careers

### `GET /v1/career-categories`

Returns curated categories and counts.

## Recommendation Domain

Recommendations should be snapshot-based.

### `POST /v1/recommendations/recompute`

Queues a recomputation for the current student.

### `GET /v1/recommendations/latest`

Returns latest recommendation snapshot.

Each item should include:

- career reference
- fit score
- explanation
- evidence inputs
- model or rules version

## Reporting Domain

### `GET /v1/reports/student/latest`

Get latest student report.

### `POST /v1/reports/student/generate`

Queue student report generation.

### `GET /v1/reports/parent/:shareToken`

Read-only parent view.

### `GET /v1/reports/schools/:tenantId/students`

School-level student reporting list.

### `GET /v1/reports/schools/:tenantId/students/:studentId`

School-level detailed student report.

## Internal Admin Domain

### `GET /v1/admin/users`

Platform admin only.

### `GET /v1/admin/tenants`

Platform admin only.

### `GET /v1/admin/audit-logs`

Platform admin only.

## Async Jobs

Use BullMQ queues:

- `assessment-generation`
- `assessment-scoring`
- `recommendation-recompute`
- `report-generation`
- `email`

Store for each job:

- status
- attempts
- last error
- started at
- completed at
- correlation ID

## Database Design Principles

- PostgreSQL only
- soft delete only where justified
- append-only audit logs
- explicit foreign keys
- normalized core entities
- denormalized snapshots for reports and AI outputs where appropriate

## Core Tables

### `tenants`

| column | type | notes |
|---|---|---|
| id | uuid pk | tenant id |
| name | text | school or org name |
| slug | text unique | public-safe slug |
| type | text | `school` initially |
| status | text | `active`, `suspended` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `users`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| email | citext unique | case-insensitive |
| password_hash | text | |
| full_name | text | |
| account_type | text | `individual`, `tenant_member` |
| status | text | `active`, `invited`, `disabled` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `tenant_memberships`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| tenant_id | uuid fk | |
| user_id | uuid fk | |
| role | text | `school_admin`, `student`, `parent_viewer` |
| status | text | `active`, `revoked` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint:

- `(tenant_id, user_id)`

### `sessions`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| refresh_token_hash | text | |
| user_agent | text | |
| ip_address | inet | |
| expires_at | timestamptz | |
| revoked_at | timestamptz nullable | |
| created_at | timestamptz | |

### `password_reset_tokens`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| token_hash | text | |
| expires_at | timestamptz | |
| consumed_at | timestamptz nullable | |
| created_at | timestamptz | |

### `student_profiles`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk unique | one active profile record |
| tenant_id | uuid fk nullable | null for individual users |
| grade_level | text | |
| age_band | text | |
| favorite_subjects | jsonb | |
| favorite_activities | jsonb | |
| topics_curious_about | jsonb | |
| personal_strengths | jsonb | |
| avoids_or_dislikes | jsonb | |
| completion_status | text | `draft`, `submitted` |
| submitted_at | timestamptz nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `profile_versions`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| student_profile_id | uuid fk | |
| snapshot | jsonb | immutable snapshot |
| created_by_user_id | uuid fk | |
| created_at | timestamptz | |

### `assessment_templates`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| code | text unique | |
| assessment_type | text | `profile`, `proof` |
| version | integer | |
| schema | jsonb | answer and prompt schema |
| status | text | `active`, `deprecated` |
| created_at | timestamptz | |

### `assessment_question_sets`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| tenant_id | uuid fk nullable | |
| assessment_type | text | |
| template_id | uuid fk | |
| target_career_id | uuid fk nullable | proof only |
| source | text | `ai`, `rules`, `hybrid` |
| questions_json | jsonb | |
| status | text | `draft`, `answered`, `scored` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `assessment_answers`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| question_set_id | uuid fk | |
| user_id | uuid fk | |
| answers_json | jsonb | |
| submitted_at | timestamptz | |

### `assessment_results`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| question_set_id | uuid fk unique | |
| user_id | uuid fk | |
| tenant_id | uuid fk nullable | |
| result_type | text | `profile`, `proof` |
| score | numeric nullable | |
| band | text nullable | |
| result_json | jsonb | detailed output |
| scoring_version | text | |
| provider_name | text nullable | |
| model_name | text nullable | |
| created_at | timestamptz | |

### `career_categories`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | |
| name | text | |
| created_at | timestamptz | |

### `careers`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| category_id | uuid fk | |
| slug | text unique | |
| title | text | |
| summary | text | |
| status | text | `active`, `draft`, `archived` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `career_details`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| career_id | uuid fk unique | |
| education_path | jsonb | |
| skills | jsonb | |
| positives | jsonb | |
| challenges | jsonb | |
| drawbacks | jsonb | |
| salary_meta | jsonb | |
| outlook_meta | jsonb | |
| resilience_meta | jsonb | |
| updated_at | timestamptz | |

### `recommendation_snapshots`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| tenant_id | uuid fk nullable | |
| source_result_id | uuid fk nullable | latest profile result |
| status | text | `ready`, `stale`, `failed` |
| items_json | jsonb | ranked careers |
| algorithm_version | text | |
| created_at | timestamptz | |

### `proof_sessions`

This can reuse assessment tables conceptually, but a separate table is acceptable for reporting clarity.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| tenant_id | uuid fk nullable | |
| career_id | uuid fk | |
| question_set_id | uuid fk | |
| result_id | uuid fk nullable | |
| status | text | `started`, `submitted`, `scored`, `abandoned` |
| started_at | timestamptz | |
| submitted_at | timestamptz nullable | |
| completed_at | timestamptz nullable | |

### `reports`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| tenant_id | uuid fk nullable | |
| report_type | text | `student`, `parent`, `school` |
| status | text | `queued`, `ready`, `failed` |
| version | text | |
| report_json | jsonb | structured payload |
| file_url | text nullable | object storage URL/key |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `report_shares`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| report_id | uuid fk | |
| token_hash | text | |
| expires_at | timestamptz | |
| revoked_at | timestamptz nullable | |
| created_at | timestamptz | |

### `audit_logs`

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| actor_user_id | uuid fk nullable | |
| tenant_id | uuid fk nullable | |
| action | text | |
| entity_type | text | |
| entity_id | uuid nullable | |
| metadata | jsonb | |
| ip_address | inet nullable | |
| created_at | timestamptz | |

## Indexing Guidance

Add indexes for:

- `users(email)`
- `tenant_memberships(tenant_id, role)`
- `student_profiles(tenant_id)`
- `assessment_question_sets(user_id, assessment_type, created_at desc)`
- `assessment_results(user_id, result_type, created_at desc)`
- `careers(category_id, status)`
- `recommendation_snapshots(user_id, created_at desc)`
- `proof_sessions(user_id, completed_at desc)`
- `audit_logs(tenant_id, created_at desc)`

## Data Retention

- audit logs retained long-term
- sessions pruned by expiry
- password reset tokens pruned aggressively
- AI raw payload retention governed by privacy policy

## Migration Rules

- all schema changes via Prisma migrations
- no manual production schema drift
- destructive migrations require data migration plan
- backfills run as scripts or jobs with observability

## Testing Strategy

- unit tests per module
- integration tests against Postgres
- contract tests for public APIs
- seed factories for auth, tenant, profile, assessment, and reports

## Backend Build Order

1. Auth and sessions
2. Tenants and memberships
3. Users and profile domain
4. Career catalog
5. Assessment engine
6. Recommendation snapshots
7. Reports and parent sharing
8. Admin and audit tooling
