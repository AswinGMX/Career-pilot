import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getCareerBySlug, getLatestRecommendations } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CareerDetailPage({ params }: { params: { slug: string } }): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  const [careerResponse, recsResponse] = await Promise.all([
    getCareerBySlug(params.slug),
    getLatestRecommendations(cookieHeader)
  ]);

  if (!careerResponse) {
    notFound();
  }

  const career = careerResponse.career;
  const match = recsResponse.snapshot?.items.find((item) => item.career.slug === career.slug);

  return (
    <AppPage>
      <Hero
        eyebrow={career.category.name}
        title={career.title}
        subtitle={<p style={{ margin: 0 }}>{career.summary}</p>}
      />

      <div className="section-stack">
        <SurfaceCard>
          <div className="match-badge-row">
            {match ? (
              <span className={`fit-badge fit-badge--${match.fitLabel}`}>
                Match #{match.rank} · {match.fitLabel} fit · {match.fitScore}
              </span>
            ) : null}
            <span className="status-chip">{career.category.name}</span>
          </div>
          <div className="button-row" style={{ marginTop: match ? "14px" : 0 }}>
            <Link className="button-primary" href={`/student/proof-sessions/start/${career.slug}`}>
              Start proof session
            </Link>
            {match ? (
              <Link className="button-secondary" href={`/student/recommendations/${career.slug}`}>
                View full match reasoning
              </Link>
            ) : null}
            <Link className="button-ghost" href="/student/careers">
              Back to catalog
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Education path">
          <ul className="content-list">
            {career.educationPath.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard title="Skills">
          <ul className="content-list">
            {career.skills.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>

        <div className="panel-grid panel-grid--cards">
          <SurfaceCard title="Positives">
            <ul className="content-list">
              {career.positives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCard>
          <SurfaceCard title="Challenges">
            <ul className="content-list">
              {career.challenges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCard>
          <SurfaceCard title="Drawbacks">
            <ul className="content-list">
              {career.drawbacks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCard>
        </div>

        <SurfaceCard title="Market signals">
          <div className="panel-grid panel-grid--metrics">
            <CareerMetaCard label="Salary" value={formatSalary(career.salaryMeta)} />
            <CareerMetaCard label="Demand" value={formatOutlook(career.outlookMeta)} />
            <CareerMetaCard label="Resilience" value={formatResilience(career.resilienceMeta)} />
          </div>
        </SurfaceCard>
      </div>
    </AppPage>
  );
}

function CareerMetaCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: "1.1rem", lineHeight: 1.35 }}>
        {value}
      </p>
    </article>
  );
}

function formatSalary(meta: Record<string, unknown>): string {
  const entry = meta.entryLevelLpa;
  const mid = meta.midLevelLpa;
  const senior = meta.seniorLevelLpa;
  if (typeof entry === "number" && typeof mid === "number" && typeof senior === "number") {
    return `${entry} → ${mid} → ${senior} LPA`;
  }
  return "Not available";
}

function formatOutlook(meta: Record<string, unknown>): string {
  const demand = meta.demandScore;
  if (typeof demand === "number") {
    return `${demand}/100`;
  }
  return "Not available";
}

function formatResilience(meta: Record<string, unknown>): string {
  const score = meta.score;
  const label = meta.label;
  if (typeof score === "number" && typeof label === "string") {
    return `${score}/100 · ${label}`;
  }
  return "Not available";
}
