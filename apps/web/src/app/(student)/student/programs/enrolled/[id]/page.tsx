import Link from "next/link";

import type { DayState } from "@career-pilot/types";

import { getEnrollment, getEnrollmentResult } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { ProgramReportButton } from "./ProgramReportButton";
import { ResultPoller } from "./ResultPoller";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<DayState, string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In progress",
  completed: "Completed"
};

const STATE_COLOR: Record<DayState, string> = {
  locked: "#98a2b3",
  available: "#5340d6",
  in_progress: "#b54708",
  completed: "#067647"
};

export default async function EnrolledProgramPage({
  params
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookie = getServerSessionCookieHeader();
  const { enrollment } = await getEnrollment(params.id, cookie);

  if (!enrollment) {
    return (
      <AppPage>
        <Hero eyebrow="Program" title="Enrollment not found" subtitle={<p style={{ margin: 0 }}>This program enrollment is unavailable.</p>} />
        <SurfaceCard>
          <Link href="/student/programs">← Back to programs</Link>
        </SurfaceCard>
      </AppPage>
    );
  }

  const progressPct = Math.round((enrollment.completedDays / enrollment.durationDays) * 100);
  const resultResponse =
    enrollment.status === "completed"
      ? await getEnrollmentResult(params.id, cookie)
      : ({ status: "none", result: null } as const);

  return (
    <AppPage>
      <Hero
        eyebrow={`${enrollment.durationDays}-day program · ${enrollment.status}`}
        title={enrollment.programTitle}
        subtitle={
          <p style={{ margin: 0 }}>
            {enrollment.completedDays} of {enrollment.durationDays} days completed ({progressPct}%).
            {enrollment.status === "completed" ? " You finished the program — well done." : ""}
          </p>
        }
      />

      <div className="section-stack">
        {enrollment.status === "completed" ? (
          <SurfaceCard title="Your readiness result" strong>
            {resultResponse.status === "ready" && resultResponse.result ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <p style={{ margin: 0, fontSize: "18px" }}>
                  <strong>{(resultResponse.result.readinessBand ?? "").toUpperCase()}</strong>
                  {typeof resultResponse.result.overallScore === "number"
                    ? ` · ${resultResponse.result.overallScore}/100`
                    : ""}
                </p>
                {resultResponse.result.narrative ? (
                  <p className="muted-text" style={{ margin: 0 }}>{resultResponse.result.narrative}</p>
                ) : null}
                {resultResponse.result.dimensions.length ? (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {resultResponse.result.dimensions.map((dimension) => (
                      <div key={dimension.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                          <span>{dimension.label}</span>
                          <span>{dimension.score}</span>
                        </div>
                        <div style={{ height: "8px", background: "#eef1f5", borderRadius: "999px" }}>
                          <div
                            style={{
                              height: "8px",
                              width: `${Math.max(0, Math.min(100, dimension.score))}%`,
                              background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
                              borderRadius: "999px"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {resultResponse.result.strengths.length ? (
                  <div>
                    <strong>Strengths</strong>
                    <ul className="content-list" style={{ marginBottom: 0 }}>
                      {resultResponse.result.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {resultResponse.result.nextSteps.length ? (
                  <div>
                    <strong>Next steps</strong>
                    <ul className="content-list" style={{ marginBottom: 0 }}>
                      {resultResponse.result.nextSteps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="muted-text" style={{ margin: 0, fontSize: "12px" }}>
                  Scored by {resultResponse.result.scoringSource ?? "system"}.
                </p>
                <ProgramReportButton enrollmentId={enrollment.id} />
              </div>
            ) : (
              <ResultPoller enrollmentId={enrollment.id} />
            )}
          </SurfaceCard>
        ) : null}

        <SurfaceCard title="Your days">
          <div style={{ display: "grid", gap: "10px" }}>
            {enrollment.days.map((day) => {
              const unlocked = day.state !== "locked";
              const content = (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <strong>
                      Day {day.dayIndex} — {day.title}
                    </strong>
                    {day.objective ? (
                      <p className="muted-text" style={{ margin: "4px 0 0" }}>{day.objective}</p>
                    ) : null}
                  </div>
                  <span style={{ color: STATE_COLOR[day.state], fontWeight: 600, whiteSpace: "nowrap" }}>
                    {STATE_LABEL[day.state]}
                  </span>
                </div>
              );

              return (
                <div
                  key={day.dayIndex}
                  style={{
                    border: "1px solid rgba(24, 32, 56, 0.1)",
                    borderRadius: "12px",
                    padding: "16px",
                    opacity: unlocked ? 1 : 0.6
                  }}
                >
                  {unlocked ? (
                    <Link
                      href={`/student/programs/enrolled/${enrollment.id}/day/${day.dayIndex}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <Link href="/student/programs">← All programs</Link>
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
