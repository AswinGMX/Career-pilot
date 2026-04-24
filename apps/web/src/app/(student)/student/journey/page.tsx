import Link from "next/link";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { JourneyStepper } from "@/components/journey-stepper";
import {
  getLatestRecommendations,
  getLatestStudentReport,
  getProofSessions,
  getStudentProfile
} from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JourneyPage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  const [profileRes, recsRes, proofRes, reportRes] = await Promise.all([
    getStudentProfile(cookieHeader),
    getLatestRecommendations(cookieHeader),
    getProofSessions(cookieHeader),
    getLatestStudentReport(cookieHeader)
  ]);

  const profile = profileRes.profile;
  const snapshot = recsRes.snapshot;
  const sessions = proofRes.sessions;
  const report = reportRes.report;

  const profileStatus: "missing" | "draft" | "submitted" = !profile
    ? "missing"
    : profile.completionStatus === "submitted"
    ? "submitted"
    : "draft";
  const recsCount = snapshot?.items.length ?? 0;
  const completedProofs = sessions.filter((s) => s.status === "completed");
  const reportReady = report?.status === "ready" && !!report.report;

  const topMatch = snapshot?.items[0];
  const latestProof = completedProofs[0];

  return (
    <AppPage>
      <Hero
        eyebrow="Your journey"
        title={`Hi ${session.user.fullName.split(" ")[0]}, here's the whole arc`}
        subtitle={
          <p style={{ margin: 0 }}>
            Four milestones from profile to a shareable report. Each one unlocks the next — pick up wherever you
            left off.
          </p>
        }
      />

      <div className="section-stack">
        <JourneyStepper
          profileStatus={profileStatus}
          recsCount={recsCount}
          proofsCompleted={completedProofs.length}
          reportReady={reportReady}
        />

        <SurfaceCard title="1. Profile">
          <p className="muted-text" style={{ marginTop: 0 }}>
            Your profile captures the signals everything else is built on: favourite subjects, activities, curiosity
            topics, strengths, and things you want to avoid.
          </p>
          <p className="muted-text" style={{ margin: 0 }}>
            Status:{" "}
            <strong>
              {profileStatus === "submitted" ? "Submitted" : profileStatus === "draft" ? "Draft — needs submission" : "Not started"}
            </strong>
          </p>
          <p style={{ marginTop: "12px", marginBottom: 0 }}>
            <Link className="button-primary" href="/student/profile">
              {profileStatus === "submitted" ? "Review or edit profile" : "Continue profile"}
            </Link>
          </p>
        </SurfaceCard>

        <SurfaceCard title="2. Recommendations">
          {recsCount > 0 && topMatch ? (
            <>
              <p className="muted-text" style={{ marginTop: 0 }}>
                <strong>{recsCount}</strong> career {recsCount === 1 ? "match" : "matches"} in your latest snapshot.
                Top match: <strong>{topMatch.career.title}</strong> ·{" "}
                <span className={`fit-badge fit-badge--${topMatch.fitLabel}`}>
                  {topMatch.fitLabel} fit · {topMatch.fitScore}
                </span>
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                <Link className="button-primary" href="/student/recommendations">
                  View all matches
                </Link>{" "}
                <Link className="button-secondary" href={`/student/recommendations/${topMatch.career.slug}`} style={{ marginLeft: 8 }}>
                  Explore top match
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="muted-text" style={{ marginTop: 0, marginBottom: 0 }}>
                No snapshot yet. Submit your profile, then recompute recommendations.
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                <Link className="button-primary" href="/student/recommendations">
                  Generate recommendations
                </Link>
              </p>
            </>
          )}
        </SurfaceCard>

        <SurfaceCard title="3. Proof sessions">
          {completedProofs.length > 0 && latestProof ? (
            <>
              <p className="muted-text" style={{ marginTop: 0 }}>
                <strong>{completedProofs.length}</strong> session{completedProofs.length === 1 ? "" : "s"}{" "}
                completed. Most recent: <strong>{latestProof.career.title}</strong>
                {latestProof.result?.readinessBand ? ` · ${latestProof.result.readinessBand}` : ""}
                {latestProof.result?.overallScore ? ` (${latestProof.result.overallScore}%)` : ""}
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                <Link className="button-primary" href="/student/proof-sessions">
                  View all sessions
                </Link>
                {topMatch ? (
                  <Link
                    className="button-secondary"
                    href={`/student/proof-sessions/start/${topMatch.career.slug}`}
                    style={{ marginLeft: 8 }}
                  >
                    Start another
                  </Link>
                ) : null}
              </p>
            </>
          ) : (
            <>
              <p className="muted-text" style={{ marginTop: 0, marginBottom: 0 }}>
                {recsCount > 0
                  ? "Pick a recommended career and take a 5-minute scenario-based session to show real readiness."
                  : "Generate recommendations first, then start a proof session from any recommended career."}
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                {topMatch ? (
                  <Link className="button-primary" href={`/student/proof-sessions/start/${topMatch.career.slug}`}>
                    Start with your top match
                  </Link>
                ) : (
                  <Link className="button-primary" href="/student/careers">
                    Browse careers
                  </Link>
                )}
              </p>
            </>
          )}
        </SurfaceCard>

        <SurfaceCard title="4. Report">
          {reportReady ? (
            <>
              <p className="muted-text" style={{ marginTop: 0 }}>
                Your durable report is ready. You can preview what a parent will see, or create a share link.
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                <Link className="button-primary" href="/student/report">
                  Open report
                </Link>
                <Link className="button-secondary" href="/student/report/preview" style={{ marginLeft: 8 }}>
                  Preview parent view
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="muted-text" style={{ marginTop: 0, marginBottom: 0 }}>
                {completedProofs.length > 0
                  ? "Generate a fresh report that summarizes your profile, recommendations, and proof evidence."
                  : "Complete at least one proof session, then generate your durable report."}
              </p>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                <Link className="button-primary" href="/student/report">
                  Go to report
                </Link>
              </p>
            </>
          )}
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
