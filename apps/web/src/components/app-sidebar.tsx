import type { AuthSessionPayload } from "@career-pilot/types";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserCard } from "./sidebar-account";

const studentNav = [
  { href: "/student/dashboard", label: "Overview" },
  { href: "/student/profile", label: "Profile Studio" },
  { href: "/student/careers", label: "Careers" },
  { href: "/student/recommendations", label: "Recommendations" },
  { href: "/student/proof-sessions", label: "Proof Center" },
  { href: "/student/report", label: "Report" },
];

const schoolNav = [
  { href: "/school/dashboard", label: "Overview" },
  { href: "/school/students", label: "Students" },
  { href: "/school/report", label: "School Report" },
];

export function AppSidebar({
  session,
  role,
}: {
  session: AuthSessionPayload;
  role: "student" | "school_admin";
}): JSX.Element {
  const navItems = role === "school_admin" ? schoolNav : studentNav;
  const displayName = session.user.fullName;
  const tenantName = session.activeMembership?.tenant?.name;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🚀</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Career Pilot</span>
            <span className="sidebar-brand-sub">AI Platform</span>
          </div>
        </div>

        <SidebarNav items={navItems} />
      </div>

      <div className="sidebar-bottom">
        <SidebarUserCard
          name={displayName}
          email={session.user.email}
          org={tenantName}
        />
      </div>
    </aside>
  );
}
