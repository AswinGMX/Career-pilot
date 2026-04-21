import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuthActions } from "@/features/auth";
import { dashboardNavItems, routePaths, settingsNavItems, adminNavItems } from "@/routes/paths";
import { getDefaultPrivateRoute, isAdminUser } from "@/shared/utils";
import { useAuthStore } from "@/store";
import { AppNavLink } from "./AppNavLink";

interface AppSidebarProps {
  section: "dashboard" | "settings" | "admin";
}

const sectionNav = {
  dashboard: dashboardNavItems,
  settings:  settingsNavItems,
  admin:     adminNavItems,
} as const;

const sectionLabel = {
  dashboard: "Navigation",
  settings:  "Settings",
  admin:     "Admin",
} as const;

export function AppSidebar({ section }: AppSidebarProps): JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { isSubmitting, logout } = useAuthActions();
  const navItems = sectionNav[section];
  const [showLogout, setShowLogout] = useState(false);
  const isAdmin = isAdminUser(session?.user);
  const defaultPrivateRoute = session?.user ? getDefaultPrivateRoute(session) : routePaths.dashboard;
  const settingsBackLabel = isAdmin ? "← Admin" : "← Dashboard";

  return (
    <aside className="sidebar" style={{
      width: "240px", flexShrink: 0,
      background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
      display: "flex", flexDirection: "column",
      padding: "24px 16px",
      position: "sticky", top: 0, height: "100vh",
      borderRight: "1px solid rgba(99,102,241,0.15)",
    }}>

      {/* Logo */}
      <Link to={routePaths.home} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "28px", padding: "0 8px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🚀</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "14px", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Career Pilot</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", letterSpacing: "0.06em" }}>AI PLATFORM</div>
        </div>
      </Link>

      {/* User card */}
      <div style={{ padding: "12px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "10px", marginBottom: "24px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginBottom: "8px" }}>🎓</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "13px", lineHeight: 1.3, marginBottom: "2px" }}>
          {session?.user?.fullName || "Student"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
          {session?.tenant?.name || "Independent"}
        </div>
      </div>

      {/* Section nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 8px", marginBottom: "6px" }}>
          {sectionLabel[section]}
        </div>
        {navItems.map((item) => (
          <AppNavLink key={item.to} label={item.label} to={item.to} end={"end" in item ? (item as { end?: boolean }).end : false} />
        ))}
      </nav>

      {/* Cross-section links */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "8px" }}>
        {!isAdmin && section !== "dashboard" && (
          <AppNavLink label="← Dashboard" to={routePaths.dashboard} />
        )}
        {isAdmin && section === "settings" && (
          <AppNavLink label={settingsBackLabel} to={defaultPrivateRoute} />
        )}
        {section !== "settings" && (
          <AppNavLink label="⚙️  Settings" to={routePaths.settingsProfile} />
        )}
        {isAdmin && section !== "admin" && section !== "settings" && (
          <AppNavLink label="🏫  Admin" to={routePaths.adminOverview} />
        )}
        {/* Email + Sign out (toggleable) */}
        {session?.user?.email && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => setShowLogout((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                width: "100%", padding: "8px 12px", borderRadius: "8px",
                background: showLogout ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                border: showLogout ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                transition: "all 0.15s", textAlign: "left",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {session.user.email}
              </span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", flexShrink: 0 }}>
                {showLogout ? "▲" : "▼"}
              </span>
            </button>

            {showLogout && (
              <button
                disabled={isSubmitting}
                onClick={() => void logout()}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "9px 12px",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "8px", color: "#fca5a5", fontSize: "13px",
                  fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "14px" }}>←</span>
                Log out
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
