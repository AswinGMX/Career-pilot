# Engineering Standards

This document defines the baseline engineering standards for the rebuild.

## Runtime Baseline

- Node.js `18.16.0` for the current scaffold stage
- `pnpm` for package management
- Turborepo for workspace orchestration
- Docker Compose for preferred containerized local infra
- local Homebrew Postgres and Redis binaries are an acceptable fallback during environment issues

## Repo Rules

- all production work goes into `apps/*` and `packages/*`
- the root prototype is legacy reference only
- every schema change must be migration-backed
- every new API route must have request and response contracts

## Quality Gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- CI must pass before merge

## Formatting

- use Prettier defaults from repo config
- use `.editorconfig` defaults
- prefer ASCII unless the file already requires Unicode

## Commit Discipline

- one logical change per commit
- no direct pushes to protected production branches
- include docs updates when architecture or contracts change

## Testing Discipline

- unit tests for isolated logic
- integration tests for backend modules
- E2E tests for critical user journeys

## Architecture Discipline

- no business logic in page-level UI files
- no frontend-owned hidden backend contracts
- no tenant access without explicit tenant scoping
