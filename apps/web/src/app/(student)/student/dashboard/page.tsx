import Link from "next/link";

import { AppPage, Hero, MetricCard, SurfaceCard } from "@/components/page-chrome";
import { JourneyStepper } from "@/components/journey-stepper";
import { getLatestRecommendations, getLatestStudentReport, getProofSessions, getStudentProfile } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  const [profileResponse, recsResponse, proofResponse, reportResponse] = await Promise.all([
    getStudentProfile(cookieHeader),
    getLatestRecommendations(cookieHeader),
    getProofSessions(cookieHeader),
    getLatestStudentReport(cookieHeader)
  ]);

  const profile = profileResponse.profile;
  const snapshot = recsResponse.snapshot;
  const proofSessions = proofResponse.sessions;
  const assessment = profile?.cachedAssessmentResult ?? null;

  const hasProfile = profile !== null;
  const isDraft = profile?.completionStatus === "draft";
  const isSubmitted = profile?.completionStatus === "submitted";
  const hasRecommendations = snapshot !== null && snapshot.items.length > 0;
  const completedProofs = proofSessions.filter((s) => s.status === "completed");
  const topMatch = hasRecommendations ? snapshot.items[0] : null;
  const profileStepStatus: "missing" | "draft" | "submitted" = !hasProfile
    ? "missing"
    : isSubmitted
    ? "submitted"
    : "draft";
  const reportReady = reportResponse.report?.status === "ready" && !!reportResponse.report.report;

  const subtitleText = !hasProfile
    ? "Start by building your profile to unlock personalized career recommendations."
    : isDraft
    ? "Your profile is in progress. Submit it to unlock AI-powered career matches."
    : !hasRecommendations
    ? "Your profile is ready. Generate recommendations to see your career matches."
    : "Here is your career discovery overview based on your latest profile.";

  return (
    <AppPage>
      <Hero
        eyebrow="Student workspace"
        title={`Welcome back, ${session.user.fullName.split(" ")[0]}`}
        subtitle={<p style={{ margin: 0 }}>{subtitleText}</p>}
      />

      <div className="section-stack">
        <JourneyStepper
          profileStatus={profileStepStatus}
          recsCount={snapshot?.items.length ?? 0}
          proofsCompleted={completedProofs.length}
          reportReady={reportReady}
        />

        {(!hasProfile || isDraft) && (
          <SurfaceCard strong>
            <div className="banner-cta">
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 6 }}>
                  {!hasProfile ? "Create your profile" : "Finish your profile"}
                </h2>
                <p className="muted-text" style={{ margin: 0 }}>
                  {!hasProfile
                    ? "Your profile powers everything — recommendations, proof sessions, and your durable report."
                    : "Your profile is saved as a draft. Submit it to unlock AI-powered career recommendations."}
                </p>
              </div>
              <Link className="button-primary" href="/student/profile">
                {!hasProfile ? "Start profile" : "Continue profile"}
              </Link>
            </div>
          </SurfaceCard>
        )}

        {isSubmitted && (
          <div className="panel-grid panel-grid--metrics">
            <MetricCard label="Readiness band" value={assessment?.readinessBand ?? "Pending"} />
            <MetricCard
              label="Top career match"
              value={topMatch ? truncate(topMatch.career.title, 28) : "—"}
            />
            <MetricCard label="Proof sessions" value={String(completedProofs.length)} />
          </div>
        )}

        {hasRecommendations && (
          <>
            <div className="section-heading-row">
              <h2 style={{ margin: 0 }}>Your top career matches</h2>
              <Link className="button-ghost" href="/student/recommendations">
                View all matches
              </Link>
            </div>
            <div className="panel-grid panel-grid--cards">
              {snapshot.items.slice(0, 3).map((item) => (
                <SurfaceCard key={item.career.id}>
                  <div className="rec-card-header">
                    <span className={`fit-badge fit-badge--${item.fitLabel}`}>
                      {item.fitLabel} fit · {item.fitScore}
                    </span>
                    <span className="muted-text" style={{ fontSize: 13 }}>
                      #{item.rank}
                    </span>
                  </div>
                  <h3 style={{ margin: "12px 0 4px", fontSize: "1.35rem" }}>{item.career.title}</h3>
                  <p className="muted-text" style={{ fontSize: 13, margin: 0 }}>
                    {item.career.category.name}
                  </p>
                  <p className="muted-text" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
                    {item.explanation}
                  </p>
                  {item.reasons.length > 0 && (
                    <ul className="rec-card-reasons">
                      {item.reasons.slice(0, 2).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  <p style={{ marginTop: 14, marginBottom: 0, fontSize: 14 }}>
                    <Link href={`/student/careers/${item.career.slug}`}>Explore career →</Link>
                  </p>
                </SurfaceCard>
              ))}
            </div>
          </>
        )}

        {isSubmitted && !hasRecommendations && (
          <SurfaceCard title="Recommendations not generated yet">
            <p className="muted-text" style={{ margin: 0 }}>
              Your profile is submitted. Generate your first career match snapshot to see ranked matches with
              evidence from your profile.
            </p>
            <p style={{ marginTop: 14, marginBottom: 0 }}>
              <Link className="button-primary" href="/student/recommendations">
                Generate recommendations
              </Link>
            </p>
          </SurfaceCard>
        )}

        {assessment && (
          <SurfaceCard title="Your character profile snapshot">
            <p className="muted-text" style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
              {assessment.narrative}
            </p>
            <div className="strengths-risks-grid">
              <div>
                <h3 className="strengths-risks-heading strengths-risks-heading--success">Strengths</h3>
                {assessment.strengths.length > 0 ? (
                  <ul className="content-list">
                    {assessment.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text" style={{ margin: 0 }}>No strengths identified yet.</p>
                )}
              </div>
              <div>
                <h3 className="strengths-risks-heading strengths-risks-heading--caution">Areas to watch</h3>
                {assessment.risks.length > 0 ? (
                  <ul className="content-list">
                    {assessment.risks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text" style={{ margin: 0 }}>No areas flagged yet.</p>
                )}
              </div>
            </div>
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 14 }}>
              <Link href="/student/profile">View full character profile →</Link>
            </p>
          </SurfaceCard>
        )}

        {profile && (profile.favoriteSubjects.length > 0 || profile.topicsCuriousAbout.length > 0) && (
          <SurfaceCard title="Captured profile signals">
            <p className="muted-text" style={{ margin: "0 0 14px" }}>
              These are the signals driving your recommendations. Update your profile to refine them.
            </p>
            <div className="signal-grid">
              {profile.favoriteSubjects.length > 0 && (
                <SignalGroup label="Favorite subjects" items={profile.favoriteSubjects} />
              )}
              {profile.favoriteActivities.length > 0 && (
                <SignalGroup label="Favorite activities" items={profile.favoriteActivities} />
              )}
              {profile.topicsCuriousAbout.length > 0 && (
                <SignalGroup label="Curious about" items={profile.topicsCuriousAbout} />
              )}
              {profile.personalStrengths.length > 0 && (
                <SignalGroup label="Personal strengths" items={profile.personalStrengths} />
              )}
            </div>
          </SurfaceCard>
        )}
      </div>
    </AppPage>
  );
}

function SignalGroup({ label, items }: { label: string; items: string[] }): JSX.Element {
  return (
    <div className="signal-group">
      <p className="signal-group__label">{label}</p>
      <div className="signal-group__chips">
        {items.map((item) => (
          <span key={item} className="signal-chip">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1)}…`;
}
