import Link from "next/link";

import { getSchoolStudents } from "@/lib/api";
import { AppPage, Hero, MetricCard, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireSchoolAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SchoolDashboardPage(): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();
  const tenantId = session.activeMembership?.tenant.id || "";
  const roster = tenantId ? await getSchoolStudents(tenantId, undefined, getServerSessionCookieHeader()) : null;
  const students = roster?.students || [];
  const recommendationsReady = students.filter((student) => student.recommendationStatus === "ready").length;
  const proofCompleted = students.reduce((sum, student) => sum + student.completedProofSessions, 0);

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
          <MetricCard label="Students" value={String(students.length)} />
          <MetricCard label="Recommendations Ready" value={String(recommendationsReady)} />
          <MetricCard label="Completed Proof Sessions" value={String(proofCompleted)} />
        </div>
        <SurfaceCard title="Session debug">
          <pre className="debug-panel">{JSON.stringify(session, null, 2)}</pre>
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
