import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { requireSession } from "@/lib/session";

/**
 * Chrome for account settings.
 *
 * Every signed-in role reaches this page, so it resolves the role from the
 * session rather than assuming one — a school admin editing their own profile
 * must not be handed the student sidebar, and a student who also mentors must
 * not be bounced out of their own settings.
 */
export default async function AccountLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await requireSession();

  const role =
    session.activeMembership?.role === "school_admin"
      ? "school_admin"
      : session.activeMembership?.role === "student"
        ? "student"
        : session.mentor
          ? "mentor"
          : "student";

  return (
    <div className="app-shell">
      <AppSidebar session={session} role={role} />
      <div className="app-main">{children}</div>
    </div>
  );
}
