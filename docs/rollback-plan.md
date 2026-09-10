# Rollback Plan

## Trigger Conditions

Rollback is required if any of the following occur after cutover:

- sustained 5xx errors on critical routes
- auth is broken for student or school admin users
- report generation or proof submission fails broadly
- data corruption is detected
- production latency breaches the agreed threshold and does not stabilize quickly

## Rollback Strategy

1. Stop further deploy activity.
2. Announce rollback in the incident channel.
3. Route traffic back to the previous stable deployment target.
4. Verify health endpoint and login flow on the rollback target.
5. Keep the new deployment isolated for investigation.

## Database Rule

Do not roll back the database blindly.

If a migration is backward-compatible:

- keep the migrated schema in place
- roll application traffic back only

If a migration is destructive or incompatible:

- restore from the pre-cutover backup only after explicit approval from engineering and product

## Verification After Rollback

- health endpoint returns `200`
- student login works
- school admin login works
- no new errors are being emitted at high rate

## Post-Rollback Actions

- freeze new production deploys
- capture impacted requests using request IDs
- document root cause
- update cutover checklist before the next attempt
