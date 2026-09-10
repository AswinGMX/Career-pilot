import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthSessionPayload } from "@career-pilot/types";

import { getSession } from "./api";

const SESSION_COOKIE_NAME = "career_pilot_session";

export function getServerSessionCookieHeader(): string | undefined {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return undefined;
  }

  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionCookie)}`;
}

export function getDefaultAppPath(session: AuthSessionPayload | null): string {
  if (!session) {
    return "/";
  }

  if (session.activeMembership?.role === "school_admin") {
    return "/school/dashboard";
  }

  if (session.mentor) {
    return "/mentor/dashboard";
  }

  if (session.activeMembership?.role === "student") {
    return "/student/dashboard";
  }

  return "/student/dashboard";
}

export async function getCurrentSession(): Promise<AuthSessionPayload | null> {
  const auth = await getSession(getServerSessionCookieHeader());
  return auth.session;
}

export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getCurrentSession();

  if (session) {
    redirect(getDefaultAppPath(session));
  }
}

export async function requireSession(): Promise<AuthSessionPayload> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireSchoolAdmin(): Promise<AuthSessionPayload> {
  const session = await requireSession();

  if (session.activeMembership?.role !== "school_admin") {
    redirect(getDefaultAppPath(session));
  }

  return session;
}

export async function requireStudent(): Promise<AuthSessionPayload> {
  const session = await requireSession();

  if (session.activeMembership?.role === "school_admin") {
    redirect("/school/dashboard");
  }

  if (session.mentor) {
    redirect("/mentor/dashboard");
  }

  return session;
}

export async function requireMentor(): Promise<AuthSessionPayload> {
  const session = await requireSession();

  if (!session.mentor) {
    redirect(getDefaultAppPath(session));
  }

  return session;
}
