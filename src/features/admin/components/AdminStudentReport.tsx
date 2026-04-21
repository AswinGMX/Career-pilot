import { memo } from "react";

import type { AdminStudentReportPayload } from "@/features/admin/types";
import { Card } from "@/shared/components";
import { formatDate, getProofReadinessState } from "@/shared/utils";

interface AdminStudentReportProps {
  isLoading?: boolean;
  report: AdminStudentReportPayload | null;
}

export const AdminStudentReport = memo(function AdminStudentReport({
  isLoading = false,
  report
}: AdminStudentReportProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="empty-state">
        <h2>Loading student details</h2>
        <p>Fetching profile, recommendations, and proof evidence for this learner.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="empty-state">
        <h2>Select a student</h2>
        <p>Choose a student from the roster to inspect profile, recommendations, and proof evidence.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {report.profile ? (
        <Card>
          <p className="eyebrow">AI profile summary</p>
          <h3>{report.profile.analysis.summary}</h3>
          <p>{report.profile.analysis.characterReadout}</p>
        </Card>
      ) : (
        <div className="empty-state">
          <h2>Profile pending</h2>
          <p>This student has not completed the AI profile yet.</p>
        </div>
      )}

      <Card>
        <p className="eyebrow">Top recommendations</p>
        <ul className="list">
          {report.recommendations.slice(0, 5).map((item) => (
            <li key={item.id}>
              {item.title} - {item.fitScore}% fit
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="eyebrow">Proof evidence</p>
        <div className="stack">
          {report.proofSessions.slice(0, 3).map((session) => {
            const readiness = getProofReadinessState(session.evaluation?.overallScore || 0);

            return (
              <div key={session.id} className="proof-history-card">
                <strong>
                  {session.careerTitle} - {session.evaluation?.points || 0} pts ({session.evaluation?.overallScore || 0}%)
                </strong>
                <div className={`status-callout status-callout--${readiness.tone}`}>
                  <strong>{readiness.label}</strong>
                  <p>{readiness.message}</p>
                </div>
                <p>{session.evaluation?.schoolSummary}</p>
                <small>{formatDate(session.completedAt)}</small>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
});
