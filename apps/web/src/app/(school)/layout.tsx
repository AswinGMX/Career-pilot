import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { requireSchoolAdmin } from "@/lib/session";

export default async function SchoolLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await requireSchoolAdmin();

  return (
    <div className="app-shell">
      <AppSidebar session={session} role="school_admin" />
      <div className="app-main">{children}</div>
    </div>
  );
}
