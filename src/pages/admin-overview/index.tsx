import { Link } from "react-router-dom";

import { useAdminOverviewPage } from "@/features/admin";
import { Card, EmptyState } from "@/shared/components";
import { TablePageSkeleton } from "@/shared/components/Skeletons";
import { formatDate } from "@/shared/utils";
import { buildAdminStudentDetailsPath } from "@/routes/paths";

export default function AdminOverviewPage(): JSX.Element {
  const { dashboard, overview, isLoading } = useAdminOverviewPage();

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  if (!overview || !dashboard) {
    return <EmptyState description="Admin overview data could not be loaded." title="Overview unavailable" />;
  }

  return (
    <div className="stack">
      <Card className="admin-overview-hero">
        <div className="admin-overview-hero__content">
          <div className="stack">
            <div>
              <p className="eyebrow">School operations</p>
              <h1>{overview.tenant.name}</h1>
            </div>
            <p>{dashboard.helperText}</p>
          </div>
          <div className="admin-overview-badge-row">
            <span className="pill">Join code {overview.tenant.joinCode || "Not available"}</span>
            <span className="pill">Tenant {overview.tenant.slug}</span>
          </div>
        </div>
        <div className="admin-overview-hero__meta">
          <div className="admin-overview-hero-metric">
            <span>Students with proof</span>
            <strong>{dashboard.studentsWithProof}</strong>
          </div>
          <div className="admin-overview-hero-metric">
            <span>Profiles completed</span>
            <strong>{dashboard.profileCompletionRate}%</strong>
          </div>
          <div className="admin-overview-hero-metric">
            <span>Total proof points</span>
            <strong>{overview.stats.totalPoints}</strong>
          </div>
        </div>
      </Card>

      <div className="admin-overview-insights">
        <Card className="admin-overview-insight-card">
          <p className="eyebrow">Immediate focus</p>
          <h2>{dashboard.priorityHeadline}</h2>
          <p>{dashboard.priorityDescription}</p>
        </Card>
        <Card className="admin-overview-insight-card">
          <p className="eyebrow">Guidance signal</p>
          <h2>
            {dashboard.recommendationSpotlight
              ? dashboard.recommendationSpotlight.title
              : "Recommendations still forming"}
          </h2>
          <p>
            {dashboard.recommendationSpotlight
              ? `This is currently the most common top recommendation across ${dashboard.recommendationSpotlight.count} learner${dashboard.recommendationSpotlight.count === 1 ? "" : "s"}.`
              : "Once more learners complete their profile, the strongest recommendation trend will show here."}
          </p>
        </Card>
        <Card className="admin-overview-insight-card">
          <p className="eyebrow">Latest evidence pulse</p>
          <h2>
            {dashboard.recentProofActivity[0]
              ? dashboard.recentProofActivity[0].careerTitle
              : "No proof activity yet"}
          </h2>
          <p>
            {dashboard.recentProofActivity[0]
              ? `${dashboard.recentProofActivity[0].fullName} submitted ${dashboard.recentProofActivity[0].points} points on ${formatDate(
                  dashboard.recentProofActivity[0].completedAt
                )}.`
              : "When students start submitting proof evidence, the latest readiness movement will show here."}
          </p>
        </Card>
      </div>

      <div className="admin-overview-panels">
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2>Students who need intervention</h2>
            </div>
          </div>
          {dashboard.attentionStudents.length > 0 ? (
            <div className="stack">
              {dashboard.attentionStudents.map((student) => (
                <article key={student.studentId} className="admin-overview-list-item">
                  <div className="card__header">
                    <div>
                      <h3>{student.fullName}</h3>
                      <p>{student.grade}</p>
                    </div>
                    <span className={`pill pill--${student.statusTone}`}>{student.statusLabel}</span>
                  </div>
                  <p>{student.note}</p>
                  <p>
                    Top recommendation: {student.topRecommendationTitle || "Not available yet"}
                  </p>
                  <div className="actions">
                    <Link
                      className="button button--secondary"
                      to={buildAdminStudentDetailsPath(student.studentId)}
                    >
                      Open student details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No urgent student blockers</h2>
              <p>Every learner currently has both a profile trail and at least one proof record on file.</p>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card className="stack">
            <div className="card__header">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Latest proof evidence</h2>
              </div>
            </div>
            {dashboard.recentProofActivity.length > 0 ? (
              <div className="stack">
                {dashboard.recentProofActivity.map((activity) => (
                  <article key={`${activity.studentId}-${activity.completedAt}`} className="admin-overview-list-item">
                    <div className="card__header">
                      <div>
                        <h3>{activity.fullName}</h3>
                        <p>
                          {activity.grade} • {activity.careerTitle}
                        </p>
                      </div>
                      <span className={`pill pill--${activity.readinessTone}`}>{activity.readinessBand}</span>
                    </div>
                    <p>
                      {activity.points} pts • {activity.overallScore}% readiness
                    </p>
                    <p>Submitted {formatDate(activity.completedAt)}</p>
                    <div className="actions">
                      <Link
                        className="button button--ghost"
                        to={buildAdminStudentDetailsPath(activity.studentId)}
                      >
                        View learner record
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>No proof activity yet</h2>
                <p>Once students start submitting proof evidence, the latest sessions will show here.</p>
              </div>
            )}
          </Card>

          <Card className="stack">
            <div className="card__header">
              <div>
                <p className="eyebrow">Strongest momentum</p>
                <h2>Top students by proof points</h2>
              </div>
            </div>
            {dashboard.topStudents.length > 0 ? (
              <div className="stack">
                {dashboard.topStudents.map((student, index) => (
                  <article key={student.studentId} className="admin-overview-list-item">
                    <div className="card__header">
                      <div>
                        <p className="eyebrow">Rank {index + 1}</p>
                        <h3>{student.fullName}</h3>
                      </div>
                      <span className="pill">{student.totalPoints} pts</span>
                    </div>
                    <p>{student.grade}</p>
                    <p>
                      Top recommendation: {student.topRecommendationTitle || "Not available yet"}
                    </p>
                    <p>
                      Latest proof: {student.latestProofTitle || "No proof submitted yet"}
                    </p>
                    <div className="actions">
                      <Link
                        className="button button--ghost"
                        to={buildAdminStudentDetailsPath(student.studentId)}
                      >
                        Review student
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>No ranked students yet</h2>
                <p>Leaderboard-style momentum will appear once learners begin building proof records.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
