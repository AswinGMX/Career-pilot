# Career Pilot Rebuild Roadmap

## Purpose

This document turns the target architecture into an execution plan.

It defines:

- rebuild sequence
- milestones
- team workstreams
- quality gates
- rollout strategy
- first implementation tasks

This is the operational plan for turning Career Pilot from prototype into a production-ready platform.

## Ground Rules

The rebuild should follow these rules without exception:

- do not evolve the prototype into production by layering more code on top
- create the new production system in a clean target structure
- port only validated product flows
- backend contracts are designed before frontend implementation
- database schema and migrations are treated as first-class work
- every phase ends with explicit acceptance criteria
- no phase is considered done without observability, tests, and security checks appropriate to that phase

## Overall Delivery Strategy

Use a staged rebuild with a modular monorepo:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/ui`
- `packages/config`
- `packages/types`
- `packages/eslint-config`
- `packages/tsconfig`

Execution style:

1. establish platform foundation
2. establish backend contracts and data model
3. establish frontend shells and auth
4. build student journey end to end
5. build school journey end to end
6. add reporting and parent share flows
7. harden for production
8. migrate traffic and retire prototype

## Recommended Workstreams

Run these workstreams in parallel where dependencies allow:

### Workstream A: Platform Foundation

- monorepo setup
- developer tooling
- CI
- Docker
- environment management
- deployment pipelines

### Workstream B: Backend Core

- NestJS app
- auth
- tenant model
- users and sessions
- Postgres schema
- Prisma migrations

### Workstream C: Frontend Core

- Next.js app
- route groups
- providers
- session handling
- design tokens
- UI primitives

### Workstream D: Product Domains

- profile
- assessments
- recommendations
- careers
- reports
- school admin

### Workstream E: Hardening

- observability
- audit logs
- rate limiting
- retry behavior
- backup and recovery
- security review

## Delivery Phases

## Phase 0: Project Reset and Technical Baseline

### Goal

Create the new production workspace and lock the engineering standards before feature work starts.

### Deliverables

- pnpm workspace monorepo
- Turborepo pipeline
- new `apps/web`
- new `apps/api`
- new `apps/worker`
- shared config packages
- linting, formatting, and commit standards
- Docker compose for local dependencies
- environment variable strategy
- CI pipeline skeleton

### Acceptance Criteria

- all apps build in CI
- lint and typecheck run from root
- local environment can boot web, api, worker, Postgres, and Redis
- no new production work lands in the prototype app

## Phase 1: Identity, Tenants, and Platform Skeleton

### Goal

Implement the minimum secure platform foundation.

### Backend Deliverables

- users table
- tenants table
- tenant memberships table
- sessions table
- password reset tables
- auth module
- tenant module
- user module
- audit log baseline
- `/v1/auth/*`
- `/v1/tenants/*`

### Frontend Deliverables

- public routes
- auth routes
- session-aware app shell
- login
- register
- forgot password
- reset password
- role-aware redirect logic

### Acceptance Criteria

- secure auth works end to end
- session refresh works
- school admin and student roles are enforced
- tenant membership is stored relationally
- audit entries exist for auth-critical actions
- E2E tests cover login and registration

## Phase 2: Student Profile Foundation

### Goal

Implement the student onboarding and profile domain with proper persistence and revision history.

### Backend Deliverables

- student profile tables
- profile versioning
- profile APIs
- validation schemas
- profile submission lifecycle

### Frontend Deliverables

- student app shell
- profile form
- draft save behavior if supported
- profile review and submission flow
- validation and error states

### Acceptance Criteria

- student can create and update a profile
- profile revisions are preserved
- tenant-aware students are scoped correctly
- form validation is consistent between client and server
- component and integration tests exist for profile flows

## Phase 3: Career Catalog and Search

### Goal

Replace runtime-generated catalog logic with managed career data and stable read APIs.

### Backend Deliverables

- career categories tables
- careers tables
- career details tables
- seed or ingestion pipeline for curated catalog data
- `/v1/careers`
- `/v1/careers/:id`
- `/v1/career-categories`

### Frontend Deliverables

- careers list page
- search
- filters
- career detail page
- loading and empty states

### Acceptance Criteria

- catalog data comes from Postgres
- list endpoints are paginated and indexed
- career pages render off stable contracts
- E2E tests cover search and detail navigation

## Phase 4: Assessment Engine

### Goal

Implement versioned assessment generation, submission, and scoring.

### Backend Deliverables

- assessment templates
- question sets
- answers
- results
- worker queue for question generation and scoring
- provider abstraction for AI
- fallback strategy for AI failures

### Frontend Deliverables

- question set rendering
- answer submission flow
- progress UI
- result screens
- retry and failure messaging

### Acceptance Criteria

- profile and proof assessments are versioned
- scoring output is persisted and reproducible
- AI calls are observable and retryable
- assessment flow survives worker failure and retry
- tests cover scoring and submission behavior

## Phase 5: Recommendations

### Goal

Turn recommendations into a snapshot-based, explainable domain.

### Backend Deliverables

- recommendation snapshot table
- recomputation jobs
- explanation payload schema
- recommendation APIs

### Frontend Deliverables

- recommendation cards
- recommendation detail/explanation sections
- stale state and refresh handling

### Acceptance Criteria

- recommendation results are derived from persisted profile or assessment results
- every recommendation carries version metadata
- refresh and recompute paths are observable

## Phase 6: School Admin Workspace

### Goal

Implement the multi-tenant school workflow cleanly.

### Backend Deliverables

- school member listing
- student report views
- school-scoped analytics endpoints
- invitation or student creation flow

### Frontend Deliverables

- school dashboard
- student roster
- student detail/report view
- school reporting pages

### Acceptance Criteria

- school admins cannot cross tenant boundaries
- roster and report data scale with pagination
- audit logs exist for school admin actions
- E2E tests cover school workflows

## Phase 7: Reports and Parent Sharing

### Goal

Implement durable reporting and controlled external sharing.

### Backend Deliverables

- reports table
- report generation jobs
- parent share token model
- report exports to object storage

### Frontend Deliverables

- student report page
- school report page
- parent share page
- export status UX

### Acceptance Criteria

- report generation is async and observable
- share tokens are revocable and expirable
- exported files are stored privately

## Phase 8: Production Hardening

### Goal

Close the gap between functional software and production software.

### Deliverables

- rate limiting
- CSRF protection
- secret management integration
- full structured logging
- metrics and dashboards
- error tracking
- backup and restore procedure
- runbooks
- SLO definition
- load testing
- security review

### Acceptance Criteria

- staging mirrors production architecture
- dashboards and alerts exist
- on-call runbooks exist
- disaster recovery is tested
- critical endpoints have latency and error budgets

## Phase 9: Cutover and Prototype Retirement

### Goal

Switch traffic safely and retire the prototype.

### Deliverables

- migration checklist
- staging signoff
- production rollout plan
- rollback plan
- prototype freeze
- prototype decommission plan

### Acceptance Criteria

- production traffic is served by new stack
- rollback path is documented and tested
- old prototype is read-only or retired

## First 30 Days Plan

This is the exact recommended first sequence.

## Week 1

### Platform

- initialize monorepo
- add Turborepo and pnpm workspace
- create `apps/web`, `apps/api`, `apps/worker`
- create shared config packages
- add root lint, format, typecheck, and test scripts

### Infra

- add `docker-compose` for Postgres and Redis
- define `.env.example` strategy for all apps
- add CI workflow with lint and typecheck

### Docs

- treat `architecture.md`, `backend-api-db-schema.md`, `frontend-architecture.md`, and this roadmap as required references

### Exit Gate

- team can clone, install, boot, lint, and typecheck the new workspace

## Week 2

### Backend

- scaffold NestJS modules for auth, users, tenants, health
- initialize Prisma
- create first migrations for users, tenants, memberships, sessions
- implement `/v1/health`
- implement `/v1/auth/me`

### Frontend

- scaffold Next.js app
- set up route groups and providers
- implement public shell and auth shell
- create base UI primitives in `packages/ui`

### Exit Gate

- session-aware web shell can hit API health and auth context

## Week 3

### Backend

- implement register, login, refresh, logout
- implement password reset request and reset consume
- add audit log writes
- add integration tests for auth

### Frontend

- implement login, register, forgot/reset pages
- implement session query and redirect logic
- add E2E tests for auth flows

### Exit Gate

- auth works end to end in local and CI

## Week 4

### Backend

- implement student profile module and tables
- implement create/update/get/submit profile endpoints
- add profile versioning

### Frontend

- implement student profile route and form
- connect to real API
- add component tests and happy-path E2E coverage

### Exit Gate

- one complete student onboarding flow works on the new stack

## Engineering Guardrails

These rules keep the rebuild from degrading into another prototype.

### Architecture Guardrails

- no business logic in page components
- no direct database access outside backend domain modules
- no runtime-only hidden contracts between frontend and backend
- no unversioned AI prompt changes without metadata

### Quality Guardrails

- no merge without lint and typecheck
- no domain endpoint without integration tests
- no critical user flow without E2E coverage
- no schema change without migration

### Security Guardrails

- no plaintext secrets in repo
- no insecure local auth patterns copied to production code
- no tenant-scoped query without tenant enforcement

### Product Guardrails

- no extra roles beyond documented roles without design review
- no feature expansion before foundation phases are stable

## Roles and Ownership

Recommended ownership model:

### Platform Lead

- monorepo
- CI
- infra
- release process

### Backend Lead

- domain modules
- auth
- database
- API contracts

### Frontend Lead

- Next.js architecture
- design system
- route boundaries
- test quality

### Product Engineer Team

- feature implementation within module boundaries

## Definition of Phase Completion

A phase is complete only if:

- code is merged
- contracts are documented
- tests exist
- observability exists where relevant
- staging validation passed
- known risks are recorded

## Immediate Next Technical Tasks

The next concrete engineering tasks should be:

1. create the monorepo skeleton
2. isolate the prototype as legacy reference
3. scaffold `apps/api` with NestJS
4. scaffold `apps/web` with Next.js
5. stand up Postgres and Redis locally
6. create first Prisma schema and migrations
7. implement health and auth session endpoints
8. create base design system primitives

## Final Rule

Whenever there is conflict between speed and architecture quality in the rebuild, choose the architecture that reduces long-term complexity and makes the system easier to operate in production.
