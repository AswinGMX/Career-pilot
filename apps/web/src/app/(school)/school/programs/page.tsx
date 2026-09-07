import { AppPage, Hero } from "@/components/page-chrome";
import { requireSchoolAdmin } from "@/lib/session";

import { ProgramAdminConsole } from "./ProgramAdminConsole";

export const dynamic = "force-dynamic";

export default async function SchoolProgramsAdminPage(): Promise<JSX.Element> {
  await requireSchoolAdmin();

  return (
    <AppPage>
      <Hero
        eyebrow="Content studio"
        title="Experience Programs"
        subtitle={
          <p style={{ margin: 0 }}>
            Create a program, generate an AI draft of its multi-day curriculum, review it, and publish. Published
            programs become enrollable by students.
          </p>
        }
      />
      <ProgramAdminConsole />
    </AppPage>
  );
}
