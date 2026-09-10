import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getLatestStudentReport, getProofSession, getProofSessions } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";
import type { ProofSessionRecord } from "@career-pilot/types";

import { ProofSessionForm } from "./ProofSessionForm";

export const dynamic = "force-dynamic";

export default async function ProofSessionDetailPage({ params }: { params: { id: string } }): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();
  const [response, reportResponse, sessionsResponse] = await Promise.all([
    getProofSession(params.id, cookieHeader),
    getLatestStudentReport(cookieHeader),
    getProofSessions(cookieHeader)
  ]);

  if (!response) {
    notFound();
  }

  const session = response.session;
  const reportReady = reportResponse.report?.status === "ready" && !!reportResponse.report.report;
  const attempts = sessionsResponse.sessions
    .filter((s) => s.career.id === session.career.id)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <AppPage>
      <Hero
        eyebrow="Proof session"
        title={session.career.title}
        subtitle={<p style={{ margin: 0 }}>{session.questionSet.introduction}</p>}
        actions={
          <Link className="button-secondary" href="/student/proof-sessions">
            Back to proof sessions
          </Link>
        }
      />

      <div className="section-stack">
        {attempts.length > 1 ? <AttemptSwitcher attempts={attempts} currentId={session.id} /> : null}
        {session.result ? (
          <>
            <SurfaceCard>
              <p className="app-eyebrow">
                {session.result.source} • {session.result.readinessBand}
              </p>
              <h2 style={{ margin: "10px 0 8px", fontSize: "2rem", lineHeight: 1.1 }}>
                {session.result.overallScore}% readiness
              </h2>
              <p className="muted-text" style={{ margin: 0, lineHeight: 1.7 }}>
                {session.result.narrative}
              </p>
            </SurfaceCard>

            <div className="panel-grid panel-grid--cards">
              <SurfaceCard title="Strengths">
                <ul className="content-list">
                  {session.result.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCard>
              <SurfaceCard title="Risks">
                <ul className="content-list">
                  {session.result.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCard>
              <SurfaceCard title="Next steps">
                <ul className="content-list">
                  {session.result.nextSteps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCard>
            </div>

            <article className="next-step-banner">
              <div className="next-step-banner__text">
                <h3 className="next-step-banner__title">
                  {reportReady ? "Your readiness report is ready" : "Ready to generate your readiness report?"}
                </h3>
                <p className="next-step-banner__subtitle">
                  {reportReady
                    ? "Share it with a parent or revisit the narrative when you need it."
                    : "Your report pulls together profile, recommendations, and proof evidence into one shareable snapshot."}
                </p>
              </div>
              <div className="next-step-banner__actions">
                {reportReady ? (
                  <>
                    <Link className="button-primary" href="/student/report">
                      View report
                    </Link>
                    <Link className="button-secondary" href="/student/report/preview">
                      Preview parent view
                    </Link>
                  </>
                ) : (
                  <Link className="button-primary" href="/student/report">
                    Generate report
                  </Link>
                )}
              </div>
            </article>

            <SurfaceCard title="Dimension scores">
              <DimensionScores scores={session.result.dimensionScores} />
            </SurfaceCard>
          </>
        ) : (
          <ProofSessionForm session={session} />
        )}
      </div>
    </AppPage>
  );
}

function AttemptSwitcher({ attempts, currentId }: { attempts: ProofSessionRecord[]; currentId: string }): JSX.Element {
  return (
    <nav className="attempt-switcher" aria-label="Switch between attempts">
      <span className="attempt-switcher__label">Attempts for this career</span>
      <div className="attempt-switcher__chips">
        {attempts.map((attempt, idx) => {
          const isActive = attempt.id === currentId;
          const status = attempt.result
            ? `${attempt.result.overallScore}% • ${attempt.result.readinessBand}`
            : "In progress";
          const content = (
            <>
              <span className="attempt-chip__label">Attempt {idx + 1}</span>
              <span className="attempt-chip__status">{status}</span>
            </>
          );
          if (isActive) {
            return (
              <span key={attempt.id} className="attempt-chip attempt-chip--active" aria-current="page">
                {content}
              </span>
            );
          }
          return (
            <Link key={attempt.id} className="attempt-chip" href={`/student/proof-sessions/${attempt.id}`}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DimensionScores({ scores }: { scores: Record<string, number> }): JSX.Element {
  const entries = Object.entries(scores);

  if (entries.length === 0) {
    return <p className="muted-text" style={{ margin: 0 }}>No dimension scores available.</p>;
  }

  return (
    <div className="dimension-grid">
      {entries.map(([dimension, score]) => {
        const pct = Math.max(0, Math.min(100, score));
        const tone = pct >= 80 ? "strong" : pct >= 60 ? "steady" : "emerging";
        return (
          <div key={dimension} className="dimension-row">
            <div className="dimension-row__head">
              <span className="dimension-row__label">{dimension}</span>
              <span className={`dimension-row__value dimension-row__value--${tone}`}>{score}</span>
            </div>
            <div className="dimension-row__track">
              <div className={`dimension-row__fill dimension-row__fill--${tone}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}