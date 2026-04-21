import { useState } from "react";

import { ProofHistoryList, useProofCenterPage } from "@/features/dashboard";
import { Button, Card, EmptyState } from "@/shared/components";
import { ContentPageSkeleton } from "@/shared/components/Skeletons";
import { useUnsavedChangesPrompt } from "@/shared/hooks";
import { labelize } from "@/shared/utils";

export default function DashboardProofPage(): JSX.Element {
  const { currentProofSession, dashboard, isLoading, isStartingProofSession, isSubmittingProofSession, submitProofSession } =
    useProofCenterPage();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useUnsavedChangesPrompt(
    Boolean(isStartingProofSession || currentProofSession),
    "You cannot leave while the proof assessment is in progress. Submit this assessment to continue.",
    {
      allowLeave: false,
      cancelLabel: "Continue assessment",
      kicker: "Assessment in progress",
      title: "Finish this assessment first"
    }
  );

  if (isLoading) {
    return <ContentPageSkeleton />;
  }

  return (
    <div className="stack">
      <Card>
        <div className="card__header">
          <div>
            <p className="eyebrow">Proof center</p>
            <h1>Readiness evidence by career</h1>
          </div>
        </div>
        <div className="feature-grid">
          <Card className="stat-card">
            <strong>{dashboard?.proofSessions.length || 0}</strong>
            <span>Completed proof sessions</span>
          </Card>
          <Card className="stat-card">
            <strong>{dashboard?.totalPoints || 0}</strong>
            <span>Total proof points</span>
          </Card>
          <Card className="stat-card">
            <strong>{dashboard?.proofSessions[0]?.evaluation?.points || 0}</strong>
            <span>Latest evidence points</span>
          </Card>
        </div>
      </Card>

      {isStartingProofSession ? (
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">Proof center</p>
              <h2>Preparing proof questions...</h2>
            </div>
          </div>
          <div className="actions">
            <Button aria-busy className="button--loading" disabled variant="secondary">
              Preparing proof session...
            </Button>
          </div>
          <div className="status-callout status-callout--info async-generation-status" aria-live="polite">
            Building the career readiness questions. This can take a few seconds.
          </div>
        </Card>
      ) : currentProofSession ? (
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">{currentProofSession.questionSet.source}</p>
              <h2>{currentProofSession.careerTitle}</h2>
            </div>
          </div>
          <p>{currentProofSession.questionSet.introduction}</p>
          {currentProofSession.questionSet.questions.map((question, index) => (
            <fieldset key={question.id} className="question-block">
              <legend>
                <p className="eyebrow">{labelize(question.dimension)}</p>
                <h3>
                  Q{index + 1}. {question.question}
                </h3>
              </legend>
              <p>{question.whyItMatters}</p>
              <div className="option-list">
                {question.options.map((option, optionIndex) => (
                  <label key={option} className="option-card">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: optionIndex
                        }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="actions">
            <Button
              disabled={isStartingProofSession || isSubmittingProofSession}
              variant="primary"
              onClick={() => void submitProofSession(answers)}
            >
              {isSubmittingProofSession ? "Submitting..." : "Submit proof evidence"}
            </Button>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No active proof session"
          description="Open a career from the explorer and start a proof session to evaluate real-world readiness."
        />
      )}

      <Card className="stack">
        <div className="card__header">
          <div>
            <p className="eyebrow">History</p>
            <h2>Completed proof evidence</h2>
          </div>
        </div>
        <ProofHistoryList sessions={dashboard?.proofSessions || []} />
      </Card>
    </div>
  );
}
