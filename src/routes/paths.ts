export const routePaths = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password/:token",
  dashboard: "/dashboard",
  settings: "/settings",
  admin: "/admin",
  dashboardProfile: "/dashboard/profile",
  dashboardCareers: "/dashboard/careers",
  dashboardCareerDetail: "/dashboard/careers/:careerId",
  dashboardProof: "/dashboard/proof",
  dashboardCareerHelp: "/dashboard/career-help",
  settingsProfile: "/settings/profile",
  settingsSecurity: "/settings/security",
  adminOverview: "/admin/overview",
  adminOnboarding: "/admin/onboarding",
  adminStudents: "/admin/students",
  adminCareers: "/admin/careers",
  adminCareerDetail: "/admin/careers/:careerId"
} as const;

export function buildDashboardCareerDetailPath(careerId: string): string {
  return `/dashboard/careers/${careerId}`;
}

export function buildAdminCareerDetailPath(careerId: string): string {
  return `/admin/careers/${careerId}`;
}

export function buildAdminStudentDetailsPath(studentId?: string): string {
  if (!studentId) {
    return routePaths.adminStudents;
  }

  return `${routePaths.adminStudents}?studentId=${encodeURIComponent(studentId)}`;
}

export const dashboardNavItems = [
  { to: routePaths.dashboard, label: "Overview", end: true },
  { to: routePaths.dashboardProfile, label: "Profile Studio" },
  { to: routePaths.dashboardCareers, label: "Careers" },
  { to: routePaths.dashboardProof, label: "Proof Center" }
] as const;

export const settingsNavItems = [
  { to: routePaths.settingsProfile, label: "Profile" },
  { to: routePaths.settingsSecurity, label: "Security" }
] as const;

export const adminNavItems = [
  { to: routePaths.adminOverview, label: "Overview" },
  { to: routePaths.adminOnboarding, label: "Onboarding" },
  { to: routePaths.adminStudents, label: "Student Details" },
  { to: routePaths.adminCareers, label: "Careers" }
] as const;
