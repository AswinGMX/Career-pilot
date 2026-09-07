import { Logger } from "@nestjs/common";
import { Redis, type RedisOptions } from "ioredis";

import { DEFAULT_REDIS_URL } from "./queue.constants";

/** Fail-fast defaults for request-path commands (see {@link createRedisCommandConnection}). */
const DEFAULT_COMMAND_TIMEOUT_MS = 1_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 2_000;

/**
 * NaN-safe positive-integer env read. A malformed value (`"1s"`, a stray
 * comment) must fall back to the default and say so, never silently disable the
 * timeout it is supposed to configure.
 */
function readTimeoutMs(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    new Logger("Redis").warn(`Ignoring invalid ${name}="${raw}"; using ${fallback}ms.`);
    return fallback;
  }

  return Math.floor(parsed);
}

/**
 * Build an ioredis connection configured for BullMQ.
 *
 * `maxRetriesPerRequest: null` and `enableReadyCheck: false` are required by
 * BullMQ for blocking commands. The connection retries indefinitely with
 * capped backoff so a transient Redis outage degrades gracefully instead of
 * crashing the process.
 *
 * Do NOT inject this connection into the HTTP request path: indefinite retries
 * plus ioredis' offline queue mean a command issued while Redis is down never
 * settles. Use {@link createRedisCommandConnection} there.
 */
export function createRedisConnection(label: string, options: RedisOptions = {}): Redis {
  const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;
  const logger = new Logger(`Redis(${label})`);

  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (attempts) => Math.min(attempts * 200, 5_000),
    ...options
  });

  let suppressed = false;
  connection.on("error", (err: Error) => {
    // ioredis emits `error` repeatedly while reconnecting; log the first and
    // suppress the rest to avoid flooding logs, then re-arm on `ready`.
    if (!suppressed) {
      logger.error(`Redis connection error (suppressing repeats until recovery): ${err?.message}`);
      suppressed = true;
    }
  });
  connection.on("ready", () => {
    if (suppressed) {
      logger.log("Redis connection recovered.");
    }
    suppressed = false;
  });

  return connection;
}

/**
 * Build the connection used by request-path callers (rate limiting, health
 * probes) — the ones that must never block a response on Redis.
 *
 * Every option here exists to make a command REJECT quickly instead of waiting:
 * `enableOfflineQueue: false` refuses commands while disconnected rather than
 * buffering them until reconnect, `maxRetriesPerRequest` caps in-flight retries,
 * and `commandTimeout` bounds a command that was accepted by a half-open socket.
 * Without them a Redis outage turns every rate-limited route and `/v1/health`
 * into a hung request, which takes healthy instances out of the load balancer
 * instead of degrading. Callers are expected to handle the rejection.
 */
export function createRedisCommandConnection(label: string, options: RedisOptions = {}): Redis {
  return createRedisConnection(label, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: readTimeoutMs("REDIS_COMMAND_TIMEOUT_MS", DEFAULT_COMMAND_TIMEOUT_MS),
    connectTimeout: readTimeoutMs("REDIS_CONNECT_TIMEOUT_MS", DEFAULT_CONNECT_TIMEOUT_MS),
    // Reconnect faster than the producer connection so the limiter and health
    // probes pick up a recovered Redis within a couple of seconds.
    retryStrategy: (attempts) => Math.min(attempts * 100, 2_000),
    ...options
  });
}
