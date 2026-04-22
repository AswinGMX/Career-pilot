import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { requireStudent } from "@/lib/session";

export default async function StudentLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await requireStudent();

  return (
    <div className="app-shell">
      <AppSidebar session={session} role="student" />
      <div className="app-main">{children}</div>
    </div>
  );
}
