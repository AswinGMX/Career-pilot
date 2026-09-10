import Link from "next/link";

import { getSchoolStudents } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import {
  BarList,
  Donut,
  Funnel,
  StatTile,
  bandRank,
  type StackSegment
} from "@/components/charts";
import { getServerSessionCookieHeader, requireSchoolAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SchoolDashboardPage(): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();
  const tenantId = session.activeMembership?.tenant.id || "";
  const roster = tenantId ? await getSchoolStudents(tenantId, undefined, getServerSessionCookieHeader()) : null;
  const students = roster?.students || [];

  const total = students.length;
  const profilesSubmitted = students.filter((student) => student.profileCompletionStatus === "submitted").length;
  const recommendationsReady = students.filter((student) => student.recommendationStatus === "ready").length;
  const proofStudents = students.filter((student) => student.completedProofSessions > 0).length;
  const proofSessionsTotal = students.reduce((sum, student) => sum + student.completedProofSessions, 0);

  const activationRate = total > 0 ? Math.round((profilesSubmitted / total) * 100) : 0;

  // Readiness band mix across students with a latest proof result (ordinal segments).
  const bandCounts = new Map<string, number>();
  for (const student of students) {
    const band = student.latestProofReadinessBand;
    if (band) {
      bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
    }
  }
  const bandSegments: StackSegment[] = Array.from(bandCounts.entries())
    .map(([label, value]) => ({ label, value, step: bandRank(label) }))
    .sort((left, right) => right.step - left.step);
  const bandTotal = bandSegments.reduce((sum, segment) => sum + segment.value, 0);

  // Most common top-recommendation careers across the cohort.
  const careerCounts = new Map<string, number>();
  for (const student of students) {
    const title = student.topRecommendationTitle;
    if (title) {
      careerCounts.set(title, (careerCounts.get(title) ?? 0) + 1);
    }
  }
  const topCareers = Array.from(careerCounts.entries())
    .map(([label, value]) => ({ label, value, valueLabel: String(value) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  return (
    <AppPage>
      <Hero
        eyebrow="School admin"
        title={session.activeMembership?.tenant.name || "School dashboard"}
        subtitle={<p style={{ margin: 0 }}>Track onboarding, readiness, and proof completion across your student cohort from one place.</p>}
        actions={
          <>
            <Link className="button-primary" href="/school/students">
              Open roster
            </Link>
            <Link className="button-secondary" href="/school/report">
              View school report
            </Link>
          </>
        }
      />
      <div className="section-stack">
        <div className="panel-grid panel-grid--metrics">
          <StatTile label="Students" value={total} icon="users" caption="on the roster" />
          <StatTile
            label="Profiles submitted"
            value={profilesSubmitted}
            unit={total > 0 ? `/${total}` : undefined}
            icon="doc"
            caption={`${activationRate}% activation`}
            meter={{ value: profilesSubmitted, max: Math.max(total, 1) }}
          />
          <StatTile
            label="Recommendations ready"
            value={recommendationsReady}
            icon="target"
            caption={total > 0 ? `${Math.round((recommendationsReady / total) * 100)}% of cohort` : "no students yet"}
            meter={{ value: recommendationsReady, max: Math.max(total, 1) }}
            tone="neutral"
          />
          <StatTile
            label="Proof sessions"
            value={proofSessionsTotal}
            icon="check"
            caption={`${proofStudents} student${proofStudents === 1 ? "" : "s"} active`}
            tone="success"
          />
        </div>

        {total === 0 ? (
          <SurfaceCard title="No students yet">
            <p className="muted-text" style={{ margin: 0 }}>
              Add students to your roster to see cohort readiness, the discovery funnel, and top career matches here.
            </p>
            <p style={{ marginTop: 14, marginBottom: 0 }}>
              <Link className="button-primary" href="/school/students">
                Add students
              </Link>
            </p>
          </SurfaceCard>
        ) : (
          <>
            <div className="viz-bento">
              <div className="viz-col-7">
                <SurfaceCard>
                  <p className="viz-card-title">Discovery funnel</p>
                  <p className="viz-card-sub">How far your cohort has progressed through career discovery.</p>
                  <Funnel
                    ariaLabel="Career discovery funnel across the cohort"
                    stages={[
                      { label: "Students enrolled", value: total },
                      { label: "Profiles submitted", value: profilesSubmitted },
                      { label: "Recommendations ready", value: recommendationsReady },
                      { label: "Completed a proof session", value: proofStudents }
                    ]}
                  />
                </SurfaceCard>
              </div>

              <div className="viz-col-5">
                <SurfaceCard>
                  <p className="viz-card-title">Readiness band mix</p>
                  <p className="viz-card-sub">
                    Latest proof readiness across {bandTotal} assessed student{bandTotal === 1 ? "" : "s"}.
                  </p>
                  {bandSegments.length > 0 ? (
                    <Donut
                      ariaLabel="Readiness band distribution"
                      segments={bandSegments}
                      centerValue={bandTotal}
                      centerCaption="assessed"
                    />
                  ) : (
                    <p className="muted-text" style={{ margin: 0 }}>
                      No proof results yet. Bands appear once students complete proof sessions.
                    </p>
                  )}
                </SurfaceCard>
              </div>
            </div>

            {topCareers.length > 0 && (
              <SurfaceCard title="Most common top career matches">
                <p className="muted-text" style={{ margin: "0 0 16px" }}>
                  The careers ranked first for the most students in your cohort.
                </p>
                <BarList ariaLabel="Most common top career matches across the cohort" items={topCareers} />
              </SurfaceCard>
            )}
          </>
        )}
      </div>
    </AppPage>
  );
}
