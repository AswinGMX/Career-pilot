# Career Pilot Production Architecture

## Purpose

This document defines the target production architecture for Career Pilot. It is the primary technical reference for rebuilding the app as a reliable, secure, maintainable platform.

The current codebase should be treated as a prototype and product discovery artifact, not as the base for the production system.

## Product Scope

Career Pilot is a multi-tenant career readiness platform for:

- Individual students
- School-linked students
- School administrators
- Parents or guardians as report viewers
- Internal platform operators

Core product capabilities:

- Authentication and account lifecycle
- Tenant-aware school onboarding
- Student profile creation
- AI-assisted assessment and career recommendations
- Career library and career detail
- Career proof sessions and scoring
- Reporting for students, schools, and parents
- Admin operations and auditability

## Architecture Principles

- Modular monolith first, microservices later only if justified by scale
- Strong domain boundaries from day one
- API-first contracts
- Stateless application processes
- Background jobs for AI and heavy work
- Postgres as the system of record
- Object storage for generated reports and uploaded evidence
- Full observability, audit logs, and role-based access control
- Zero trust between client and server
- Explicit tenant isolation in data access
- Infrastructure and deployment automation from the beginning

## Recommended System Shape

Use a modular monolith deployed as separate runtime processes:

1. Web app
2. API app
3. Worker app
4. Postgres
5. Redis
6. Object storage

This is the right tradeoff for the current product:

- simpler than microservices
- easier to ship and debug
- strong enough for real production
- can later split by bounded context if needed

## Recommended Technology Stack

### Frontend

- Next.js App Router
- TypeScript
- React Server Components where useful
- TanStack Query for client data synchronization
- React Hook Form plus Zod
- Tailwind CSS plus a controlled design system
- Storybook

### Backend

- NestJS with TypeScript
- REST API first
- OpenAPI generated from source
- Prisma ORM
- PostgreSQL
- Redis for cache, sessions, queues, and rate limiting
- BullMQ for background jobs

### AI Layer

- Provider abstraction over LLM vendors
- Start with Gemini and OpenAI support behind one interface
- Store prompts and prompt versions as code and metadata
- Background job execution for heavy generation and scoring
- Persist AI inputs, outputs, model, latency, and failure metadata

### Infra

- Docker for local and CI environments
- Terraform for cloud provisioning
- Managed PostgreSQL
- Managed Redis
- S3-compatible object storage
- CDN in front of frontend assets
- Centralized logging and metrics

## Logical Bounded Contexts

The backend should be implemented as modules with explicit ownership.

### Identity and Access

- registration
- login
- logout
- password reset
- session management
- RBAC
- school invitations

### Tenants and Organizations

- school creation
- school membership
- tenant settings
- seat and usage limits later

### Student Profiles

- student demographics and preferences
- profile completion
- trait scoring inputs
- profile revision history

### Assessments

- question set generation
- answer capture
- scoring
- interpretation
- versioned rubric logic

### Career Intelligence

- career catalog
- search
- recommendation engine
- fit explanations
- curated taxonomies

### Reports

- student reports
- parent summaries
- school reports
- export generation

### Platform Operations

- internal admin
- audit logs
- feature flags
- notification templates
- support tooling

## Runtime Topology

### Web

- serves the student, school admin, and internal operator UI
- SSR for public and auth-critical routes
- authenticated app routes can mix SSR and client components

### API

- serves REST endpoints
- owns auth, domain logic, validation, authorization, and persistence

### Worker

- executes async jobs
- AI generation and scoring
- email notifications
- report rendering
- analytics aggregation

### Postgres

- primary relational database
- all transactional state

### Redis

- cache
- job queue transport
- rate limit state
- temporary session or token state where needed

### Object Storage

- exported reports
- attachments
- generated PDFs
- future user-uploaded files

## Authentication and Access Control

Recommended production model:

- Email/password with hashed credentials
- Social login optional later
- Short-lived access token
- Rotating refresh token
- HttpOnly secure cookies for browser sessions
- Device/session management
- RBAC with scoped permissions

Core roles:

- `student`
- `school_admin`
- `parent_viewer`
- `platform_admin`

Tenant-aware authorization rules:

- every school-scoped entity must carry `tenant_id`
- every tenant-scoped query must enforce tenant filters in the repository/service layer
- platform admins bypass tenant scope only through explicit privileged code paths

## AI Architecture

AI should not sit inline on every user request unless latency is acceptable and failure-tolerant.

Use two modes:

- synchronous AI calls only for fast assistive interactions
- queued AI jobs for profile analysis, recommendation generation, proof scoring, and report generation

Every AI workflow must define:

- input schema
- output schema
- provider
- model
- timeout
- retry policy
- cost and latency tracking
- fallback strategy

## Data Ownership

System of record:

- Postgres for relational and transactional data
- object storage for files and exports
- analytics warehouse later, not in v1

Avoid:

- file-based JSON persistence
- hidden state in frontend stores
- business logic embedded in page components

## API Design Rules

- REST with stable versioning under `/v1`
- OpenAPI spec generated and published
- request and response DTOs versioned
- idempotency for sensitive write flows where needed
- pagination for all list endpoints
- consistent error envelope
- server-side filtering, sorting, and search

## Security Requirements

- secure cookies only in production
- CSRF protection for cookie-authenticated writes
- password hashing with Argon2id or bcrypt with strong policy
- rate limiting on auth and AI-heavy endpoints
- audit logs for admin and security-sensitive actions
- secret management via cloud secret manager
- object storage private by default
- encrypted backups
- PII minimization in logs

## Observability

Required from day one:

- structured logs
- request IDs
- distributed tracing hooks
- metrics
- uptime checks
- error tracking
- audit trail for domain and security events

Dashboards should cover:

- auth failures
- queue latency
- AI provider latency and failure rates
- API error rates
- tenant activity
- report generation success

## Deployment Environments

- `local`
- `dev`
- `staging`
- `production`

Rules:

- staging mirrors production shape
- production deploys are automated
- migrations are automated and reversible
- feature flags gate risky rollout

## CI/CD

Every PR should run:

- lint
- typecheck
- unit tests
- integration tests
- API contract checks
- build

Protected branch deployment flow:

1. Merge to main
2. Deploy to staging
3. Run smoke tests
4. Manual approval for production if needed
5. Deploy production

## Recommended Repo Strategy

Use a monorepo:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/ui`
- `packages/config`
- `packages/types`
- `packages/eslint-config`
- `packages/tsconfig`

Recommended tooling:

- pnpm workspaces
- Turborepo

## Delivery Phases

### Phase 1: Foundation

- repo restructure
- infra baseline
- auth and tenant model
- database and migrations
- design system baseline
- API conventions

### Phase 2: Student Journey

- onboarding
- profile creation
- assessment workflow
- recommendation engine
- career library

### Phase 3: School Journey

- school admin workspace
- student roster
- reporting
- parent share flow

### Phase 4: Production Hardening

- observability
- security review
- rate limiting
- background job reliability
- export pipeline
- support tooling

## Non-Goals for V1

- microservices
- event sourcing
- multi-region active-active
- native mobile apps
- real-time collaboration

## Success Criteria

The rebuild is production-ready when:

- the app has a documented modular architecture
- all core product flows are implemented through stable APIs
- the database schema is relational, versioned, and migration-backed
- frontend state and data fetching are predictable and testable
- auth, tenant isolation, audit logging, and observability are present
- AI workflows are versioned, measurable, and failure-tolerant
