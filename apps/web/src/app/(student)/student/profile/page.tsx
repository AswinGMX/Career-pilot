import { getStudentProfile } from "@/lib/api";
import { AppPage } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { ProfileStudio } from "./ProfileStudio";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage(): Promise<JSX.Element> {
  const session = await requireStudent();
  const response = await getStudentProfile(getServerSessionCookieHeader());

  return (
    <AppPage>
      <ProfileStudio
        initialProfile={response.profile}
        studentName={session.user.fullName}
        initialAssessmentResult={response.profile?.cachedAssessmentResult ?? null}
      />
    </AppPage>
  );
}
