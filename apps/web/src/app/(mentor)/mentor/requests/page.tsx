import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getMentorRequests } from "@/lib/api";
import { getServerSessionCookieHeader, requireMentor } from "@/lib/session";

import { RequestActions } from "./RequestActions";

export const dynamic = "force-dynamic";

export default async function MentorRequestsPage(): Promise<JSX.Element> {
  await requireMentor();
  const { requests } = await getMentorRequests(getServerSessionCookieHeader());

  return (
    <AppPage>
      <Hero
        eyebrow="Mentorship requests"
        title="Students who want your guidance"
        subtitle={<p style={{ margin: 0 }}>Accept to start guiding them and build a plan.</p>}
      />

      <div className="section-stack">
        {requests.length === 0 ? (
          <SurfaceCard>
            <p className="muted-text" style={{ margin: 0 }}>No pending requests right now.</p>
          </SurfaceCard>
        ) : (
          requests.map((request) => (
            <SurfaceCard key={request.id}>
              <h2 style={{ margin: "0 0 4px" }}>{request.student.fullName}</h2>
              <p className="muted-text" style={{ margin: 0 }}>{request.student.email}</p>
              {request.message ? <p style={{ marginTop: "10px" }}>&ldquo;{request.message}&rdquo;</p> : null}
              <RequestActions requestId={request.id} />
            </SurfaceCard>
          ))
        )}
      </div>
    </AppPage>
  );
}
