import { AppPage, Hero } from "@/components/page-chrome";
import { getMentorStudents } from "@/lib/api";
import { getServerSessionCookieHeader, requireMentor } from "@/lib/session";

import { MessagesWorkspace } from "./MessagesWorkspace";

export const dynamic = "force-dynamic";

export default async function MentorMessagesPage(): Promise<JSX.Element> {
  await requireMentor();
  const { students } = await getMentorStudents(getServerSessionCookieHeader());

  const conversations = students.map((student) => ({
    requestId: student.requestId,
    name: student.fullName,
    subtitle: student.email
  }));

  return (
    <AppPage>
      <Hero
        eyebrow="Messages"
        title="Your conversations"
        subtitle={<p style={{ margin: 0 }}>Chat with the students you&rsquo;re guiding.</p>}
      />

      <div className="section-stack">
        <MessagesWorkspace conversations={conversations} />
      </div>
    </AppPage>
  );
}
