import { Injectable } from "@nestjs/common";

type CounterMap = Map<string, number>;

@Injectable()
export class ObservabilityService {
  private readonly startedAt = Date.now();
  private readonly requestCounters: CounterMap = new Map();
  private readonly rateLimitedCounters: CounterMap = new Map();
  private readonly requestDurations: CounterMap = new Map();

  observeRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const requestKey = `method="${method}",route="${route}",status="${statusCode}"`;
    const durationKey = `method="${method}",route="${route}"`;

    this.requestCounters.set(requestKey, (this.requestCounters.get(requestKey) || 0) + 1);
    this.requestDurations.set(durationKey, (this.requestDurations.get(durationKey) || 0) + durationMs);
  }

  incrementRateLimited(route: string): void {
    this.rateLimitedCounters.set(route, (this.rateLimitedCounters.get(route) || 0) + 1);
  }

  renderMetrics(): string {
    const lines: string[] = [
      "# HELP career_pilot_api_uptime_seconds API process uptime in seconds.",
      "# TYPE career_pilot_api_uptime_seconds gauge",
      `career_pilot_api_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`,
      "# HELP career_pilot_api_requests_total Total HTTP requests observed.",
      "# TYPE career_pilot_api_requests_total counter"
    ];

    for (const [labels, value] of this.requestCounters.entries()) {
      lines.push(`career_pilot_api_requests_total{${labels}} ${value}`);
    }

    lines.push("# HELP career_pilot_api_request_duration_ms_total Total request duration by method and route.");
    lines.push("# TYPE career_pilot_api_request_duration_ms_total counter");

    for (const [labels, value] of this.requestDurations.entries()) {
      lines.push(`career_pilot_api_request_duration_ms_total{${labels}} ${value}`);
    }

    lines.push("# HELP career_pilot_api_rate_limited_total Total rate-limited requests by route rule.");
    lines.push("# TYPE career_pilot_api_rate_limited_total counter");

    for (const [route, value] of this.rateLimitedCounters.entries()) {
      lines.push(`career_pilot_api_rate_limited_total{route="${route}"} ${value}`);
    }

    return `${lines.join("\n")}\n`;
  }
}
