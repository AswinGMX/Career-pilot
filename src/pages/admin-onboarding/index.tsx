import { useState } from "react";
import { Link } from "react-router-dom";

import { useAdminStudentOnboardingPage } from "@/features/admin";
import { Button, Card, EmptyState, Field } from "@/shared/components";
import { TablePageSkeleton } from "@/shared/components/Skeletons";
import { buildAdminStudentDetailsPath } from "@/routes/paths";

const emptyFormValues = {
  fullName: "",
  email: "",
  grade: "",
  password: ""
};

export default function AdminOnboardingPage(): JSX.Element {
  const { createStudent, isLoading, isSubmitting, overview } = useAdminStudentOnboardingPage();
  const [formValues, setFormValues] = useState(emptyFormValues);

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  if (!overview) {
    return <EmptyState description="Student onboarding data could not be loaded." title="Onboarding unavailable" />;
  }

  return (
    <div className="stack">
      <Card className="stack">
        <div className="card__header">
          <div>
            <p className="eyebrow">Create student</p>
            <h1>Onboard a learner into this tenant</h1>
          </div>
        </div>
        <div className="form-row">
          <Field htmlFor="student-name" label="Student full name">
            <input
              id="student-name"
              className="input"
              value={formValues.fullName}
              onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
            />
          </Field>
          <Field htmlFor="student-email" label="Student email">
            <input
              id="student-email"
              className="input"
              value={formValues.email}
              onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field htmlFor="student-grade" label="Grade / stage">
            <input
              id="student-grade"
              className="input"
              value={formValues.grade}
              onChange={(event) => setFormValues((current) => ({ ...current, grade: event.target.value }))}
            />
          </Field>
          <Field htmlFor="student-password" label="Temporary password">
            <input
              id="student-password"
              className="input"
              value={formValues.password}
              onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
            />
          </Field>
        </div>
        <div className="actions">
          <Button
            disabled={isSubmitting}
            variant="primary"
            onClick={async () => {
              await createStudent(formValues);
              setFormValues(emptyFormValues);
            }}
          >
            {isSubmitting ? "Creating..." : "Create student account"}
          </Button>
        </div>
      </Card>

      <Card className="stack">
        <div className="card__header">
          <div>
            <p className="eyebrow">Current students</p>
            <h2>Tenant student roster</h2>
          </div>
          <span className="pill">{overview.stats.totalStudents} students</span>
        </div>

        {overview.students.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Profile</th>
                  <th scope="col">Latest proof</th>
                  <th scope="col">Points</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {overview.students.map((item) => (
                  <tr key={item.student.id}>
                    <td>
                      <div className="data-table__primary">
                        <strong>{item.student.fullName}</strong>
                        <span>{item.topRecommendation?.title || "Recommendation pending"}</span>
                      </div>
                    </td>
                    <td>{item.student.email}</td>
                    <td>{item.student.grade || "Not set"}</td>
                    <td>
                      <span className={`pill ${item.profileCompleted ? "pill--success" : "pill--warning"}`}>
                        {item.profileCompleted ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td>{item.latestProof?.careerTitle || "No proof yet"}</td>
                    <td>{item.totalPoints}</td>
                    <td>
                      <Link className="button button--secondary" to={buildAdminStudentDetailsPath(item.student.id)}>
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h2>No students onboarded yet</h2>
            <p>Create the first learner account above and the roster will appear here automatically.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
