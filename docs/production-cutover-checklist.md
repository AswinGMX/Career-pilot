# Production Cutover Checklist

This checklist is the required gate before switching production traffic to the new monorepo stack.

## Scope

The cutover target is:

- `apps/web`
- `apps/api`
- `apps/worker`
- shared packages under `packages/*`

The root-level prototype is not part of the production target.

## Technical Readiness

- `pnpm install` completes cleanly in CI and local development.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `pnpm test` passes.
- local infra startup path is documented and tested.
- staging environment is deployed from the monorepo, not the prototype.
- Postgres migrations are applied successfully in staging.
- API health endpoint returns `200`.
- metrics endpoint returns valid text output.
- rate limiting is enabled for auth and AI-heavy endpoints.
- request IDs are present on responses.
- private report export generation works.

## Product Readiness

- student auth flow works end to end.
- school admin auth flow works end to end.
- student profile submission works.
- recommendations can be generated.
- proof sessions can be started and completed.
- student durable reports can be generated.
- parent share links can be created and revoked.
- school aggregate reports can be generated.

## Operational Readiness

- production env vars are defined in the real secret manager.
- `TRUST_PROXY` matches the actual topology. **Required behind a load balancer**:
  the default trusts nothing, so `request.ip` becomes the balancer's address and
  every user shares one rate-limit bucket. Set the number of proxy hops (`1`
  behind a single LB) — never `true`, which lets clients spoof their own IP.
- `STORAGE_SIGNING_SECRET` is set (>= 32 chars) if `STORAGE_DRIVER=local`; the
  API refuses to boot in production without it.
- `MICROSOFT_TENANT_ID` is pinned if Microsoft sign-in is enabled, so identities
  from unrelated tenants cannot reach the app.
- Gemini key is rotated and not reused from development chat history.
- database backup is taken before cutover.
- rollback owner is assigned.
- incident Slack/war-room channel is prepared.
- on-call engineer and product approver are named.
- DNS, reverse proxy, and TLS ownership are confirmed.

## Data and Migration Readiness

- there is a written decision for prototype data handling:
  - no migration
  - partial migration
  - full migration
- if migration is required, dry-run results are reviewed.
- if no migration is required, the product team signs off that legacy data remains reference-only.
- audit logs are retained in the new environment.

## Go/No-Go Gate

All items above must be checked by engineering and product before production traffic is switched.
