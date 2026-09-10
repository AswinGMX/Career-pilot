# Local Testing Guide

This is the fastest path to review the rebuilt app on localhost.

## Local Setup

1. Start infrastructure:
   - `pnpm infra:local:start`
2. Bootstrap the database and catalog:
   - `pnpm setup:local`
3. Run the full stack:
   - `pnpm dev`
4. Optional worker process:
   - `START_WORKER=1 pnpm dev`

Default local URLs:

- web: `http://localhost:3000`
- api: `http://localhost:4000/v1`
- metrics: `http://localhost:4000/v1/metrics`

If `3000` or `4000` is already occupied, `pnpm dev` automatically selects the next open local port and prints the chosen URLs.

## What To Test

### Student Flow

1. Open `/register`
2. Create an `individual` account
3. Complete `/student/profile`
4. Open `/student/recommendations` and recompute
5. Open a career and start a proof session
6. Open `/student/report` and generate a durable report
7. Create a parent share link

### School Flow

1. Open `/register`
2. Create a `school_admin` account
3. Open `/school/students`
4. Create a school student
5. Open `/school/report` and generate the tenant report

## Quick Verification Targets

- `GET /v1/health`
- `GET /v1/metrics`
- request responses include `x-request-id`
- repeated bad logins eventually return `429`

## Notes

- the root prototype is legacy-only and should not be used for product validation
- if Docker Desktop is unavailable, the local infra scripts are the supported fallback
