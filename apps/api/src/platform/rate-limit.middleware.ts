import type { NextFunction, Request, Response } from "express";
import { Inject, Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { Redis } from "ioredis";

import { REDIS_COMMAND_CONNECTION } from "../queue/queue.constants";
import { ObservabilityService } from "./observability.service";

type RateLimitRule = {
  id: string;
  methods?: string[];
  prefix: string;
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_RULES: RateLimitRule[] = [
  { id: "auth-login", methods: ["POST"], prefix: "/v1/auth/login", limit: 10, windowMs: 60_000 },
  { id: "auth-register", methods: ["POST"], prefix: "/v1/auth/register", limit: 5, windowMs: 10 * 60_000 },
  // Social sign-in provisions accounts on the callback, so it needs its own cap
  // or it becomes an unmetered `/auth/register`. One sign-in is two requests
  // (start + callback), and schools share a NAT egress IP, so the window is
  // sized for ~30 sign-ins per IP rather than per person.
  { id: "auth-oauth", methods: ["GET"], prefix: "/v1/auth/oauth/", limit: 60, windowMs: 10 * 60_000 },
  { id: "auth-forgot-password", methods: ["POST"], prefix: "/v1/auth/forgot-password", limit: 5, windowMs: 60 * 60_000 },
  // Avatar uploads hand out signed storage URLs, so they get their own ceiling.
  { id: "account-avatar", methods: ["POST"], prefix: "/v1/account/avatar", limit: 30, windowMs: 60 * 60_000 },
  { id: "auth-refresh", methods: ["POST"], prefix: "/v1/auth/refresh", limit: 30, windowMs: 60_000 },
  { id: "recommendations-recompute", methods: ["POST"], prefix: "/v1/recommendations/recompute", limit: 10, windowMs: 10 * 60_000 },
  { id: "proof-session-start", methods: ["POST"], prefix: "/v1/assessments/proof-sessions", limit: 20, windowMs: 10 * 60_000 },
  { id: "student-report-generate", methods: ["POST"], prefix: "/v1/reports/student/generate", limit: 10, windowMs: 10 * 60_000 },
  { id: "student-report-share", methods: ["POST"], prefix: "/v1/reports/student/latest/share", limit: 10, windowMs: 10 * 60_000 },
  { id: "school-report-generate", methods: ["POST"], prefix: "/v1/reports/schools/", limit: 10, windowMs: 10 * 60_000 }
];

/**
 * Atomically increment the window counter and read its remaining TTL.
 * Fixed-window limiter: the first hit sets the expiry; the window then drains.
 * Returns `[count, ttlMs]`.
 */
const INCR_WINDOW_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

/**
 * Per-instance fixed-window counter used ONLY while Redis is unreachable.
 *
 * Falling all the way open there would hand an attacker an unmetered
 * `/auth/login` for the duration of a cache outage. Falling back to a local
 * window instead degrades the limit to `instances × limit` — coarser than the
 * distributed count, but still bounded.
 *
 * Memory is capped: a flood of distinct keys sweeps expired entries and, in the
 * worst case, resets the map rather than growing without limit.
 */
class LocalWindowLimiter {
  private static readonly MAX_KEYS = 50_000;

  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, windowMs: number): { count: number; ttlMs: number } {
    const now = Date.now();
    const existing = this.windows.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return { count: existing.count, ttlMs: existing.resetAt - now };
    }

    if (this.windows.size >= LocalWindowLimiter.MAX_KEYS) {
      this.evict(now);
    }

    this.windows.set(key, { count: 1, resetAt: now + windowMs });
    return { count: 1, ttlMs: windowMs };
  }

  private evict(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }

    if (this.windows.size >= LocalWindowLimiter.MAX_KEYS) {
      // Every entry is still live: drop the generation instead of growing.
      this.windows.clear();
    }
  }
}

/**
 * Distributed rate limiter backed by Redis. Counts are shared across every API
 * instance (unlike the previous in-memory map), so limits hold under horizontal
 * scaling. If Redis is unavailable the limiter degrades to a per-instance
 * window ({@link LocalWindowLimiter}) rather than either failing open — which
 * would remove the auth limits entirely — or failing closed, which would turn a
 * cache outage into a full login outage.
 *
 * The limiter keys on `request.ip`, which is only as trustworthy as Express'
 * `trust proxy` setting (configured from `TRUST_PROXY` in `main.ts`). Reading
 * `x-forwarded-for` directly here would let any client rotate its own key.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly fallback = new LocalWindowLimiter();
  /** Rate-limits the degraded-mode warning so an outage cannot flood the logs. */
  private lastFallbackWarningAt = 0;

  constructor(
    private readonly observabilityService: ObservabilityService,
    @Inject(REDIS_COMMAND_CONNECTION) private readonly redis: Redis
  ) {
    this.use = this.use.bind(this);
  }

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    const rule = this.matchRule(request);

    if (!rule) {
      next();
      return;
    }

    const key = `ratelimit:${rule.id}:${this.readClientKey(request)}`;

    let count: number;
    let ttlMs: number;
    try {
      const result = (await this.redis.eval(INCR_WINDOW_LUA, 1, key, String(rule.windowMs))) as [number, number];
      count = Number(result[0]);
      ttlMs = Number(result[1]);
    } catch (err) {
      // The command connection fails fast by design, so this is reached in
      // milliseconds rather than hanging the request.
      this.warnDegraded(err as Error);
      const local = this.fallback.hit(key, rule.windowMs);
      count = local.count;
      ttlMs = local.ttlMs;
    }

    const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : rule.windowMs);
    this.attachHeaders(response, rule.limit, count, resetAt);

    if (count > rule.limit) {
      this.observabilityService.incrementRateLimited(rule.id);
      response.setHeader("retry-after", String(Math.ceil((ttlMs > 0 ? ttlMs : rule.windowMs) / 1000)));
      response.status(429).json({ statusCode: 429, message: "Rate limit exceeded." });
      return;
    }

    next();
  }

  private warnDegraded(err: Error): void {
    const now = Date.now();

    if (now - this.lastFallbackWarningAt < 10_000) {
      return;
    }

    this.lastFallbackWarningAt = now;
    this.logger.warn(`Redis rate limiter unavailable; degraded to per-instance limits: ${err?.message}`);
  }

  private matchRule(request: Request): RateLimitRule | undefined {
    const method = request.method.toUpperCase();
    const url = (request.originalUrl || request.url).split("?")[0];

    return RATE_LIMIT_RULES.find((rule) => {
      if (rule.methods && !rule.methods.includes(method)) {
        return false;
      }

      if (rule.id === "school-report-generate") {
        return method === "POST" && /^\/v1\/reports\/schools\/[^/]+\/generate$/.test(url);
      }

      return url.startsWith(rule.prefix);
    });
  }

  /**
   * Identity the limit is counted against.
   *
   * `request.ip` resolves `x-forwarded-for` only as far as the configured
   * `trust proxy` hop count allows, and falls back to the socket address when
   * no proxy is trusted. Parsing the header ourselves would mean an attacker
   * could send a fresh value per request and never hit a limit.
   */
  private readClientKey(request: Request): string {
    return request.ip || request.socket.remoteAddress || "unknown";
  }

  private attachHeaders(response: Response, limit: number, count: number, resetAt: number): void {
    response.setHeader("x-ratelimit-limit", String(limit));
    response.setHeader("x-ratelimit-remaining", String(Math.max(0, limit - count)));
    response.setHeader("x-ratelimit-reset", String(Math.floor(resetAt / 1000)));
  }
}
