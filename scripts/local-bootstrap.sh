#!/bin/sh

set -eu

DATABASE_URL="${DATABASE_URL:-postgresql://career_pilot:career_pilot@127.0.0.1:5432/career_pilot}"

echo "Using DATABASE_URL=$DATABASE_URL"
echo "Applying Prisma migrations..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @career-pilot/api exec prisma migrate deploy

echo "Seeding curated careers..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @career-pilot/api seed:careers

echo "Local bootstrap complete."
