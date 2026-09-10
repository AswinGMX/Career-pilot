import Link from "next/link";

import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { browseMentors, getMyMentors } from "@/lib/api";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { RequestMentorButton } from "./RequestMentorButton";
import { StudentMentorCard } from "./StudentMentorCard";

export const dynamic = "force-dynamic";

export default async function StudentMentorsPage(): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();
  const [browse, mine] = await Promise.all([browseMentors(undefined, cookieHeader), getMyMentors(cookieHeader)]);

  const acceptedMentors = mine.mentors.filter((m) => m.status === "accepted");

  return (
    <AppPage>
      <Hero
        eyebrow="Mentors"
        title="Find a mentor for your career journey"
        subtitle={<p style={{ margin: 0 }}>Request a mentor, then follow the guidance plan they build for you.</p>}
      />

      <div className="section-stack">
        {acceptedMentors.length > 0 ? (
          <SurfaceCard title="Your mentors & plans" strong>
            <div style={{ display: "grid", gap: "8px" }}>
              {acceptedMentors.map((mentor) => (
                <StudentMentorCard key={mentor.requestId} mentor={mentor} />
              ))}
            </div>
          </SurfaceCard>
        ) : null}

        <SurfaceCard title="Browse mentors">
          {browse.mentors.length === 0 ? (
            <p className="muted-text" style={{ margin: 0 }}>No mentors available right now. Check back soon.</p>
          ) : (
            <div className="panel-grid panel-grid--cards">
              {browse.mentors.map((mentor) => (
                <div key={mentor.id} className="surface-card">
                  <h3 style={{ margin: "0 0 2px" }}>{mentor.fullName}</h3>
                  {mentor.headline ? <p className="muted-text" style={{ margin: 0 }}>{mentor.headline}</p> : null}
                  {mentor.expertise.length ? (
                    <p className="app-eyebrow" style={{ marginTop: "8px" }}>{mentor.expertise.join(" · ")}</p>
                  ) : null}
                  {mentor.bio ? <p style={{ margin: "8px 0" }}>{mentor.bio}</p> : null}
                  <div style={{ marginTop: "10px" }}>
                    <RequestMentorButton mentorProfileId={mentor.id} status={mentor.requestStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <p className="muted-text" style={{ margin: 0, fontSize: "13px", textAlign: "center" }}>
          Are you an experienced professional?{" "}
          <Link href="/student/become-mentor">Become a mentor →</Link>
        </p>
      </div>
    </AppPage>
  );
}
