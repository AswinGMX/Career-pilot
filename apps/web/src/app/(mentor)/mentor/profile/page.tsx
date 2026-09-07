import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { requireMentor } from "@/lib/session";

import { MentorProfileForm } from "./MentorProfileForm";

export const dynamic = "force-dynamic";

export default async function MentorProfilePage(): Promise<JSX.Element> {
  await requireMentor();

  return (
    <AppPage>
      <Hero
        eyebrow="Mentor profile"
        title="How students see you"
        subtitle={<p style={{ margin: 0 }}>Keep your headline and expertise up to date so the right students find you.</p>}
      />

      <div className="section-stack">
        <SurfaceCard title="Edit profile">
          <MentorProfileForm />
        </SurfaceCard>
      </div>
    </AppPage>
  );
}
