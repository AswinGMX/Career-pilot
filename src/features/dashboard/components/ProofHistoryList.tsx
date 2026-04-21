import { memo, useEffect, useMemo, useState } from "react";
import { Link, createSearchParams } from "react-router-dom";

import { dashboardApi } from "@/features/dashboard/api";
import type { ProofSession } from "@/features/dashboard/types";
import { routePaths } from "@/routes/paths";
import { Card } from "@/shared/components";
import { formatDate, getProofReadinessState } from "@/shared/utils";

interface ProofHistoryListProps {
  sessions: ProofSession[];
}

function getSessionCareerCategory(session: ProofSession, resolvedCategories: Record<string, string>): string {
  return String(session.careerCategory || resolvedCategories[session.careerId] || "").trim();
}

function isTechnologyProofSession(session: ProofSession, resolvedCategories: Record<string, string>): boolean {
  return getSessionCareerCategory(session, resolvedCategories).toLowerCase() === "technology";
}

function getCareerHelpCta(score: number, isTechnology: boolean): string {
  if (isTechnology) {
    return score < 65
      ? "Build your technology path before placements"
      : "I will help you get placed in companies like Amazon, Netflix, and Google";
  }

  return score < 65
    ? "Work with an in-person mentor before the next step"
    : "Find an in-person mentor for your next step";
}

export const ProofHistoryList = memo(function ProofHistoryList({ sessions }: ProofHistoryListProps): JSX.Element {
  const [resolvedCategories, setResolvedCategories] = useState<Record<string, string>>({});

  const missingCareerIds = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .filter((session) => !String(session.careerCategory || "").trim() && session.careerId)
            .map((session) => session.careerId)
            .filter((careerId) => !resolvedCategories[careerId])
        )
      ),
    [resolvedCategories, sessions]
  );

  useEffect(() => {
    if (!missingCareerIds.length) {
      return;
    }

    let isActive = true;

    void Promise.all(
      missingCareerIds.map(async (careerId) => {
        try {
          const response = await dashboardApi.getCareer(careerId);
          return [careerId, response.career.category] as const;
        } catch {
          return [careerId, ""] as const;
        }
      })
    ).then((entries) => {
      if (!isActive) {
        return;
      }

      setResolvedCategories((current) => {
        const next = { ...current };

        entries.forEach(([careerId, careerCategory]) => {
          if (careerCategory) {
            next[careerId] = careerCategory;
          }
        });

        return next;
      });
    });

    return () => {
      isActive = false;
    };
  }, [missingCareerIds]);

  if (!sessions.length) {
    return (
      <div className="empty-state">
        <h2>No proof sessions yet</h2>
        <p>Start a proof session from the careers page to collect evidence here.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {sessions.map((session) => {
        const score = session.evaluation?.overallScore || 0;
        const readiness = getProofReadinessState(score);
        const careerCategory = getSessionCareerCategory(session, resolvedCategories);
        const isTechnology = isTechnologyProofSession(session, resolvedCategories);
        const helpButtonTone = isTechnology
          ? score < 65
            ? "proof-help-button--support"
            : "proof-help-button--placement"
          : "proof-help-button--mentor";

        return (
          <Card key={session.id}>
            <div className="card__header">
              <div>
                <p className="eyebrow">{session.careerTitle}</p>
                <h3>{session.evaluation?.points || 0} points</h3>
              </div>
              <div className="actions">
                <span className={`pill pill--${readiness.tone}`}>
                  {readiness.label} {score}%
                </span>
                <span className="pill">{formatDate(session.completedAt)}</span>
              </div>
            </div>
            <div className={`status-callout status-callout--${readiness.tone}`}>
              <strong>{readiness.label}</strong>
              <p>{readiness.message}</p>
            </div>
            <p>{session.evaluation?.narrative}</p>
            <ul className="list">
              <li>Readiness band: {session.evaluation?.readinessBand}</li>
              <li>Parent summary: {session.evaluation?.parentSummary}</li>
              <li>School summary: {session.evaluation?.schoolSummary}</li>
            </ul>
            <div className="actions">
              <Link
                className={`button proof-help-button ${helpButtonTone}`}
                to={{
                  pathname: routePaths.dashboardCareerHelp,
                  search: createSearchParams({
                    score: String(score),
                    career: session.careerTitle,
                    category: careerCategory
                  }).toString()
                }}
              >
                {getCareerHelpCta(score, isTechnology)}
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
