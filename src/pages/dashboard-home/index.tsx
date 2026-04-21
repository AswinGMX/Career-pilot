import { useNavigate } from "react-router-dom";

import { RecommendationGrid, ProofHistoryList, ProfileInsightCards, useDashboardHomePage } from "@/features/dashboard";
import { buildDashboardCareerDetailPath, routePaths } from "@/routes/paths";
import { Button, Card, EmptyState } from "@/shared/components";
import { ContentPageSkeleton } from "@/shared/components/Skeletons";

export default function DashboardHomePage(): JSX.Element {
  const navigate = useNavigate();
  const { dashboard, isLoading } = useDashboardHomePage();

  if (isLoading) {
    return <ContentPageSkeleton />;
  }

  if (!dashboard) {
    return <EmptyState description="Dashboard data could not be loaded." title="Workspace unavailable" />;
  }

  return (
    <div className="stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h1>{dashboard.student.fullName}</h1>
          <p>
            This overview brings together the AI profile, the recommendation engine, and proof evidence in a route-first dashboard shell.
          </p>
        </div>
        <div className="feature-grid">
          <Card className="stat-card">
            <strong>{dashboard.recommendations.length}</strong>
            <span>Top recommendations</span>
          </Card>
          <Card className="stat-card">
            <strong>{dashboard.totalPoints}</strong>
            <span>Total proof points</span>
          </Card>
          <Card className="stat-card">
            <strong>{dashboard.proofSessions[0]?.evaluation?.overallScore || "--"}%</strong>
            <span>Latest readiness score</span>
          </Card>
        </div>
      </section>

      {dashboard.profile ? (
        <ProfileInsightCards analysis={dashboard.profile.analysis} />
      ) : (
        <EmptyState
          title="Complete your AI profile"
          description="Your recommendation dashboard becomes more accurate once the profile studio has enough evidence."
          action={
            <Button variant="primary" onClick={() => navigate(routePaths.dashboardProfile)}>
              Open profile studio
            </Button>
          }
        />
      )}

      {dashboard.recommendations.length ? (
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">Recommendations</p>
              <h2>Behavior-backed career matches</h2>
            </div>
          </div>
          <RecommendationGrid
            items={dashboard.recommendations.slice(0, 6)}
            onOpenCareer={(careerId) => navigate(buildDashboardCareerDetailPath(careerId))}
          />
        </Card>
      ) : null}

      <Card className="stack">
        <div className="card__header">
          <div>
            <p className="eyebrow">Proof evidence</p>
            <h2>Latest completed sessions</h2>
          </div>
        </div>
        <ProofHistoryList sessions={dashboard.proofSessions.slice(0, 3)} />
      </Card>
    </div>
  );
}
