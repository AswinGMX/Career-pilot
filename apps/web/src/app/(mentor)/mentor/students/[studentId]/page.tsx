import Link from "next/link";
import { notFound } from "next/navigation";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getGuidancePlan, getMentorStudentDetail, listPrograms } from "@/lib/api";
import { getServerSessionCookieHeader, requireMentor } from "@/lib/session";

import { GuidancePlanEditor } from "./GuidancePlanEditor";

export const dynamic = "force-dynamic";

export default async function MentorStudentDetailPage({
  params
}: {
  params: { studentId: string };
}): Promise<JSX.Element> {
  await requireMentor();
  const cookieHeader = getServerSessionCookieHeader();
  const [detailResponse, planResponse, programsResponse] = await Promise.all([
    getMentorStudentDetail(params.studentId, cookieHeader),
    getGuidancePlan(params.studentId, cookieHeader),
    listPrograms(cookieHeader)
  ]);

  if (!detailResponse.student) {
    notFound();
  }

  const s = detailResponse.student;

  return (
    <AppPage>
      <Hero
        eyebrow="Student"
        title={s.student.fullName}
        subtitle={<p style={{ margin: 0 }}>{s.student.email}</p>}
        actions={
          <Link className="button-secondary" href="/mentor/students">
            Back to students
          </Link>
        }
      />

      <div className="section-stack">
        <SurfaceCard title="Profile snapshot">
          <div style={{ display: "grid", gap: "10px" }}>
            <p style={{ margin: 0 }}>
              <strong>Profile:</strong> {s.profileCompletion ?? "not started"} ·{" "}
              <strong>Proof readiness:</strong> {s.proofReadinessBand ?? "—"} ·{" "}
              <strong>Program readiness:</strong> {s.programReadinessBand ?? "—"}
            </p>
            {s.favoriteSubjects.length ? (
              <p style={{ margin: 0 }}><strong>Subjects:</strong> {s.favoriteSubjects.join(", ")}</p>
            ) : null}
            {s.personalStrengths.length ? (
              <p style={{ margin: 0 }}><strong>Strengths:</strong> {s.personalStrengths.join(", ")}</p>
            ) : null}
            {s.topRecommendations.length ? (
              <p style={{ margin: 0 }}><strong>Top matches:</strong> {s.topRecommendations.join(", ")}</p>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Guidance plan" strong>
          <GuidancePlanEditor
            studentUserId={s.student.id}
            initialPlan={planResponse.plan}
            programs={programsResponse.programs}
          />
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
