import Link from "next/link";

import { getLatestStudentReport } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { requireStudent } from "@/lib/session";

import { CreateParentShareButton, GenerateStudentReportButton, RevokeShareButton } from "./ReportActions";

export const dynamic = "force-dynamic";

export default async function StudentReportPage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const response = await getLatestStudentReport();
  const report = response.report;

  return (
    <AppPage>
      <Hero
        eyebrow="Student report"
        title="Career readiness report"
        subtitle={
          <p style={{ margin: 0 }}>
            Durable report snapshot for {session.user.fullName}. Generate a fresh report whenever profile,
            recommendation, or proof evidence changes.
          </p>
        }
      />

      <div className="section-stack">
        <SurfaceCard title="Generate and export">
          <p className="muted-text" style={{ marginTop: 0 }}>
            Reports are persisted server-side and a private export file is generated with each snapshot.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <GenerateStudentReportButton />
            {report?.status === "ready" ? <CreateParentShareButton /> : null}
          </div>
          {report ? (
            <p className="muted-text" style={{ marginBottom: 0, marginTop: "12px" }}>
              Status: {report.status} &bull; Version: {report.version} &bull; Export: {report.fileUrl || "Not prepared"}
            </p>
          ) : (
            <p className="muted-text" style={{ marginBottom: 0 }}>No report snapshot exists yet.</p>
          )}
        </SurfaceCard>

        {report?.report ? (
          <>
            <SurfaceCard title="Summary">
              <p className="muted-text" style={{ marginTop: 0 }}>
                Top recommendation: {report.report.topRecommendationTitle || "Not available"} &bull; Proof readiness:{" "}
                {report.report.proofReadinessBand || "Not available"} &bull; Confidence:{" "}
                {report.report.proofConfidenceScore ?? "Not available"}
              </p>
              <p className="muted-text" style={{ marginBottom: 0 }}>
                Profile status: {report.report.profileCompletionStatus || "missing"} &bull; Generated at:{" "}
                {new Date(report.report.generatedAt).toLocaleString()}
              </p>
            </SurfaceCard>

            <SurfaceCard title="Recommendation highlights">
              <ul className="content-list">
                {report.report.recommendationHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SurfaceCard>

            <SurfaceCard title="Parent summary">
              <p className="muted-text" style={{ margin: 0 }}>
                {report.report.parentSummary || "A parent summary will appear after a completed proof session."}
              </p>
            </SurfaceCard>

            <SurfaceCard title="Next steps">
              <ul className="content-list">
                {report.report.nextSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SurfaceCard>

            <SurfaceCard title="Active share links">
              {report.shares.length ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  {report.shares.map((share) => (
                    <article
                      key={share.id}
                      style={{ border: "1px solid #e2e6ec", borderRadius: "12px", padding: "14px" }}
                    >
                      <p className="muted-text" style={{ margin: 0 }}>
                        Expires {new Date(share.expiresAt).toLocaleString()} &bull; {share.isActive ? "Active" : "Inactive"}
                      </p>
                      <p style={{ margin: "8px 0", color: "#667085", fontSize: "14px" }}>
                        Public URL is only shown once at creation time for security.
                      </p>
                      {share.revokedAt ? (
                        <p className="muted-text" style={{ margin: 0 }}>
                          Revoked {new Date(share.revokedAt).toLocaleString()}
                        </p>
                      ) : (
                        <RevokeShareButton shareId={share.id} />
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-text" style={{ margin: 0 }}>No parent share links have been created yet.</p>
              )}
            </SurfaceCard>
          </>
        ) : null}
      </div>
    </AppPage>
  );
}
