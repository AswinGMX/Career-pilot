#!/bin/sh

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PG_DATA_DIR="$RUNTIME_DIR/postgres"
REDIS_PID_FILE="$RUNTIME_DIR/redis.pid"

if pg_ctl -D "$PG_DATA_DIR" status >/dev/null 2>&1; then
  pg_ctl -D "$PG_DATA_DIR" stop -m fast >/dev/null
fi

if [ -f "$REDIS_PID_FILE" ]; then
  kill "$(cat "$REDIS_PID_FILE")" >/dev/null 2>&1 || true
  rm -f "$REDIS_PID_FILE"
fi

echo "Local Postgres and Redis have been stopped."
