import type { ReactNode } from "react";

/**
 * Data-visualization primitives — pure server-rendered SVG/CSS, zero client JS.
 *
 * Design rules (see the dataviz method):
 *  - One-hue ordinal violet ramp (validated): #a78bfa → #8b5cf6 → #7c3aed → #5b21b6.
 *  - Depth via gradients, soft glow and layered shadow; text always wears ink
 *    tokens, never the data color; every value is shown as text (never color-
 *    or tooltip-only). Native <title>/`title` gives hover text.
 *  - Marks: rounded gradient fills, a soft surface gap between donut segments,
 *    recessive hairline tracks. Charts degrade gracefully on empty/zero data.
 *  - Motion is CSS-only (no hydration) and disabled under reduced-motion.
 */

const GAUGE_R = 54;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R; // 339.292 — keep in sync with @keyframes cpSweep
const DONUT_R = 54;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

/** Ordinal rank for a readiness band string (both naming schemes). 0 = lowest. */
export function bandRank(band: string): 0 | 1 | 2 | 3 {
  const value = band.toLowerCase();
  if (value.includes("exceptional") || value.includes("strong")) {
    return 3;
  }
  if (value.includes("promising")) {
    return 2;
  }
  if (value.includes("developing")) {
    return 1;
  }
  if (value.includes("emerging") || value.includes("low")) {
    return 0;
  }
  return 1;
}

// ── Icons (monoline, inline) ──────────────────────────────────────────────────

export type IconName = "gauge" | "target" | "check" | "users" | "doc" | "inbox" | "spark";

function StatIcon({ name }: { name: IconName }): JSX.Element {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  switch (name) {
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.4" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 7L10 17l-5-5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M13 3v5h5M9.5 13h6M9.5 16.5h6" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 13l2.5-8h11L20 13v6H4z" />
          <path d="M4 13h4l1.5 2.5h5L16 13h4" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.6L19.5 10l-4.7 3.4L16 19l-4-3-4 3 1.2-5.6L4.5 10l5.7-1.4z" />
        </svg>
      );
    case "gauge":
    default:
      return (
        <svg {...common}>
          <path d="M12 13l4-4" />
          <path d="M4.2 17a9 9 0 1 1 15.6 0" />
          <circle cx="12" cy="13" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

// ── Radial gauge ────────────────────────────────────────────────────────────
// A single ratio (score vs. max) as a gradient ring with a soft glow.

export function RadialGauge({
  value,
  max = 100,
  unit,
  caption,
  label,
  tone = "brand"
}: {
  value: number;
  max?: number;
  /** Small superscript beside the value, e.g. "/100". */
  unit?: string;
  /** Small uppercase line under the value, e.g. "Overall". */
  caption?: string;
  /** Band pill under the dial, e.g. "Promising readiness". */
  label?: string;
  tone?: "brand" | "success";
}): JSX.Element {
  const pct = max > 0 ? clamp01(value / max) : 0;
  const offset = GAUGE_CIRC * (1 - pct);
  const gradId = tone === "success" ? "cpGaugeGreen" : "cpGaugeViolet";
  const strokeStyle = { stroke: `url(#${gradId})` };

  return (
    <figure
      className={`chart-gauge chart-gauge--${tone}`}
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${value} out of ${max}`}
    >
      <div className="chart-gauge__dial">
        <svg viewBox="0 0 128 128" className="chart-gauge__svg" aria-hidden="true">
          <defs>
            <linearGradient id="cpGaugeViolet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="0.55" stopColor="#7c3aed" />
              <stop offset="1" stopColor="#5b21b6" />
            </linearGradient>
            <linearGradient id="cpGaugeGreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4ec08a" />
              <stop offset="0.6" stopColor="#2f8d61" />
              <stop offset="1" stopColor="#1f7a52" />
            </linearGradient>
            <filter id="cpGaugeSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <circle className="chart-gauge__track" cx="64" cy="64" r={GAUGE_R} />
          <circle
            className="chart-gauge__glow"
            cx="64"
            cy="64"
            r={GAUGE_R}
            style={strokeStyle}
            strokeDasharray={GAUGE_CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
          />
          <circle
            className="chart-gauge__fill"
            cx="64"
            cy="64"
            r={GAUGE_R}
            style={strokeStyle}
            strokeDasharray={GAUGE_CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
          />
        </svg>
        <div className="chart-gauge__center">
          <div className="chart-gauge__value">
            {value}
            {unit ? <span>{unit}</span> : null}
          </div>
          {caption ? <div className="chart-gauge__unit">{caption}</div> : null}
        </div>
      </div>
      {label ? (
        <figcaption className="band-pill">
          <span className="band-pill__dot" aria-hidden="true" />
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ── Horizontal bar list ───────────────────────────────────────────────────────
// Compare magnitude across nominal items → one hue (gradient). Label + value
// ride above each full-width track; nothing is clipped.

export interface BarItem {
  label: string;
  value: number;
  /** Per-item scale ceiling. Falls back to the shared/derived max. */
  max?: number;
  /** Display string for the value (defaults to the number). */
  valueLabel?: string;
}

export function BarList({
  items,
  max,
  ariaLabel
}: {
  items: BarItem[];
  max?: number;
  ariaLabel: string;
}): JSX.Element {
  const derivedMax = max ?? Math.max(1, ...items.map((item) => item.max ?? item.value));

  return (
    <ul className="chart-bars" role="img" aria-label={ariaLabel}>
      {items.map((item) => {
        const itemMax = item.max ?? derivedMax;
        const pct = itemMax > 0 ? clamp01(item.value / itemMax) : 0;
        const display = item.valueLabel ?? String(item.value);
        return (
          <li className="chart-bars__row" key={item.label}>
            <div className="chart-bars__head">
              <span className="chart-bars__label">{item.label}</span>
              <span className="chart-bars__value">{display}</span>
            </div>
            <div className="chart-bars__track">
              <div
                className="chart-bars__fill"
                style={{ width: `${pct * 100}%` }}
                title={`${item.label}: ${display}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────
// Ordered stages that shrink stage→stage → centered narrowing bars, ordinal ramp.

export interface FunnelStage {
  label: string;
  value: number;
}

export function Funnel({
  stages,
  ariaLabel
}: {
  stages: FunnelStage[];
  ariaLabel: string;
}): JSX.Element {
  const base = stages[0]?.value ?? 0;
  const max = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <ol className="chart-funnel" role="img" aria-label={ariaLabel}>
      {stages.map((stage, index) => {
        const pct = max > 0 ? clamp01(stage.value / max) : 0;
        const ofBase = base > 0 ? Math.round((stage.value / base) * 100) : 0;
        const step = Math.min(index, 3);
        return (
          <li className="chart-funnel__row" key={stage.label}>
            <div className="chart-funnel__head">
              <span className="chart-funnel__label">{stage.label}</span>
              <span className="chart-funnel__value">
                {stage.value}
                {index > 0 ? <span className="chart-funnel__pct"> · {ofBase}% of start</span> : null}
              </span>
            </div>
            <div
              className={`chart-funnel__bar chart-funnel__bar--step${step}`}
              style={{ width: `${Math.max(pct * 100, 6)}%` }}
              title={`${stage.label}: ${stage.value}`}
            >
              {stage.value}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Segments (shared by Donut / StackedBar) ─────────────────────────────────────

export interface StackSegment {
  label: string;
  value: number;
  /** Ordinal ramp step 0–3 (lightest → darkest). */
  step: 0 | 1 | 2 | 3;
}

// ── Donut (part-to-whole) ───────────────────────────────────────────────────────

export function Donut({
  segments,
  centerValue,
  centerCaption,
  ariaLabel
}: {
  segments: StackSegment[];
  centerValue: ReactNode;
  centerCaption: string;
  ariaLabel: string;
}): JSX.Element {
  const shown = segments.filter((segment) => segment.value > 0);
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  const gap = total > 1 ? 4 : 0; // surface gap in path length, only when >1 slice
  const legendTotal = segments.reduce((sum, segment) => sum + segment.value, 0);

  let cursor = 0;
  const arcs = shown.map((segment) => {
    const fraction = total > 0 ? segment.value / total : 0;
    const full = fraction * DONUT_CIRC;
    const visible = Math.max(full - gap, 1);
    const dashoffset = -cursor;
    cursor += full;
    return { segment, visible, dashoffset };
  });

  return (
    <div className="chart-donut-wrap">
      <div className="chart-donut" role="img" aria-label={ariaLabel}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          {total > 0 ? (
            arcs.map(({ segment, visible, dashoffset }) => (
              <circle
                key={segment.label}
                className={`chart-donut__seg chart-donut__seg--step${segment.step}`}
                cx="64"
                cy="64"
                r={DONUT_R}
                strokeDasharray={`${visible} ${DONUT_CIRC - visible}`}
                strokeDashoffset={dashoffset}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </circle>
            ))
          ) : (
            <circle className="chart-donut__seg" cx="64" cy="64" r={DONUT_R} stroke="var(--viz-track)" />
          )}
        </svg>
        <div className="chart-donut__center">
          <span className="chart-donut__num">{centerValue}</span>
          <span className="chart-donut__cap">{centerCaption}</span>
        </div>
      </div>
      <ul className="chart-legend">
        {segments.map((segment) => {
          const share = legendTotal > 0 ? Math.round((segment.value / legendTotal) * 100) : 0;
          return (
            <li key={segment.label}>
              <span className={`chart-legend__swatch chart-legend__swatch--step${segment.step}`} aria-hidden="true" />
              <span className="chart-legend__label">{segment.label}</span>
              <span className="chart-legend__value">
                {segment.value} <small>· {share}%</small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Meter (single ratio against a limit) ────────────────────────────────────────

export function Meter({
  value,
  max,
  label,
  valueLabel,
  caption
}: {
  value: number;
  max: number;
  label: string;
  valueLabel?: string;
  caption?: string;
}): JSX.Element {
  const pct = max > 0 ? clamp01(value / max) : 0;
  const display = valueLabel ?? `${Math.round(pct * 100)}%`;

  return (
    <div className="chart-meter" role="img" aria-label={`${label}: ${display}`}>
      <div className="chart-meter__head">
        <span className="chart-meter__label">{label}</span>
        <span className="chart-meter__value">{display}</span>
      </div>
      <div className="chart-meter__track">
        <div className="chart-meter__fill" style={{ width: `${pct * 100}%` }} title={`${label}: ${display}`} />
      </div>
      {caption ? <p className="chart-meter__caption">{caption}</p> : null}
    </div>
  );
}

// ── Stat tile (enhanced metric card) ─────────────────────────────────────────────
// Icon chip · label · big figure (+ optional unit) · caption · optional inline meter.

export function StatTile({
  label,
  value,
  unit,
  caption,
  icon,
  meter,
  tone = "brand"
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  caption?: ReactNode;
  icon?: IconName;
  meter?: { value: number; max: number };
  tone?: "brand" | "success" | "neutral";
}): JSX.Element {
  return (
    <article className={`stat-tile stat-tile--${tone}`}>
      <div className="stat-tile__top">
        <p className="stat-tile__label">{label}</p>
        {icon ? (
          <span className="stat-tile__icon" aria-hidden="true">
            <StatIcon name={icon} />
          </span>
        ) : null}
      </div>
      <p className="stat-tile__value">
        {value}
        {unit ? <sub>{unit}</sub> : null}
      </p>
      {caption ? <p className="stat-tile__caption">{caption}</p> : null}
      {meter ? (
        <div className="stat-tile__foot">
          <div className="stat-tile__meter" aria-hidden="true">
            <div
              className="stat-tile__meter-fill"
              style={{ width: `${(meter.max > 0 ? clamp01(meter.value / meter.max) : 0) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
