import Link from "next/link";

import { redirectIfAuthenticated } from "@/lib/session";
import { LandingLayout } from "@/components/landing-layout";

import { LandingForgotPasswordForm } from "../AuthForm";

export default async function ForgotPasswordPage(): Promise<JSX.Element> {
  await redirectIfAuthenticated();

  return (
    <LandingLayout>
      <p className="landing-greeting">Hello!</p>
      <p className="landing-greeting-highlight">Reset Password 🔑</p>
      <h2 className="landing-form-title">Forgot Your Password?</h2>
      <p className="landing-form-subtitle">
        Enter your email and we&apos;ll send you a reset token.
      </p>

      <LandingForgotPasswordForm />

      <div className="landing-form-footer">
        <Link href="/login">← Back to Login</Link>
        <Link href="/register">Create Account →</Link>
      </div>
    </LandingLayout>
  );
}
