import Link from "next/link";

import { getStudentProfile } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const response = await getStudentProfile(getServerSessionCookieHeader());
  const isCompleted = response.profile?.completionStatus === "submitted";

  return (
    <AppPage>
      <Hero
        eyebrow="AI Profile Studio"
        title="Build the student character profile"
        subtitle={
          <p style={{ margin: 0 }}>
            Your profile details and assessment are saved. The detailed personality analysis is shown below.
          </p>
        }
        actions={
          <>
            {isCompleted ? (
              <span className="status-chip" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", fontWeight: 600 }}>
                Profile completed
              </span>
            ) : null}
            <Link className="button-secondary" href="/student/dashboard">
              Back to dashboard
            </Link>
          </>
        }
      />
      <div className="section-stack">
        <ProfileForm
          initialProfile={response.profile}
          studentName={session.user.fullName}
          initialAssessmentResult={response.profile?.cachedAssessmentResult ?? null}
        />
      </div>
    </AppPage>
  );
}
