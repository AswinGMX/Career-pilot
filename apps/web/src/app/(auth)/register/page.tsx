import Link from "next/link";

import { redirectIfAuthenticated } from "@/lib/session";
import { LandingLayout } from "@/components/landing-layout";

import { LandingRegisterForm } from "../AuthForm";

export default async function RegisterPage(): Promise<JSX.Element> {
  await redirectIfAuthenticated();

  return (
    <LandingLayout>
      <p className="landing-greeting">Hello!</p>
      <p className="landing-greeting-highlight">Get Started 🚀</p>
      <h2 className="landing-form-title">Create Your Account</h2>
      <p className="landing-form-subtitle">
        Join Career Pilot and start exploring your future today.
      </p>

      <LandingRegisterForm />

      <div className="landing-form-footer">
        <span className="footer-muted">Already have an account?</span>
        <Link href="/login">Sign In →</Link>
      </div>
    </LandingLayout>
  );
}
