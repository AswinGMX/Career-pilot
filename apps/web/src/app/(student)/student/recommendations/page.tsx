import Link from "next/link";

import { getLatestRecommendations } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { RecomputeRecommendationsButton } from "./RecomputeRecommendationsButton";

export const dynamic = "force-dynamic";

export default async function StudentRecommendationsPage(): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();
  const response = await getLatestRecommendations(cookieHeader);
  const snapshot = response.snapshot;

  return (
    <AppPage>
      <Hero
        eyebrow="Student recommendations"
        title="Career matches with evidence"
        subtitle={<p style={{ margin: 0 }}>Review the latest ranked snapshot derived from your submitted profile.</p>}
      />

      <div className="section-stack">
        <SurfaceCard>
        <RecomputeRecommendationsButton />
        <p className="muted-text" style={{ margin: 0 }}>
          This uses deterministic scoring so the match logic remains inspectable and versioned.
        </p>
        </SurfaceCard>

      {!snapshot ? (
        <SurfaceCard title="No recommendation snapshot yet">
          <p className="muted-text">
            Submit the profile first, then recompute recommendations to persist the first ranked snapshot.
          </p>
          <Link href="/student/profile">Go to profile</Link>
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
                <p className="muted-text" style={{ margin: "10px 0 0", lineHeight: 1.65 }}>{item.explanation}</p>

                {item.reasons.length > 0 ? (
                  <section style={{ marginTop: "14px" }}>
                    <h3 style={{ marginBottom: "8px", fontSize: "0.95rem" }}>Why this fits</h3>
                    <ul className="content-list" style={{ fontSize: 14 }}>
                      {item.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {item.evidenceInputs.length > 0 ? (
                  <section style={{ marginTop: "12px" }}>
                    <h3 style={{ marginBottom: "6px", fontSize: "0.95rem" }}>Evidence</h3>
                    <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
                      {item.evidenceInputs.join(", ")}
                    </p>
                  </section>
                ) : null}

                <div className="button-row" style={{ marginTop: "16px" }}>
                  <Link className="button-primary" href={`/student/proof-sessions/start/${item.career.slug}`}>
                    Start proof session
                  </Link>
                  <Link className="button-secondary" href={`/student/recommendations/${item.career.slug}`}>
                    Full match detail
                  </Link>
                </div>
                <p style={{ marginTop: "10px", marginBottom: 0, fontSize: 13 }}>
                  <Link href={`/student/careers/${item.career.slug}`}>Open career detail →</Link>
                </p>
              </SurfaceCard>
            ))}
          </div>
        </>
      )}
      </div>
    </AppPage>
  );
}
