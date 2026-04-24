import Link from "next/link";

import { AppPage } from "@/components/page-chrome";
import { getLatestStudentReport } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const response = await getLatestStudentReport(getServerSessionCookieHeader());
  const report = response.report;

  if (!report?.report) {
    return (
      <AppPage>
        <div className="parent-preview">
          <p className="parent-preview__eyebrow">Parent preview</p>
          <h1 className="parent-preview__title">Your report isn't ready yet</h1>
          <p className="parent-preview__summary">
            Generate your readiness report first — this preview will show what a parent sees when you share a link
            with them.
          </p>
          <p style={{ margin: 0 }}>
            <Link className="button-primary" href="/student/report">
              Go to report
            </Link>
          </p>
        </div>
      </AppPage>
    );
  }

  const payload = report.report;

  return (
    <AppPage>
      <div className="button-row" style={{ marginBottom: "18px" }}>
        <Link className="button-ghost" href="/student/report">
          ← Back to your report
        </Link>
      </div>

      <article className="parent-preview">
        <p className="parent-preview__eyebrow">Career readiness · parent preview</p>
        <h1 className="parent-preview__title">{session.user.fullName}'s career discovery report</h1>
        <p className="parent-preview__summary">
          {payload.parentSummary ||
            `This is a summary of ${session.user.fullName}'s career discovery progress so far. It reflects their submitted profile, a ranked recommendation snapshot, and any proof sessions they have completed.`}
        </p>

        <section className="parent-preview__section">
          <h3>Top recommendation</h3>
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>
            {payload.topRecommendationTitle || "Not generated yet."}
            {payload.recommendationCreatedAt
              ? ` · Snapshot from ${new Date(payload.recommendationCreatedAt).toLocaleDateString()}`
              : ""}
          </p>
        </section>

        {payload.recommendationHighlights.length > 0 ? (
          <section className="parent-preview__section">
            <h3>Why this direction makes sense</h3>
            <ul className="content-list">
              {payload.recommendationHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="parent-preview__section">
          <h3>Readiness evidence</h3>
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>
            {payload.proofReadinessBand
              ? `Readiness band: ${payload.proofReadinessBand}${
                  payload.proofConfidenceScore !== null ? ` · Score ${payload.proofConfidenceScore}%` : ""
                }`
              : "No proof sessions completed yet."}
          </p>
        </section>

        {payload.strengths.length > 0 ? (
          <section className="parent-preview__section">
            <h3>Strengths</h3>
            <ul className="content-list">
              {payload.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {payload.risks.length > 0 ? (
          <section className="parent-preview__section">
            <h3>Areas to watch</h3>
            <ul className="content-list">
              {payload.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {payload.nextSteps.length > 0 ? (
          <section className="parent-preview__section">
            <h3>Suggested next steps</h3>
            <ul className="content-list">
              {payload.nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="parent-preview__section">
          <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
            Report generated {new Date(payload.generatedAt).toLocaleString()}. This is the content a parent will see
            when you share your report link with them.
          </p>
        </section>
      </article>
    </AppPage>
  );
}
