import Link from "next/link";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { RadialGauge, StatTile } from "@/components/charts";
import { getMentorRequests, getMentorStudents } from "@/lib/api";
import { getServerSessionCookieHeader, requireMentor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MentorDashboardPage(): Promise<JSX.Element> {
  const session = await requireMentor();
  const cookieHeader = getServerSessionCookieHeader();
  const [requests, students] = await Promise.all([
    getMentorRequests(cookieHeader),
    getMentorStudents(cookieHeader)
  ]);

  const withPlan = students.students.filter((s) => s.hasPlan).length;
  const needsPlan = students.students.length - withPlan;

  return (
    <AppPage>
      <Hero
        eyebrow="Mentor workspace"
        title={`Welcome, ${session.user.fullName.split(" ")[0]}`}
        subtitle={<p style={{ margin: 0 }}>Review requests and guide your students with a clear plan.</p>}
        actions={
          <Link className="button-secondary" href="/mentor/profile">
            Edit profile
          </Link>
        }
      />

      <div className="section-stack">
        <div className="viz-bento">
          <div className="viz-col-4">
            <StatTile
              label="Pending requests"
              value={requests.requests.length}
              icon="inbox"
              caption={requests.requests.length === 1 ? "awaiting review" : "awaiting your review"}
            />
          </div>
          <div className="viz-col-4">
            <StatTile
              label="Connected students"
              value={students.students.length}
              icon="users"
              caption="active mentees"
              tone="neutral"
            />
          </div>
          <div className="viz-col-4">
            {students.students.length > 0 ? (
              <SurfaceCard className="viz-gauge-card">
                <p className="viz-card-title" style={{ textAlign: "center" }}>
                  Plan coverage
                </p>
                <RadialGauge
                  value={withPlan}
                  max={students.students.length}
                  unit={`/${students.students.length}`}
                  caption="Have a plan"
                  tone="success"
                />
                <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
                  {needsPlan > 0 ? `${needsPlan} still need a plan` : "Every student has a plan"}
                </p>
              </SurfaceCard>
            ) : (
              <StatTile label="Plans in progress" value={withPlan} icon="check" caption="no students yet" tone="success" />
            )}
          </div>
        </div>

        {requests.requests.length > 0 ? (
          <SurfaceCard title="Pending requests" strong>
            <div style={{ display: "grid", gap: "10px" }}>
              {requests.requests.slice(0, 4).map((request) => (
                <div key={request.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <strong>{request.student.fullName}</strong>
                    <span className="muted-text"> · {request.student.email}</span>
                    {request.message ? <div className="muted-text" style={{ fontSize: "13px" }}>&ldquo;{request.message}&rdquo;</div> : null}
                  </div>
                  <Link className="button-primary" href="/mentor/requests">Review</Link>
                </div>
              ))}
            </div>
          </SurfaceCard>
        ) : null}

        <SurfaceCard title="Your students">
          {students.students.length === 0 ? (
            <p className="muted-text" style={{ margin: 0 }}>
              No connected students yet. Accepted requests will appear here.
            </p>
          ) : (
            <div className="panel-grid panel-grid--cards">
              {students.students.map((student) => (
                <div key={student.userId} className="surface-card">
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.4rem" }}>{student.fullName}</h3>
                  <p className="muted-text" style={{ margin: 0 }}>{student.email}</p>
                  <p className="app-eyebrow" style={{ marginTop: "10px", color: student.hasPlan ? "#067647" : undefined }}>
                    {student.hasPlan ? "Plan in progress" : "No plan yet"}
                  </p>
                  <p style={{ marginTop: "10px" }}>
                    <Link href={`/mentor/students/${student.userId}`}>
                      {student.hasPlan ? "View / edit plan" : "Build guidance plan"} →
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard title="Next steps">
          <div style={{ display: "grid", gap: "10px" }}>
            <Link href="/mentor/requests">Review mentorship requests →</Link>
            <Link href="/mentor/students">Open your students and build guidance plans →</Link>
            <Link href="/mentor/profile">Edit your mentor profile →</Link>
          </div>
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
