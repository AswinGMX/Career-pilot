import Link from "next/link";
import { notFound } from "next/navigation";

import { getParentSharedReport } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ParentSharedReportPage({
  params
}: {
  params: { shareToken: string };
}): Promise<JSX.Element> {
  const response = await getParentSharedReport(params.shareToken);

  if (!response || !response.report.report) {
    notFound();
  }

  const { report, share } = response;
  const reportData = report.report!;

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: "#4b6480", fontSize: "12px" }}>
        Parent share
      </p>
      <h1 style={{ marginTop: "8px", fontSize: "36px" }}>{reportData.student.fullName}</h1>
      <p style={{ color: "#334a62", lineHeight: 1.6 }}>
        This read-only report link is active until {new Date(share.expiresAt).toLocaleString()}.
      </p>
      <p style={{ marginTop: "12px" }}>
        <Link href="/">Back to Career Pilot</Link>
      </p>

      <section style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
        <Card title="Career direction">
          <p style={{ marginTop: 0, color: "#334a62" }}>
            Top recommendation: {reportData.topRecommendationTitle || "Not available"}
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: "20px", color: "#334a62", lineHeight: 1.8 }}>
            {reportData.recommendationHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="Parent summary">
          <p style={{ margin: 0, color: "#334a62", lineHeight: 1.8 }}>
            {reportData.parentSummary || "The student has not completed a proof session yet."}
          </p>
        </Card>

        <Card title="Strengths and risks">
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Strengths</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#334a62", lineHeight: 1.8 }}>
                {reportData.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>Risks</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#334a62", lineHeight: 1.8 }}>
                {reportData.risks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Next steps">
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#334a62", lineHeight: 1.8 }}>
            {reportData.nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <article style={{ background: "#fff", border: "1px solid #d8e1eb", borderRadius: "14px", padding: "18px" }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </article>
  );
}
