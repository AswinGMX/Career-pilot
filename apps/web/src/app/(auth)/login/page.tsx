import Link from "next/link";

import { redirectIfAuthenticated } from "@/lib/session";
import { LandingLayout } from "@/components/landing-layout";
import { DynamicGreeting } from "@/components/dynamic-greeting";

import { LandingLoginForm } from "../AuthForm";

export default async function LoginPage(): Promise<JSX.Element> {
  await redirectIfAuthenticated();

  return (
    <LandingLayout>
      <p className="landing-greeting">Hello!</p>
      <DynamicGreeting />
      <h2 className="landing-form-title">Login Your Account</h2>

      <LandingLoginForm />

      <div className="landing-form-footer">
        <Link href="/forgot-password">Forgot Password?</Link>
        <Link href="/register">Create Account →</Link>
      </div>
    </LandingLayout>
  );
}
