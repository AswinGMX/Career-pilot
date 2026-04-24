import Link from "next/link";
import { notFound } from "next/navigation";

import { getSchoolStudents } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireSchoolAdmin } from "@/lib/session";

import { CreateStudentForm } from "./CreateStudentForm";

export const dynamic = "force-dynamic";

export default async function SchoolStudentsPage({
  searchParams
}: {
  searchParams?: { q?: string; page?: string };
}): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();
  const tenantId = session.activeMembership?.tenant.id;

  if (!tenantId) {
    notFound();
  }

  const q = searchParams?.q || "";
  const page = Number(searchParams?.page || "1");
  const response = await getSchoolStudents(
    tenantId,
    {
      q,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: 10
    },
    getServerSessionCookieHeader()
  );

  if (!response) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(response.total / response.pageSize));

  return (
    <AppPage>
      <Hero
        eyebrow="School roster"
        title="Students, readiness, and proof at a glance"
        subtitle={<p style={{ margin: 0 }}>Review tenant-scoped students, recommendation readiness, and proof evidence from one place.</p>}
        actions={
          <Link className="button-secondary" href="/school/report">
            Open school report
          </Link>
        }
      />

      <div className="section-stack">
      <SurfaceCard title="Create student">
        <CreateStudentForm tenantId={tenantId} />
      </SurfaceCard>

      <form method="GET" className="surface-card" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="field-control"
          style={{ minWidth: "280px" }}
        />
        <button type="submit" className="button-primary">
          Search
        </button>
      </form>

      <div className="panel-grid panel-grid--cards">
        {response.students.map((student) => (
          <SurfaceCard key={student.id}>
            <p className="app-eyebrow">
              {student.profileCompletionStatus || "no profile"} • {student.recommendationStatus}
            </p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem", lineHeight: 1 }}>{student.fullName}</h2>
            <p className="muted-text" style={{ margin: 0 }}>{student.email}</p>
            <p className="muted-text" style={{ marginTop: "12px" }}>
              Top recommendation: {student.topRecommendationTitle || "Not generated yet"}
            </p>
            <p className="muted-text" style={{ marginTop: "6px" }}>
              Proof sessions: {student.completedProofSessions}
              {student.latestProofReadinessBand ? ` • ${student.latestProofReadinessBand}` : ""}
            </p>
            <p style={{ marginTop: "12px" }}>
              <Link href={`/school/students/${student.id}`}>Open student report</Link>
            </p>
          </SurfaceCard>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <p className="muted-text" style={{ margin: 0 }}>
          Page {response.page} of {totalPages} • {response.total} students
        </p>
        {response.page > 1 ? (
          <Link href={`/school/students?${new URLSearchParams({ ...(q ? { q } : {}), page: String(response.page - 1) }).toString()}`}>
            Previous
          </Link>
        ) : null}
        {response.page < totalPages ? (
          <Link href={`/school/students?${new URLSearchParams({ ...(q ? { q } : {}), page: String(response.page + 1) }).toString()}`}>
            Next
          </Link>
        ) : null}
      </div>
      </div>
    </AppPage>
  );
}
