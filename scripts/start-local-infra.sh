#!/bin/sh

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PG_DATA_DIR="$RUNTIME_DIR/postgres"
PG_LOG_FILE="$RUNTIME_DIR/postgres.log"
REDIS_DIR="$RUNTIME_DIR/redis"
REDIS_CONF_FILE="$REDIS_DIR/redis.conf"
REDIS_LOG_FILE="$RUNTIME_DIR/redis.log"

mkdir -p "$RUNTIME_DIR" "$REDIS_DIR"

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  if [ ! -d "$PG_DATA_DIR/base" ]; then
    initdb -D "$PG_DATA_DIR" >/dev/null
  fi

  if ! pg_ctl -D "$PG_DATA_DIR" status >/dev/null 2>&1; then
    pg_ctl -D "$PG_DATA_DIR" -l "$PG_LOG_FILE" start >/dev/null
  fi
fi

createdb -h 127.0.0.1 -p 5432 career_pilot >/dev/null 2>&1 || true

cat >"$REDIS_CONF_FILE" <<EOF
dir $REDIS_DIR
port 6379
daemonize yes
logfile $REDIS_LOG_FILE
pidfile $RUNTIME_DIR/redis.pid
save ""
appendonly no
EOF

if ! redis-cli -p 6379 ping >/dev/null 2>&1; then
  redis-server "$REDIS_CONF_FILE" >/dev/null
fi

echo "Local Postgres and Redis are running."
