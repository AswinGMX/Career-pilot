import Link from "next/link";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getMentorStudents } from "@/lib/api";
import { getServerSessionCookieHeader, requireMentor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MentorStudentsPage(): Promise<JSX.Element> {
  await requireMentor();
  const { students } = await getMentorStudents(getServerSessionCookieHeader());

  return (
    <AppPage>
      <Hero
        eyebrow="Your students"
        title="Students you're guiding"
        subtitle={<p style={{ margin: 0 }}>Open a student to view their profile and build a guidance plan.</p>}
      />

      <div className="section-stack">
        {students.length === 0 ? (
          <SurfaceCard>
            <p className="muted-text" style={{ margin: 0 }}>
              No connected students yet. Accept requests to start guiding students.
            </p>
          </SurfaceCard>
        ) : (
          <div className="panel-grid panel-grid--cards">
            {students.map((student) => (
              <SurfaceCard key={student.userId}>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.6rem" }}>{student.fullName}</h2>
                <p className="muted-text" style={{ margin: 0 }}>{student.email}</p>
                <p className="app-eyebrow" style={{ marginTop: "10px" }}>
                  {student.hasPlan ? "Plan in progress" : "No plan yet"}
                </p>
                <p style={{ marginTop: "12px" }}>
                  <Link href={`/mentor/students/${student.userId}`}>
                    {student.hasPlan ? "View / edit plan" : "Build guidance plan"} →
                  </Link>
                </p>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    </AppPage>
  );
}
