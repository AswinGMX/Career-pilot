import { createElement, lazy, type ComponentType, type ReactElement, type ReactNode } from "react";
import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";

import { AuthGuard } from "@/routes/guards/AuthGuard";
import { RoleGuard } from "@/routes/guards/RoleGuard";
import { routePaths } from "@/routes/paths";
import { AdminLayout, AppLayout, AuthLayout, DashboardLayout, SettingsLayout } from "@/layouts";
import type { RouteMeta } from "@/shared/types";
import { AuthPageSkeleton, ContentPageSkeleton, TablePageSkeleton } from "@/shared/components/Skeletons";

import { RouteSegment } from "./components/RouteSegment";

type PageImporter = () => Promise<{ default: ComponentType }>;

interface RouteDefinition {
  path?: string;
  index?: boolean;
  element: ReactElement;
  children?: RouteDefinition[];
  meta?: RouteMeta;
}

const landingPageImport: PageImporter = () => import("@/pages/landing");
const loginPageImport: PageImporter = () => import("@/pages/login");
const registerPageImport: PageImporter = () => import("@/pages/register");
const forgotPasswordPageImport: PageImporter = () => import("@/pages/forgot-password");
const resetPasswordPageImport: PageImporter = () => import("@/pages/reset-password");
const dashboardHomePageImport: PageImporter = () => import("@/pages/dashboard-home");
const dashboardProfilePageImport: PageImporter = () => import("@/pages/dashboard-profile");
const dashboardCareersPageImport: PageImporter = () => import("@/pages/dashboard-careers");
const dashboardCareerDetailPageImport: PageImporter = () => import("@/pages/dashboard-career-detail");
const dashboardProofPageImport: PageImporter = () => import("@/pages/dashboard-proof");
const dashboardCareerHelpPageImport: PageImporter = () => import("@/pages/dashboard-career-help");
const settingsProfilePageImport: PageImporter = () => import("@/pages/settings-profile");
const settingsSecurityPageImport: PageImporter = () => import("@/pages/settings-security");
const adminOverviewPageImport: PageImporter = () => import("@/pages/admin-overview");
const adminOnboardingPageImport: PageImporter = () => import("@/pages/admin-onboarding");
const adminStudentsPageImport: PageImporter = () => import("@/pages/admin-students");
const adminCareersPageImport: PageImporter = () => import("@/pages/admin-careers");
const adminCareerDetailPageImport: PageImporter = () => import("@/pages/admin-career-detail");
const notFoundPageImport: PageImporter = () => import("@/pages/not-found");

const pagePrefetchers = new Map<string, PageImporter>([
  [routePaths.home, landingPageImport],
  [routePaths.login, loginPageImport],
  [routePaths.register, registerPageImport],
  [routePaths.forgotPassword, forgotPasswordPageImport],
  [routePaths.dashboard, dashboardHomePageImport],
  [routePaths.dashboardProfile, dashboardProfilePageImport],
  [routePaths.dashboardCareers, dashboardCareersPageImport],
  [routePaths.dashboardProof, dashboardProofPageImport],
  [routePaths.dashboardCareerHelp, dashboardCareerHelpPageImport],
  [routePaths.settingsProfile, settingsProfilePageImport],
  [routePaths.settingsSecurity, settingsSecurityPageImport],
  [routePaths.adminOverview, adminOverviewPageImport],
  [routePaths.adminOnboarding, adminOnboardingPageImport],
  [routePaths.adminStudents, adminStudentsPageImport],
  [routePaths.adminCareers, adminCareersPageImport]
]);

function lazyElement(importer: PageImporter, fallback: ReactNode, segmentLabel: string): ReactElement {
  const Component = lazy(importer);

  return createElement(
    RouteSegment,
    { fallback, segmentLabel },
    createElement(Component)
  );
}

function attachMeta(route: RouteDefinition): RouteObject {
  const handle = route.meta ? { routeMeta: route.meta } : undefined;

  if (route.index) {
    return {
      index: true,
      element: route.element,
      handle
    };
  }

  return {
    path: route.path,
    element: route.element,
    handle,
    children: route.children?.map(attachMeta)
  };
}

const routeDefinitions: RouteDefinition[] = [
  {
    path: "/",
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: lazyElement(landingPageImport, createElement(ContentPageSkeleton), "Landing page"),
        meta: {
          id: "landing",
          label: "Home",
          icon: "home",
          section: "public",
          nav: true
        }
      },
      {
        element: createElement(AuthLayout),
        children: [
          {
            path: routePaths.login,
            element: lazyElement(loginPageImport, createElement(AuthPageSkeleton), "Login"),
            meta: {
              id: "login",
              label: "Login",
              icon: "login",
              parent: "landing",
              section: "public"
            }
          },
          {
            path: routePaths.register,
            element: lazyElement(registerPageImport, createElement(AuthPageSkeleton), "Register"),
            meta: {
              id: "register",
              label: "Register",
              icon: "user-plus",
              parent: "landing",
              section: "public"
            }
          },
          {
            path: routePaths.forgotPassword,
            element: lazyElement(forgotPasswordPageImport, createElement(AuthPageSkeleton), "Forgot password"),
            meta: {
              id: "forgot-password",
              label: "Forgot password",
              icon: "lock",
              parent: "login",
              section: "public"
            }
          },
          {
            path: routePaths.resetPassword,
            element: lazyElement(resetPasswordPageImport, createElement(AuthPageSkeleton), "Reset password"),
            meta: {
              id: "reset-password",
              label: "Reset password",
              icon: "shield",
              parent: "forgot-password",
              section: "public"
            }
          }
        ]
      },
      {
        path: routePaths.dashboard,
        element: createElement(
          AuthGuard,
          null,
          createElement(RoleGuard, { role: "student" }, createElement(DashboardLayout))
        ),
        meta: {
          id: "dashboard",
          label: "Dashboard",
          icon: "dashboard",
          section: "dashboard",
          requiresAuth: true,
          nav: true
        },
        children: [
          {
            index: true,
            element: lazyElement(dashboardHomePageImport, createElement(ContentPageSkeleton), "Dashboard"),
            meta: {
              id: "dashboard-home",
              label: "Overview",
              icon: "overview",
              parent: "dashboard",
              section: "dashboard",
              requiresAuth: true
            }
          },
          {
            path: "profile",
            element: lazyElement(dashboardProfilePageImport, createElement(ContentPageSkeleton), "Profile studio"),
            meta: {
              id: "dashboard-profile",
              label: "Profile Studio",
              icon: "sparkles",
              parent: "dashboard",
              section: "dashboard",
              requiresAuth: true
            }
          },
          {
            path: "careers",
            element: lazyElement(dashboardCareersPageImport, createElement(ContentPageSkeleton), "Career explorer"),
            meta: {
              id: "dashboard-careers",
              label: "Careers",
              icon: "briefcase",
              parent: "dashboard",
              section: "dashboard",
              requiresAuth: true
            }
          },
          {
            path: "careers/:careerId",
            element: lazyElement(dashboardCareerDetailPageImport, createElement(ContentPageSkeleton), "Career detail"),
            meta: {
              id: "dashboard-career-detail",
              label: "Career Detail",
              icon: "briefcase",
              parent: "dashboard-careers",
              section: "dashboard",
              requiresAuth: true
            }
          },
          {
            path: "proof",
            element: lazyElement(dashboardProofPageImport, createElement(ContentPageSkeleton), "Proof center"),
            meta: {
              id: "dashboard-proof",
              label: "Proof Center",
              icon: "shield-check",
              parent: "dashboard",
              section: "dashboard",
              requiresAuth: true
            }
          },
          {
            path: "career-help",
            element: lazyElement(dashboardCareerHelpPageImport, createElement(ContentPageSkeleton), "Career help"),
            meta: {
              id: "dashboard-career-help",
              label: "Career Help",
              icon: "sparkles",
              parent: "dashboard-proof",
              section: "dashboard",
              requiresAuth: true
            }
          }
        ]
      },
      {
        path: "/settings",
        element: createElement(AuthGuard, null, createElement(SettingsLayout)),
        meta: {
          id: "settings",
          label: "Settings",
          icon: "settings",
          section: "settings",
          requiresAuth: true
        },
        children: [
          {
            index: true,
            element: createElement(Navigate, { replace: true, to: routePaths.settingsProfile })
          },
          {
            path: "profile",
            element: lazyElement(settingsProfilePageImport, createElement(ContentPageSkeleton), "Profile settings"),
            meta: {
              id: "settings-profile",
              label: "Profile",
              icon: "user",
              parent: "settings",
              section: "settings",
              requiresAuth: true
            }
          },
          {
            path: "security",
            element: lazyElement(settingsSecurityPageImport, createElement(ContentPageSkeleton), "Security settings"),
            meta: {
              id: "settings-security",
              label: "Security",
              icon: "shield",
              parent: "settings",
              section: "settings",
              requiresAuth: true
            }
          }
        ]
      },
      {
        path: "/admin",
        element: createElement(
          AuthGuard,
          null,
          createElement(RoleGuard, { role: "admin" }, createElement(AdminLayout))
        ),
        meta: {
          id: "admin",
          label: "Admin",
          icon: "building",
          section: "admin",
          requiresAuth: true,
          role: "admin"
        },
        children: [
          {
            index: true,
            element: createElement(Navigate, { replace: true, to: routePaths.adminOverview })
          },
          {
            path: "overview",
            element: lazyElement(adminOverviewPageImport, createElement(TablePageSkeleton), "Admin overview"),
            meta: {
              id: "admin-overview",
              label: "Overview",
              icon: "chart",
              parent: "admin",
              section: "admin",
              requiresAuth: true,
              role: "admin"
            }
          },
          {
            path: "onboarding",
            element: lazyElement(adminOnboardingPageImport, createElement(ContentPageSkeleton), "Admin onboarding"),
            meta: {
              id: "admin-onboarding",
              label: "Onboarding",
              icon: "user-plus",
              parent: "admin",
              section: "admin",
              requiresAuth: true,
              role: "admin"
            }
          },
          {
            path: "students",
            element: lazyElement(adminStudentsPageImport, createElement(TablePageSkeleton), "Admin students"),
            meta: {
              id: "admin-students",
              label: "Student Details",
              icon: "users",
              parent: "admin",
              section: "admin",
              requiresAuth: true,
              role: "admin"
            }
          },
          {
            path: "careers",
            element: lazyElement(adminCareersPageImport, createElement(ContentPageSkeleton), "Admin careers"),
            meta: {
              id: "admin-careers",
              label: "Careers",
              icon: "briefcase",
              parent: "admin",
              section: "admin",
              requiresAuth: true,
              role: "admin"
            }
          },
          {
            path: "careers/:careerId",
            element: lazyElement(adminCareerDetailPageImport, createElement(ContentPageSkeleton), "Admin career detail"),
            meta: {
              id: "admin-career-detail",
              label: "Career Detail",
              icon: "briefcase",
              parent: "admin-careers",
              section: "admin",
              requiresAuth: true,
              role: "admin"
            }
          }
        ]
      },
      {
        path: "*",
        element: lazyElement(notFoundPageImport, createElement(ContentPageSkeleton), "Not found"),
        meta: {
          id: "not-found",
          label: "Not Found",
          icon: "alert",
          section: "public"
        }
      }
    ]
  }
];

export const routesConfig: RouteObject[] = routeDefinitions.map(attachMeta);
export const appRouter = createBrowserRouter(routesConfig);

export function prefetchRouteByPath(pathname: string): void {
  const normalizedPath = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  pagePrefetchers.get(normalizedPath)?.();
}
