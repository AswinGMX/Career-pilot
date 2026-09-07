import type { ReactNode } from "react";

import type { AuthSessionPayload } from "@career-pilot/types";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserCard } from "./sidebar-account";

/** Minimal stroke icon set (no external deps) — inherits currentColor. */
function NavIcon({ name }: { name: string }): JSX.Element {
  const paths: Record<string, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      </>
    ),
    journey: (
      <>
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="6" r="2.4" />
        <path d="M7.7 16.3 16.3 7.7" strokeDasharray="2 2.4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6" />
      </>
    ),
    careers: (
      <>
        <rect x="3" y="7.5" width="18" height="12.5" rx="2.4" />
        <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
        <path d="M3 12.5h18" />
      </>
    ),
    recommendations: <path d="M12 3.2l2.3 6L20.5 11l-6.2 1.8L12 19l-2.3-6.2L3.5 11l6.2-1.8z" />,
    programs: (
      <>
        <path d="M12 3.2 3.4 8 12 12.8 20.6 8 12 3.2z" />
        <path d="m3.4 13 8.6 4.8L20.6 13" />
      </>
    ),
    proof: (
      <>
        <path d="M12 3.2 5.2 6v5.2c0 4.1 3 7 6.8 8 3.8-1 6.8-3.9 6.8-8V6L12 3.2z" />
        <path d="m9 12 2.1 2.1L15 10.3" />
      </>
    ),
    report: (
      <>
        <path d="M7 3.2h6.5l4.5 4.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1z" />
        <path d="M13 3.2v5h5" />
        <path d="M9 13.5h6M9 17h6" />
      </>
    ),
    students: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.2 19.2c0-3.2 2.9-5 5.8-5s5.8 1.8 5.8 5" />
        <path d="M16.5 6.4a3 3 0 0 1 0 5.6M21 19.2c0-2.4-1.6-4.1-3.9-4.7" />
      </>
    )
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.overview}
    </svg>
  );
}

const studentNav = [
  { href: "/student/dashboard", label: "Overview", icon: <NavIcon name="overview" /> },
  { href: "/student/profile", label: "Profile Studio", icon: <NavIcon name="profile" /> },
  { href: "/student/careers", label: "Careers", icon: <NavIcon name="careers" /> },
  { href: "/student/recommendations", label: "Recommendations", icon: <NavIcon name="recommendations" /> },
  { href: "/student/programs", label: "Programs", icon: <NavIcon name="programs" /> },
  { href: "/student/proof-sessions", label: "Proof Center", icon: <NavIcon name="proof" /> },
  { href: "/student/mentors", label: "Mentors", icon: <NavIcon name="students" /> },
  { href: "/student/report", label: "Report", icon: <NavIcon name="report" /> }
];

const schoolNav = [
  { href: "/school/dashboard", label: "Overview", icon: <NavIcon name="overview" /> },
  { href: "/school/students", label: "Students", icon: <NavIcon name="students" /> },
  { href: "/school/programs", label: "Programs (Studio)", icon: <NavIcon name="programs" /> },
  { href: "/school/report", label: "School Report", icon: <NavIcon name="report" /> }
];

const mentorNav = [
  { href: "/mentor/dashboard", label: "Overview", icon: <NavIcon name="overview" /> },
  { href: "/mentor/requests", label: "Requests", icon: <NavIcon name="recommendations" /> },
  { href: "/mentor/students", label: "Students", icon: <NavIcon name="students" /> },
  { href: "/mentor/profile", label: "Mentor Profile", icon: <NavIcon name="profile" /> }
];

export function AppSidebar({
  session,
  role
}: {
  session: AuthSessionPayload;
  role: "student" | "school_admin" | "mentor";
}): JSX.Element {
  const navItems = role === "school_admin" ? schoolNav : role === "mentor" ? mentorNav : studentNav;
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
        <SidebarUserCard name={displayName} email={session.user.email} org={tenantName} />
      </div>
    </aside>
  );
}
