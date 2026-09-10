import Link from "next/link";
import type { ReactNode } from "react";

export function AppPage({ children }: { children: ReactNode }): JSX.Element {
  return <main className="app-page">{children}</main>;
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  actions
}: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <section className="app-hero">
      <p className="app-eyebrow">{eyebrow}</p>
      <h1 className="app-title">{title}</h1>
      <div className="app-subtitle">{subtitle}</div>
      {actions ? <div className="app-actions">{actions}</div> : null}
    </section>
  );
}

export function SurfaceCard({
  title,
  children,
  strong = false,
  className
}: {
  title?: string;
  children: ReactNode;
  strong?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <section className={`surface-card${strong ? " surface-card--strong" : ""}${className ? ` ${className}` : ""}`}>
      {title ? <h2 style={{ marginTop: 0, marginBottom: 14 }}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </article>
  );
}

export function NavLinkCard({
  href,
  title,
  description
}: {
  href: string;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <Link className="nav-link-card" href={href}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
