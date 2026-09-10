# Production Rollout Plan

## Objective

Serve production traffic from the new monorepo stack and stop treating the root prototype as an active runtime.

## Deployment Order

1. Confirm staging signoff is complete.
2. Take a production database backup.
3. Deploy `apps/api`.
4. Apply Prisma migrations.
5. Run post-deploy health and metrics checks.
6. Deploy `apps/web`.
7. Deploy `apps/worker` if queue-backed jobs are enabled.
8. Smoke test critical paths in production.
9. Flip traffic and monitor.

## Smoke Paths After Deploy

1. `GET /v1/health`
2. `GET /v1/metrics`
3. student login
4. school admin login
5. recommendation recompute
6. proof session completion
7. student report generation
8. parent share creation
9. school report generation

## Monitoring Window

The first 60 minutes after cutover are mandatory active observation.

Track:

- 5xx rate
- auth failure rate
- median and p95 latency on auth, recommendations, assessments, and reports
- rate-limit spikes
- DB connection health

## Ownership During Rollout

- deploy commander: `________________`
- backend owner: `________________`
- frontend owner: `________________`
- infra owner: `________________`
- product verifier: `________________`

## Success Criteria

- production traffic is serving from `apps/web` and `apps/api`
- no traffic is routed to the root prototype
- error rate stays within expected range for 60 minutes
- critical user flows are verified manually after deploy
