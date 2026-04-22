"use client";

import { useState } from "react";

import type {
  AuthMeResponse,
  ForgotPasswordPayload,
  PasswordResetResponse,
  RegisterAccountType,
  RegisterPayload
} from "@career-pilot/types";

function getDefaultAppPath(session: AuthMeResponse["session"]): string {
  if (!session) {
    return "/";
  }

  if (session.activeMembership?.role === "school_admin") {
    return "/school/dashboard";
  }

  return "/student/dashboard";
}

function redirectToApp(session: AuthMeResponse["session"]): void {
  window.location.assign(getDefaultAppPath(session));
}

function getBrowserApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";
}

async function ensureSessionEstablished(): Promise<AuthMeResponse> {
  const apiBaseUrl = getBrowserApiBaseUrl();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      credentials: "include",
      cache: "no-store"
    });

    if (response.ok) {
      const json = (await response.json()) as AuthMeResponse;

      if (json.authenticated && json.session) {
        return json;
      }
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 120 * (attempt + 1));
    });
  }

  throw new Error("Login succeeded, but the session was not available yet. Please try again.");
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const apiBaseUrl = getBrowserApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as TResponse & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(json.error || json.message || "Request failed.");
  }

  return json as TResponse;
}

/* ── Old-style input (kept for non-landing pages) ── */

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }): JSX.Element {
  const { label, ...inputProps } = props;

  return (
    <label className="field-label">
      <span>{label}</span>
      <input {...inputProps} className="field-control" />
    </label>
  );
}

/* ── Landing-style field ── */

function LandingField({
  label,
  hint,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  minLength
}: {
  label: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
}): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="landing-field">
      <label className="landing-field-label">
        {label}
        {hint ? <span className="label-hint"> {hint}</span> : null}
      </label>
      <div className={isPassword ? "landing-field-input-wrapper" : ""}>
        <input
          type={isPassword && showPassword ? "text" : type}
          className="landing-field-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
        />
        {isPassword ? (
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Landing Login Form ── */

export function LandingLoginForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
          await postJson<AuthMeResponse>("/auth/login", { email, password });
          const establishedSession = await ensureSessionEstablished();
          redirectToApp(establishedSession.session);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <LandingField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        required
      />
      <LandingField
        label="Password"
        type="password"
        placeholder="Min. 6 characters"
        value={password}
        onChange={setPassword}
        required
      />
      {error ? <p className="landing-error">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} className="landing-btn-primary">
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

/* ── Landing Register Form ── */

const accountTypeLabels: Record<RegisterAccountType, string> = {
  individual: "Solo Student",
  school_admin: "School Admin",
  school_student: "Join School"
};

const accountTypeDescriptions: Record<RegisterAccountType, string> = {
  individual: "Create an independent student account.",
  school_admin: "Create a new school and manage students.",
  school_student: "Join an existing school with a tenant slug."
};

export function LandingRegisterForm(): JSX.Element {
  const [accountType, setAccountType] = useState<RegisterAccountType>("individual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresSchoolName = accountType === "school_admin";
  const requiresTenantSlug = accountType !== "individual";

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const payload: RegisterPayload = {
          accountType,
          fullName,
          email,
          password,
          schoolName: requiresSchoolName ? schoolName : undefined,
          tenantSlug: requiresTenantSlug ? tenantSlug : undefined
        };

        try {
          await postJson<AuthMeResponse>("/auth/register", payload);
          const establishedSession = await ensureSessionEstablished();
          redirectToApp(establishedSession.session);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="landing-tabs">
        {(["individual", "school_admin", "school_student"] as RegisterAccountType[]).map((type) => (
          <button
            key={type}
            type="button"
            className={`landing-tab${accountType === type ? " landing-tab--active" : ""}`}
            onClick={() => setAccountType(type)}
          >
            {accountTypeLabels[type]}
          </button>
        ))}
      </div>
      <p className="landing-tab-description">{accountTypeDescriptions[accountType]}</p>

      <LandingField label="Full Name" placeholder="John Doe" value={fullName} onChange={setFullName} required />
      <LandingField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        required
      />
      {requiresSchoolName ? (
        <LandingField label="School Name" placeholder="e.g. Sunrise Academy" value={schoolName} onChange={setSchoolName} required />
      ) : null}
      {requiresTenantSlug ? (
        <LandingField
          label="Tenant Slug"
          hint="(school only)"
          placeholder="e.g. sunrise-public-school"
          value={tenantSlug}
          onChange={setTenantSlug}
          required
        />
      ) : null}
      <LandingField
        label="Password"
        type="password"
        placeholder="Min. 6 characters"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
      />

      {error ? <p className="landing-error">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} className="landing-btn-primary">
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}

/* ── Keep old forms for backward compatibility ── */

export function LoginForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
          await postJson<AuthMeResponse>("/auth/login", { email, password });
          const establishedSession = await ensureSessionEstablished();
          redirectToApp(establishedSession.session);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="form-stack"
    >
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
      <button type="submit" disabled={isSubmitting} className="button-primary">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export function RegisterForm(): JSX.Element {
  const [accountType, setAccountType] = useState<RegisterAccountType>("individual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresSchoolName = accountType === "school_admin";
  const requiresTenantSlug = accountType !== "individual";

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const payload: RegisterPayload = {
          accountType,
          fullName,
          email,
          password,
          schoolName: requiresSchoolName ? schoolName : undefined,
          tenantSlug: requiresTenantSlug ? tenantSlug : undefined
        };

        try {
          await postJson<AuthMeResponse>("/auth/register", payload);
          const establishedSession = await ensureSessionEstablished();
          redirectToApp(establishedSession.session);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="form-stack"
    >
      <label className="field-label">
        <span>Account type</span>
        <select
          value={accountType}
          onChange={(event) => setAccountType(event.target.value as RegisterAccountType)}
          className="field-control"
        >
          <option value="individual">Individual student</option>
          <option value="school_admin">School admin</option>
          <option value="school_student">School student</option>
        </select>
      </label>
      <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={8}
        required
      />
      {requiresSchoolName ? (
        <Input
          label="School name"
          value={schoolName}
          onChange={(event) => setSchoolName(event.target.value)}
          required
        />
      ) : null}
      {requiresTenantSlug ? (
        <Input
          label="Tenant slug"
          value={tenantSlug}
          onChange={(event) => setTenantSlug(event.target.value)}
          required
        />
      ) : null}
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
      <button type="submit" disabled={isSubmitting} className="button-primary">
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        setResetToken(null);
        setError(null);

        try {
          const response = await postJson<PasswordResetResponse>("/auth/forgot-password", { email } satisfies ForgotPasswordPayload);
          setMessage(response.message);
          setResetToken(response.resetToken || null);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="form-stack"
    >
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
      {message ? <p className="status-text--success" style={{ margin: 0 }}>{message}</p> : null}
      {resetToken ? (
        <p className="muted-text" style={{ margin: 0 }}>
          Development reset token: <code>{resetToken}</code>
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className="button-primary">
        {isSubmitting ? "Preparing reset..." : "Request reset"}
      </button>
    </form>
  );
}

export function LandingForgotPasswordForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        setResetToken(null);
        setError(null);

        try {
          const response = await postJson<PasswordResetResponse>("/auth/forgot-password", { email } satisfies ForgotPasswordPayload);
          setMessage(response.message);
          setResetToken(response.resetToken || null);
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <LandingField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        required
      />
      {error ? <p className="landing-error">{error}</p> : null}
      {message ? <p className="landing-success">{message}</p> : null}
      {resetToken ? (
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6b7280" }}>
          Dev reset token: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>{resetToken}</code>
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className="landing-btn-primary">
        {isSubmitting ? "Preparing reset..." : "Request Reset"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ initialToken }: { initialToken: string }): JSX.Element {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        setError(null);

        try {
          const response = await postJson<PasswordResetResponse>("/auth/reset-password", {
            token,
            newPassword
          });
          setMessage(response.message);
          window.location.assign("/login");
        } catch (caughtError) {
          setError((caughtError as Error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="form-stack"
    >
      <Input label="Reset token" value={token} onChange={(event) => setToken(event.target.value)} required />
      <Input
        label="New password"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        minLength={8}
        required
      />
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
      {message ? <p className="status-text--success" style={{ margin: 0 }}>{message}</p> : null}
      <button type="submit" disabled={isSubmitting} className="button-primary">
        {isSubmitting ? "Resetting password..." : "Reset password"}
      </button>
    </form>
  );
}
