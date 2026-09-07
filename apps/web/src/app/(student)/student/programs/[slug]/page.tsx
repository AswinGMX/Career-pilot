import Link from "next/link";

import type { ProgramContentBlockView } from "@career-pilot/types";

import { getProgram, listEnrollments } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { EnrollButton } from "./EnrollButton";

export const dynamic = "force-dynamic";

function blockLabel(block: ProgramContentBlockView): string {
  const body = block.body ?? {};
  switch (block.kind) {
    case "text":
      return String((body as { heading?: string }).heading ?? "Lesson");
    case "task_prompt":
      return String((body as { prompt?: string }).prompt ?? "Task");
    case "scenario":
      return "Interactive scenario";
    case "video":
    case "audio":
    case "panorama360":
      return `Media — ${block.kind}`;
    default:
      return block.kind;
  }
}

export default async function ProgramDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookie = getServerSessionCookieHeader();
  const [{ program }, { enrollments }] = await Promise.all([
    getProgram(params.slug, cookie),
    listEnrollments(cookie)
  ]);

  if (!program) {
    return (
      <AppPage>
        <Hero eyebrow="Program" title="Program not found" subtitle={<p style={{ margin: 0 }}>This program is unavailable.</p>} />
        <SurfaceCard>
          <Link href="/student/programs">← Back to programs</Link>
        </SurfaceCard>
      </AppPage>
    );
  }

  const existing = enrollments.find(
    (enrollment) => enrollment.programSlug === program.slug && enrollment.status !== "abandoned"
  );

  return (
    <AppPage>
      <Hero
        eyebrow={program.durationDays ? `${program.durationDays}-day program` : "Program"}
        title={program.title}
        subtitle={<p style={{ margin: 0 }}>{program.summary}</p>}
      />

      <div className="section-stack">
        <SurfaceCard title="Get started">
          {existing ? (
            <Link href={`/student/programs/enrolled/${existing.id}`} style={ctaStyle}>
              Continue your program →
            </Link>
          ) : (
            <EnrollButton slug={program.slug} />
          )}
        </SurfaceCard>

        {program.days.map((day) => (
          <SurfaceCard key={day.id} title={`Day ${day.dayIndex} — ${day.title}`}>
            {day.objective ? (
              <p className="muted-text" style={{ marginTop: 0 }}>
                {day.objective}
                {day.estimatedMinutes ? ` · ~${day.estimatedMinutes} min` : ""}
              </p>
            ) : null}
            <div style={{ display: "grid", gap: "10px" }}>
              {day.modules.map((module) => (
                <div key={module.id} style={{ border: "1px solid #eef1f5", borderRadius: "10px", padding: "12px" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                    {module.title} <span className="muted-text" style={{ fontWeight: 400 }}>· {module.type}</span>
                  </p>
                  <ul className="content-list" style={{ margin: 0 }}>
                    {module.blocks.map((block) => (
                      <li key={block.id}>{blockLabel(block)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </AppPage>
  );
}

const ctaStyle = {
  display: "inline-block",
  border: 0,
  borderRadius: "999px",
  padding: "12px 18px",
  background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
  color: "#fff",
  textDecoration: "none"
} as const;
