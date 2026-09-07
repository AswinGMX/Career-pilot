import Link from "next/link";

import { listEnrollments, listPrograms } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProgramsPage(): Promise<JSX.Element> {
  await requireStudent();
  const cookie = getServerSessionCookieHeader();
  const [{ programs }, { enrollments }] = await Promise.all([listPrograms(cookie), listEnrollments(cookie)]);

  return (
    <AppPage>
      <Hero
        eyebrow="Experience Programs"
        title="Live the career before you choose it"
        subtitle={
          <p style={{ margin: 0 }}>
            Multi-day immersive programs that put you inside the real work — read code, debug under pressure,
            collaborate, ship, and reflect — so you choose a career from experience, not guesswork.
          </p>
        }
      />

      <div className="section-stack">
        {enrollments.length ? (
          <SurfaceCard title="Your programs">
            <div style={{ display: "grid", gap: "12px" }}>
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/student/programs/enrolled/${enrollment.id}`}
                  style={cardLinkStyle}
                >
                  <div>
                    <strong>{enrollment.programTitle}</strong>
                    <p className="muted-text" style={{ margin: "4px 0 0" }}>
                      Day {Math.min(enrollment.currentDayIndex, enrollment.durationDays)} of {enrollment.durationDays}{" "}
                      &bull; {enrollment.completedDays} day{enrollment.completedDays === 1 ? "" : "s"} completed &bull;{" "}
                      {enrollment.status}
                    </p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </SurfaceCard>
        ) : null}

        <SurfaceCard title="Available programs">
          {programs.length ? (
            <div style={{ display: "grid", gap: "12px" }}>
              {programs.map((program) => (
                <Link key={program.id} href={`/student/programs/${program.slug}`} style={cardLinkStyle}>
                  <div>
                    <strong>{program.title}</strong>
                    <p className="muted-text" style={{ margin: "4px 0 0" }}>
                      {program.durationDays ? `${program.durationDays}-day program` : "Program"} &bull; {program.summary}
                    </p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>
              No programs are published yet. Check back soon.
            </p>
          )}
        </SurfaceCard>
      </div>
    </AppPage>
  );
}

const cardLinkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid rgba(24, 32, 56, 0.1)",
  borderRadius: "12px",
  padding: "16px",
  color: "inherit",
  textDecoration: "none"
} as const;
