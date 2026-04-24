import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getLatestRecommendations } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RecommendationMatchPage({
  params
}: {
  params: { careerSlug: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();
  const response = await getLatestRecommendations(cookieHeader);
  const snapshot = response.snapshot;

  if (!snapshot) {
    return (
      <AppPage>
        <Hero
          eyebrow="Match detail"
          title="No recommendations yet"
          subtitle={<p style={{ margin: 0 }}>Submit your profile and generate a recommendation snapshot to see match detail.</p>}
        />
        <div className="section-stack">
          <SurfaceCard>
            <p className="muted-text" style={{ margin: 0 }}>
              You haven't generated a recommendation snapshot. Start at the profile page, then recompute.
            </p>
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              <Link href="/student/profile">Go to profile →</Link>
            </p>
          </SurfaceCard>
        </div>
      </AppPage>
    );
  }

  const item = snapshot.items.find((entry) => entry.career.slug === params.careerSlug);

  if (!item) {
    notFound();
  }

  const { career } = item;

  return (
    <AppPage>
      <Hero
        eyebrow="Match detail"
        title={career.title}
        subtitle={<p style={{ margin: 0 }}>Full reasoning for why this career matches your profile, and what to do next.</p>}
      />

      <div className="section-stack">
        <SurfaceCard>
          <div className="match-badge-row">
            <span className={`fit-badge fit-badge--${item.fitLabel}`}>
              Rank #{item.rank} · {item.fitLabel} fit · {item.fitScore}
            </span>
            <span className="status-chip">{career.category.name}</span>
          </div>
          <p className="muted-text" style={{ margin: 0, lineHeight: 1.7 }}>
            {career.summary}
          </p>
          <p style={{ marginTop: "16px", marginBottom: 0 }}>
            <strong>Why this matches:</strong> <span className="muted-text">{item.explanation}</span>
          </p>
        </SurfaceCard>

        <SurfaceCard title="Reasons">
          {item.reasons.length > 0 ? (
            <ul className="content-list">
              {item.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>No reasoning captured for this match.</p>
          )}
        </SurfaceCard>

        <SurfaceCard title="Evidence from your profile">
          {item.evidenceInputs.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {item.evidenceInputs.map((evidence) => (
                <span key={evidence} className="signal-chip">
                  {evidence}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>No profile evidence captured for this match.</p>
          )}
        </SurfaceCard>

        <SurfaceCard title="What to do next">
          <p className="muted-text" style={{ marginTop: 0 }}>
            Test your readiness for this career with a proof session — it takes about 5 minutes and gives you a
            structured readout you can include in your report.
          </p>
          <div className="button-row" style={{ marginTop: "12px" }}>
            <Link className="button-primary" href={`/student/proof-sessions/start/${career.slug}`}>
              Start proof session
            </Link>
            <Link className="button-secondary" href={`/student/careers/${career.slug}`}>
              Open career detail
            </Link>
            <Link className="button-ghost" href="/student/recommendations">
              Back to all matches
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
