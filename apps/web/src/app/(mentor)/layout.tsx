import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { FloatingChat } from "@/components/floating-chat";
import { requireMentor } from "@/lib/session";

export default async function MentorLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await requireMentor();

  return (
    <div className="app-shell">
      <AppSidebar session={session} role="mentor" />
      <div className="app-main">{children}</div>
      <FloatingChat role="mentor" />
    </div>
  );
}
