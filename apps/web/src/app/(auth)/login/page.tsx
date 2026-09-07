import Link from "next/link";

import { redirectIfAuthenticated } from "@/lib/session";
import { LandingLayout } from "@/components/landing-layout";

import { LandingLoginForm } from "../AuthForm";
import { OAuthButtons } from "../OAuthButtons";
import { TrustBadges } from "../TrustBadges";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unavailable: "Social sign-in isn't configured yet. Use your email and password.",
  oauth_state: "Sign-in session expired. Please try again.",
  oauth_email_in_use:
    "An account already uses that email address. Sign in with your password, then connect this provider from your account settings.",
  oauth_failed: "We couldn't complete social sign-in. Please try again."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}): Promise<JSX.Element> {
  await redirectIfAuthenticated();
  const errorMessage = searchParams?.error ? OAUTH_ERRORS[searchParams.error] : null;

  return (
    <LandingLayout>
      <p className="landing-greeting-highlight">Welcome Back! 👋</p>
      <h2 className="landing-form-title">Sign in to your account</h2>
      <p className="landing-form-subtitle">Continue your journey with Career Pilot</p>

      {errorMessage ? <p className="landing-error">{errorMessage}</p> : null}

      <OAuthButtons />

      <LandingLoginForm />

      <TrustBadges />

      <div className="landing-form-footer">
        <span className="footer-muted">New to Career Pilot?</span>
        <Link href="/register">Create an Account</Link>
      </div>
    </LandingLayout>
  );
}
