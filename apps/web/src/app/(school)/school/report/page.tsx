import { notFound } from "next/navigation";

import { getLatestSchoolReport } from "@/lib/api";
import { AppPage, Hero, MetricCard, SurfaceCard } from "@/components/page-chrome";
import { requireSchoolAdmin } from "@/lib/session";

import { GenerateSchoolReportButton } from "./GenerateSchoolReportButton";

export const dynamic = "force-dynamic";

export default async function SchoolReportPage(): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();
  const tenantId = session.activeMembership?.tenant.id;

  if (!tenantId) {
    notFound();
  }

  const response = await getLatestSchoolReport(tenantId);
  const report = response?.report || null;

  return (
    <AppPage>
      <Hero
        eyebrow="School report"
        title="School readiness snapshot"
        subtitle={
          <p style={{ margin: 0 }}>
            Aggregates student progress, recommendation coverage, and proof readiness into one exportable snapshot.
          </p>
        }
      />

      <div className="section-stack">
        <SurfaceCard title="Generate and export">
          <p className="muted-text" style={{ marginTop: 0 }}>
            Generate a fresh school report after onboarding or recommendation activity changes.
          </p>
          <GenerateSchoolReportButton tenantId={tenantId} />
          {report ? (
            <p className="muted-text" style={{ marginBottom: 0, marginTop: "12px" }}>
              Status: {report.status} &bull; Version: {report.version} &bull; Export: {report.fileUrl || "Not prepared"}
            </p>
          ) : (
            <p className="muted-text" style={{ marginBottom: 0 }}>No school report has been generated yet.</p>
          )}
        </SurfaceCard>

        {report?.report ? (
          <>
            <div className="panel-grid panel-grid--metrics">
              <MetricCard label="Students" value={String(report.report.totals.students)} />
              <MetricCard label="Profiles Submitted" value={String(report.report.totals.profilesSubmitted)} />
              <MetricCard label="Recommendations Ready" value={String(report.report.totals.recommendationsReady)} />
              <MetricCard label="Proof Sessions" value={String(report.report.totals.proofSessionsCompleted)} />
            </div>

            <SurfaceCard title="Readiness bands">
              {Object.keys(report.report.readinessBandBreakdown).length ? (
                <ul className="content-list">
                  {Object.entries(report.report.readinessBandBreakdown).map(([band, count]) => (
                    <li key={band}>
                      {band}: {count}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text" style={{ margin: 0 }}>No proof results have been captured yet.</p>
              )}
            </SurfaceCard>

            <SurfaceCard title="Top career interests">
              {report.report.topCareerTitles.length ? (
                <ul className="content-list">
                  {report.report.topCareerTitles.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text" style={{ margin: 0 }}>No recommendation leaders yet.</p>
              )}
            </SurfaceCard>

            <SurfaceCard title="Students needing attention">
              {report.report.studentsNeedingAttention.length ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  {report.report.studentsNeedingAttention.map((student) => (
                    <article
                      key={student.id}
                      style={{ border: "1px solid #e2e6ec", borderRadius: "12px", padding: "14px" }}
                    >
                      <p style={{ margin: 0, fontWeight: 600 }}>{student.fullName}</p>
                      <p className="muted-text" style={{ margin: "8px 0 0" }}>{student.reason}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-text" style={{ margin: 0 }}>No students are currently flagged for attention.</p>
              )}
            </SurfaceCard>
          </>
        ) : null}
      </div>
    </AppPage>
  );
}
