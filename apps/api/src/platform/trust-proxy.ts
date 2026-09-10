import { Logger } from "@nestjs/common";

/**
 * Resolve Express' `trust proxy` setting from `TRUST_PROXY`.
 *
 * This value decides whether `request.ip` may come from `x-forwarded-for`, and
 * the rate limiter and audit log both key on `request.ip`. Trusting the header
 * when nothing strips it means any client can forge its own identity and evade
 * every limit; not trusting it behind a real load balancer means every request
 * looks like it came from the proxy. So it must be configured per deployment,
 * and the safe default is to trust nothing.
 *
 * Accepted values (Express semantics):
 * - unset / `"false"` / `"0"` — trust nothing; `request.ip` is the socket peer.
 * - a hop count, e.g. `"1"` — trust that many proxies closest to the app.
 * - a list of proxy IPs/CIDRs or presets, e.g. `"loopback, 10.0.0.0/8"`.
 * - `"true"` — trust every hop. Accepted but warned about: it is equivalent to
 *   letting clients set their own IP.
 */
export function resolveTrustProxy(raw: string | undefined): boolean | number | string {
  const value = raw?.trim();

  if (!value || value === "false" || value === "0") {
    return false;
  }

  if (value === "true") {
    new Logger("TrustProxy").warn(
      'TRUST_PROXY=true trusts every hop, so clients can spoof x-forwarded-for and bypass rate limits. Set a hop count (e.g. "1") or a proxy allowlist instead.'
    );
    return true;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}
