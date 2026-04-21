import { AdminStudentReport, StudentRoster, useAdminStudentsPage } from "@/features/admin";
import { Card, EmptyState } from "@/shared/components";
import { TablePageSkeleton } from "@/shared/components/Skeletons";

export default function AdminStudentsPage(): JSX.Element {
  const { isLoading, isSelectingStudent, overview, selectStudent, selectedStudent } = useAdminStudentsPage();

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  if (!overview) {
    return <EmptyState description="Student management data could not be loaded." title="Student workspace unavailable" />;
  }

  return (
    <div className="split-layout">
      <div className="stack">
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">Managed students</p>
              <h1>Student details workspace</h1>
            </div>
          </div>
          <p>Choose a learner from the roster to inspect profile progress, recommendations, and proof evidence.</p>
        </Card>

        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">School roster</p>
              <h2>School roster</h2>
            </div>
          </div>
          <StudentRoster students={overview.students} onSelectStudent={selectStudent} />
        </Card>
      </div>
      <AdminStudentReport isLoading={isSelectingStudent} report={selectedStudent} />
    </div>
  );
}
