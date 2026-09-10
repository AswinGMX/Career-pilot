"use client";

import { useState } from "react";

import type { GuidancePlanRecord, GuidanceStepStatus, StudentMentorRecord } from "@career-pilot/types";

import { updateGuidanceStepStatus } from "@/lib/api";

const STATUS_LABEL: Record<GuidanceStepStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const NEXT_STATUS: Record<GuidanceStepStatus, GuidanceStepStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };

function statusColor(status: GuidanceStepStatus): string {
  return status === "done" ? "#067647" : status === "in_progress" ? "#7c5cfc" : "#6b7280";
}

export function StudentMentorCard({ mentor }: { mentor: StudentMentorRecord }): JSX.Element {
  const [plan, setPlan] = useState<GuidancePlanRecord | null>(mentor.plan);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cycleStatus(stepId: string, current: GuidanceStepStatus): Promise<void> {
    if (!plan) return;
    setBusyStep(stepId);
    setError(null);
    try {
      const res = await updateGuidanceStepStatus(plan.id, stepId, NEXT_STATUS[current]);
      if (res.plan) setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update step.");
    } finally {
      setBusyStep(null);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #e3e5ea", paddingTop: "16px" }}>
      <h3 style={{ margin: "0 0 2px" }}>{mentor.fullName}</h3>
      {mentor.headline ? <p className="muted-text" style={{ margin: 0 }}>{mentor.headline}</p> : null}

      {plan ? (
        <div style={{ marginTop: "12px" }}>
          <strong>{plan.title}</strong>
          {plan.summary ? <p className="muted-text" style={{ margin: "4px 0" }}>{plan.summary}</p> : null}
          <div style={{ display: "grid", gap: "8px", margin: "10px 0" }}>
            {plan.steps.map((step) => {
              const linked = Boolean(step.link);
              const effective = (linked ? step.liveStatus : step.status) ?? "todo";
              return (
                <div key={step.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  {linked ? (
                    <span
                      title="Tracked from your real progress"
                      style={{ fontSize: "12px", fontWeight: 700, color: statusColor(effective), minWidth: "92px" }}
                    >
                      {STATUS_LABEL[effective]}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void cycleStatus(step.id, effective)}
                      disabled={busyStep === step.id}
                      title="Click to update your progress"
                      style={{
                        cursor: "pointer",
                        border: `1px solid ${statusColor(effective)}`,
                        color: statusColor(effective),
                        background: "transparent",
                        borderRadius: "999px",
                        padding: "2px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        minWidth: "92px"
                      }}
                    >
                      {STATUS_LABEL[effective]}
                    </button>
                  )}
                  <div>
                    <span>{step.title}</span>
                    {step.link ? <span className="app-eyebrow"> · {step.link.label}</span> : null}
                    {step.detail ? <div className="muted-text" style={{ fontSize: "13px" }}>{step.detail}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
          {plan.notes ? <p style={{ margin: "6px 0" }}>📝 {plan.notes}</p> : null}
          {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
        </div>
      ) : (
        <p className="muted-text" style={{ marginTop: "8px" }}>Your mentor hasn&rsquo;t shared a plan yet.</p>
      )}
    </div>
  );
}
