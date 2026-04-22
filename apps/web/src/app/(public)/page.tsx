import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/api";
import { getDefaultAppPath, getServerSessionCookieHeader } from "@/lib/session";
import { LandingHero } from "@/components/landing-layout";
import { DynamicGreeting } from "@/components/dynamic-greeting";

export const dynamic = "force-dynamic";

export default async function LandingPage(): Promise<JSX.Element> {
  const auth = await getSession(getServerSessionCookieHeader());

  if (auth.session) {
    redirect(getDefaultAppPath(auth.session));
  }

  return (
    <LandingHero>
      <p className="landing-greeting">Hello!</p>
      <DynamicGreeting />
      <h2 className="landing-form-title">Welcome to Career Pilot</h2>
      <p className="landing-form-subtitle">
        Sign in or create a free account to begin your journey.
      </p>

      <div className="landing-hero-cta">
        <Link href="/login" className="landing-btn-primary" style={{ textDecoration: "none" }}>
          Sign In
        </Link>
        <Link href="/register" className="landing-btn-outline">
          Create Account
        </Link>
      </div>

      <div className="landing-form-badges">
        <span>🔒 Secure</span>
        <span>⚡ Fast</span>
        <span>🎓 Students</span>
        <span>🤖 AI</span>
      </div>
      <p className="landing-form-free-note">Free to join · No credit card required</p>
    </LandingHero>
  );
}
