import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getSchoolStudentDetail } from "@/lib/api";
import { getServerSessionCookieHeader, requireSchoolAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SchoolStudentDetailPage({
  params
}: {
  params: { studentId: string };
}): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();
  const tenantId = session.activeMembership?.tenant.id;

  if (!tenantId) {
    notFound();
  }

  const response = await getSchoolStudentDetail(tenantId, params.studentId, getServerSessionCookieHeader());

  if (!response) {
    notFound();
  }

  const { report } = response;

  return (
    <AppPage>
      <Hero
        eyebrow="Student report"
        title={report.student.fullName}
        subtitle={<p style={{ margin: 0 }}>{report.student.email}</p>}
        actions={
          <Link className="button-secondary" href="/school/students">
            Back to roster
          </Link>
        }
      />

      <div className="section-stack">
        <SurfaceCard title="Profile status">
          <p className="muted-text" style={{ margin: 0 }}>
            {report.profile
              ? `${report.profile.completionStatus} • Grade ${report.profile.gradeLevel || "Unknown"} • Version count ${report.profile.versionCount}`
              : "No submitted profile yet"}
          </p>
        </SurfaceCard>

        <SurfaceCard title="Latest recommendation snapshot">
          {report.latestRecommendation ? (
            <>
              <p className="muted-text" style={{ margin: 0 }}>
                Engine: {report.latestRecommendation.engineVersion} • Profile versions:{" "}
                {report.latestRecommendation.profileVersionCount}
              </p>
              <ul className="content-list" style={{ marginTop: "12px" }}>
                {report.latestRecommendation.items.slice(0, 5).map((item) => (
                  <li key={item.career.id}>
                    {item.career.title} • {item.fitScore}% • {item.fitLabel}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>No recommendation snapshot yet.</p>
          )}
        </SurfaceCard>

        <SurfaceCard title="Completed proof sessions">
          {report.proofSessions.length ? (
            <div className="panel-grid panel-grid--cards">
              {report.proofSessions.map((session) => (
                <article
                  key={session.id}
                  style={{ border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "14px" }}
                >
                  <p className="app-eyebrow" style={{ margin: 0 }}>
                    {session.career.title} • {session.result?.readinessBand || "No result"}
                  </p>
                  <p className="muted-text" style={{ margin: "8px 0 0" }}>
                    {session.result?.schoolSummary || "No school summary available."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>No completed proof sessions yet.</p>
          )}
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
