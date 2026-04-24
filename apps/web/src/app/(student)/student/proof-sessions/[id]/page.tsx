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

            <CareerHelpSection
              categoryName={session.career.name}
              careerTitle={session.career.title}
              overallScore={session.result.overallScore}
            />

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

function CareerHelpSection({
  categoryName,
  careerTitle,
  overallScore
}: {
  categoryName: string;
  careerTitle: string;
  overallScore: number;
}): JSX.Element {
  const isTechnology = categoryName.trim().toLowerCase() === "technology";
  const isMentorPath = !isTechnology;
  const isBelowPar = overallScore < 65;

  const headline = isMentorPath
    ? isBelowPar
      ? `Next step: rebuild your ${careerTitle} path with mentor guidance`
      : `Next step: move forward in ${careerTitle} with an in-person mentor`
    : isBelowPar
      ? `We can strengthen your path toward ${careerTitle}`
      : `Next step: turn your ${careerTitle} momentum into placements`;

  const summary = isMentorPath
    ? isBelowPar
      ? "This path needs real-world guidance first. Work with a mentor, build discipline in live settings, and then return with stronger proof."
      : "This path grows faster through in-person guidance, field exposure, and someone experienced helping you take the next right step."
    : isBelowPar
      ? "This is the support layer. Start by building stronger real-world signals, then come back with better proof."
      : "This is the acceleration layer. Build verified signals and sharper visibility before targeting top companies.";

  return (
    <article className="career-help-card">
      <p className="career-help-card__eyebrow">Career help</p>
      <h2 className="career-help-card__title">{headline}</h2>
      <p className="career-help-card__summary">{summary}</p>
      <div className="career-help-card__pills">
        <span className={`career-help-pill ${isBelowPar ? "career-help-pill--danger" : "career-help-pill--success"}`}>
          {isBelowPar ? "Keep building" : "Current score"} · {overallScore}%
        </span>
        <span className="career-help-pill">{isMentorPath ? "Mentor pathway unlocked" : "Technology pathway unlocked"}</span>
      </div>

      {isMentorPath ? (
        <div className="career-help-grid">
          <article className="career-help-partner career-help-partner--mentor">
            <div className="career-help-mark career-help-mark--mentor">M</div>
            <strong>In-person mentor</strong>
            <span>
              {isBelowPar
                ? `You need a mentor who can guide your next ${careerTitle} step in a realistic environment.`
                : `The best next move is an in-person mentor who can guide your growth in ${careerTitle}.`}
            </span>
          </article>
          <article className="career-help-partner career-help-partner--mentor">
            <div className="career-help-mark career-help-mark--field">R</div>
            <strong>Real-world exposure</strong>
            <span>
              {isBelowPar
                ? "Shadow the role, observe the work reality, and build readiness before the next proof attempt."
                : "Use shadowing, live observation, and guided practice to convert readiness into consistent action."}
            </span>
          </article>
        </div>
      ) : (
        <div className="career-help-grid">
          <a className="career-help-partner" href="https://digri.ai/" rel="noreferrer" target="_blank">
            <img
              alt="Digri"
              className="career-help-partner__image"
              src="https://digri.ai/wp-content/uploads/2023/08/digri-favicon-1.png"
            />
            <strong>Digri</strong>
            <span>
              {isBelowPar ? "Upskill your technology foundation." : "Level up and stay sharp for technology roles."}
            </span>
          </a>
          <a className="career-help-partner" href="https://www.veril.ai/" rel="noreferrer" target="_blank">
            <img alt="Veril AI" className="career-help-partner__image" src="https://www.veril.ai/logo.png" />
            <strong>Veril AI</strong>
            <span>
              {isBelowPar
                ? "Verify skills and strengthen resume proof."
                : "Show verified skill proof before placement outreach."}
            </span>
          </a>
        </div>
      )}
    </article>
  );
}
