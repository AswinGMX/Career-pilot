import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getCareerBySlug, getLatestRecommendations, getProofSessions } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { BeginProofSessionButton } from "./BeginProofSessionButton";

export const dynamic = "force-dynamic";

const DEFAULT_DIMENSIONS = [
  "Discipline",
  "Independence",
  "Pressure tolerance",
  "Adaptability",
  "Communication",
  "Service mindset",
  "Ethics",
  "Resilience"
];

export default async function StartProofSessionPage({
  params
}: {
  params: { careerSlug: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  const [careerResponse, proofResponse, recsResponse] = await Promise.all([
    getCareerBySlug(params.careerSlug),
    getProofSessions(cookieHeader),
    getLatestRecommendations(cookieHeader)
  ]);

  if (!careerResponse) {
    notFound();
  }

  const career = careerResponse.career;
  const previousSession = proofResponse.sessions.find(
    (session) => session.career.slug === params.careerSlug && session.status === "completed"
  );
  const matchItem = recsResponse.snapshot?.items.find((item) => item.career.slug === params.careerSlug);

  return (
    <AppPage>
      <Hero
        eyebrow="Proof session"
        title={`Before you begin: ${career.title}`}
        subtitle={
          <p style={{ margin: 0 }}>
            Take a few quiet minutes to answer scenario questions. These aren't trivia — they test mindset,
            discipline, and readiness for the realities of this path.
          </p>
        }
      />

      <div className="section-stack">
        <SurfaceCard>
          <p className="app-eyebrow">{career.category.name}</p>
          <h2 style={{ margin: "10px 0 8px", fontSize: "1.5rem" }}>{career.title}</h2>
          <p className="muted-text" style={{ margin: 0, lineHeight: 1.7 }}>
            {career.summary}
          </p>
          {matchItem ? (
            <p style={{ marginTop: "14px", marginBottom: 0 }}>
              <span className={`fit-badge fit-badge--${matchItem.fitLabel}`}>
                Match #{matchItem.rank} · {matchItem.fitLabel} fit · {matchItem.fitScore}
              </span>
            </p>
          ) : null}
        </SurfaceCard>

        <SurfaceCard title="What this session tests">
          <p className="muted-text" style={{ marginTop: 0, marginBottom: "12px" }}>
            Around 8 scenario-based questions (about 5 minutes). You'll be asked about:
          </p>
          <div className="panel-grid panel-grid--metrics" style={{ gap: "10px" }}>
            {DEFAULT_DIMENSIONS.map((dimension) => (
              <span key={dimension} className="status-chip">
                {dimension}
              </span>
            ))}
          </div>
          <p className="muted-text" style={{ marginTop: "16px", marginBottom: 0, fontSize: 14 }}>
            Each question has four options ordered from least to most ready. Answer honestly — there are no trick
            questions.
          </p>
        </SurfaceCard>

        {previousSession ? (
          <SurfaceCard title="You've attempted this career before">
            <p className="muted-text" style={{ marginTop: 0 }}>
              A previous session for {career.title} is already completed
              {previousSession.result?.overallScore
                ? ` with a readiness score of ${previousSession.result.overallScore}%`
                : ""}
              . Starting a new session will create a fresh attempt and won't overwrite the earlier one.
            </p>
            <p style={{ marginTop: "12px", marginBottom: 0 }}>
              <Link href={`/student/proof-sessions/${previousSession.id}`}>View previous result →</Link>
            </p>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Ready to begin?</h2>
              <p className="muted-text" style={{ margin: "6px 0 0", fontSize: 14 }}>
                Clicking Begin creates a new proof session and opens the question form.
              </p>
            </div>
            <BeginProofSessionButton careerSlug={career.slug} />
          </div>
        </SurfaceCard>

        <div className="button-row">
          <Link className="button-secondary" href={`/student/careers/${career.slug}`}>
            Back to career
          </Link>
          <Link className="button-ghost" href="/student/proof-sessions">
            All proof sessions
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
