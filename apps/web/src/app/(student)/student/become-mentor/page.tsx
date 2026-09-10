import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { requireStudent } from "@/lib/session";

import { BecomeMentorForm } from "./BecomeMentorForm";

export const dynamic = "force-dynamic";

export default async function BecomeMentorPage(): Promise<JSX.Element> {
  await requireStudent();

  return (
    <AppPage>
      <Hero
        eyebrow="Mentorship"
        title="Become a mentor"
        subtitle={
          <p style={{ margin: 0 }}>
            Already have an account? Turn it into a mentor profile so students can request your guidance.
          </p>
        }
      />

      <div className="section-stack">
        <SurfaceCard title="Set up your mentor profile">
          <BecomeMentorForm />
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
