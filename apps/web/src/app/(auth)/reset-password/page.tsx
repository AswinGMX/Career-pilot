import Link from "next/link";

import { ResetPasswordForm } from "../AuthForm";
import { redirectIfAuthenticated } from "@/lib/session";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: { token?: string };
}): Promise<JSX.Element> {
  await redirectIfAuthenticated();

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: "#4b6480", fontSize: "12px" }}>Auth</p>
      <h1 style={{ marginTop: "8px", fontSize: "36px" }}>Reset password</h1>
      <p style={{ color: "#334a62", lineHeight: 1.6 }}>
        Use the reset token returned by the forgot-password flow to set a new password.
      </p>
      <ResetPasswordForm initialToken={searchParams?.token || ""} />
      <p style={{ marginTop: "16px" }}>
        <Link href="/login">Back to login</Link>
      </p>
    </main>
  );
}
