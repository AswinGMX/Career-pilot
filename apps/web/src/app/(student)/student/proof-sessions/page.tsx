import Link from "next/link";

import { getProofSessions } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProofSessionsPage(): Promise<JSX.Element> {
  await requireStudent();
  const response = await getProofSessions(getServerSessionCookieHeader());

  // Sessions arrive newest-first. Keep only the latest attempt per career and
  // remember how many attempts exist so we can hint the student.
  const totalByCareer = new Map<string, number>();
  response.sessions.forEach((s) => {
    totalByCareer.set(s.career.id, (totalByCareer.get(s.career.id) ?? 0) + 1);
  });
  const seen = new Set<string>();
  const latestPerCareer = response.sessions.filter((s) => {
    if (seen.has(s.career.id)) return false;
    seen.add(s.career.id);
    return true;
  });

  return (
    <AppPage>
      <Hero
        eyebrow="Student"
        title="Proof sessions"
        subtitle={<p style={{ margin: 0 }}>Test readiness through AI-generated scenario questions, not technical trivia.</p>}
      />

      <div className="section-stack">
        {latestPerCareer.length ? (
          <div className="panel-grid panel-grid--cards">
            {latestPerCareer.map((session) => {
              const total = totalByCareer.get(session.career.id) ?? 1;
              return (
              <SurfaceCard key={session.id}>
                <p className="app-eyebrow">
                  {session.status.replace("_", " ")} &bull; {session.questionSource}
                  {total > 1 ? <> &bull; {total} attempts</> : null}
                </p>
                <h2 style={{ margin: "10px 0 8px", fontSize: "1.5rem", lineHeight: 1 }}>{session.career.title}</h2>
                <p className="muted-text" style={{ margin: 0 }}>{session.career.summary}</p>
                <p className="muted-text" style={{ marginTop: "12px" }}>
                  Answers: {session.answerCount}/{session.questionSet.questions.length}
                  {session.result ? ` \u2022 ${session.result.readinessBand} \u2022 ${session.result.overallScore}%` : ""}
                </p>
                {session.status === "completed" ? (
                  session.career.name.trim().toLowerCase() === "technology" ? (
                    <Link className="cta-gradient cta-gradient--tech" href={`/student/proof-sessions/${session.id}`}>
                      I will help you get placed in companies like Amazon, Netflix, and Google
                    </Link>
                  ) : (
                    <Link className="cta-gradient cta-gradient--mentor" href={`/student/proof-sessions/${session.id}`}>
                      Work with an in-person mentor before the next step
                    </Link>
                  )
                ) : (
                  <Link className="cta-gradient cta-gradient--continue" href={`/student/proof-sessions/${session.id}`}>
                    Continue session
                  </Link>
                )}
              </SurfaceCard>
              );
            })}
          </div>
        ) : (
          <SurfaceCard title="No proof sessions yet">
            <p className="muted-text">
              Start from any career detail page to generate a scenario-based proof session.
            </p>
            <Link href="/student/careers">Browse careers</Link>
          </SurfaceCard>
        )}
      </div>
    </AppPage>
  );
}
