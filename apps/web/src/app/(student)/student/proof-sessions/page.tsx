import Link from "next/link";

import { getProofSessions } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProofSessionsPage(): Promise<JSX.Element> {
  await requireStudent();
  const response = await getProofSessions();

  return (
    <AppPage>
      <Hero
        eyebrow="Student"
        title="Proof sessions"
        subtitle={<p style={{ margin: 0 }}>Test readiness through AI-generated scenario questions, not technical trivia.</p>}
      />

      <div className="section-stack">
        {response.sessions.length ? (
          <div className="panel-grid panel-grid--cards">
            {response.sessions.map((session) => (
              <SurfaceCard key={session.id}>
                <p className="app-eyebrow">
                  {session.status.replace("_", " ")} &bull; {session.questionSource}
                </p>
                <h2 style={{ margin: "10px 0 8px", fontSize: "1.5rem", lineHeight: 1 }}>{session.career.title}</h2>
                <p className="muted-text" style={{ margin: 0 }}>{session.career.summary}</p>
                <p className="muted-text" style={{ marginTop: "12px" }}>
                  Answers: {session.answerCount}/{session.questionSet.questions.length}
                  {session.result ? ` \u2022 ${session.result.readinessBand} \u2022 ${session.result.overallScore}%` : ""}
                </p>
                <p style={{ marginTop: "12px" }}>
                  <Link href={`/student/proof-sessions/${session.id}`}>Open proof session</Link>
                </p>
              </SurfaceCard>
            ))}
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
