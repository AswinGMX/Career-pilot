import Link from "next/link";

import { getLatestRecommendations } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { RecomputeRecommendationsButton } from "@/components/recompute-recommendations-button";

export const dynamic = "force-dynamic";

export default async function StudentRecommendationsPage(): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();
  const response = await getLatestRecommendations(cookieHeader);
  const snapshot = response.snapshot;

  return (
    <AppPage>
      <p className="pathfinder-back" style={{ marginBottom: '1rem' }}>
        <Link href="/student/pathfinder">← Pathfinder</Link>
      </p>
      <Hero
        eyebrow="Student recommendations"
        title="Career matches with evidence"
        subtitle={<p style={{ margin: 0 }}>Review the latest ranked snapshot derived from your submitted profile.</p>}
      />

      <div className="section-stack">
        {!snapshot ? (
          <SurfaceCard title="No recommendation snapshot yet">
            <p className="muted-text">
              Submit the profile first, then recompute recommendations to persist the first ranked snapshot.
            </p>
            <p style={{ margin: "12px 0" }}>
              <Link href="/student/profile">Go to profile</Link>
            </p>
            <RecomputeRecommendationsButton />
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard>
              <p className="muted-text" style={{ margin: 0 }}>
                Snapshot created {new Date(snapshot.createdAt).toLocaleString()} using `{snapshot.engineVersion}` and
                profile version count `{snapshot.profileVersionCount}`.
              </p>
              <p className="muted-text" style={{ margin: "12px 0 0" }}>
                Input summary: {snapshot.inputSummary.join(", ") || "No captured summary"}
              </p>
              <div style={{ marginTop: "16px" }}>
                <RecomputeRecommendationsButton />
              </div>
            </SurfaceCard>

            <div className="panel-grid panel-grid--cards">
              {snapshot.items.map((item) => (
                <SurfaceCard key={item.career.id}>
                  <div className="match-badge-row">
                    <span className={`fit-badge fit-badge--${item.fitLabel}`}>
                      Rank #{item.rank} · {item.fitLabel} fit · {item.fitScore}
                    </span>
                  </div>
                  <h2 style={{ margin: "10px 0 4px", fontSize: "1.6rem", lineHeight: 1.15 }}>{item.career.title}</h2>
                  <p className="muted-text" style={{ fontSize: 13, margin: 0 }}>{item.career.category.name}</p>

                  <div className="button-row" style={{ marginTop: "16px", justifyContent: 'space-between' }}>
                    <Link className="button-primary" href={`/student/proof-sessions/start/${item.career.slug}`}>
                      Start proof session
                    </Link>
                    <p style={{ marginTop: "10px", marginBottom: 0, fontSize: 13 }}>
                      <Link href={`/student/careers/${item.career.slug}`}>Open career detail →</Link>
                    </p>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </>
        )}
      </div>
    </AppPage>
  );
}
