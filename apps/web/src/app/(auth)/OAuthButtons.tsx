"use client";

/**
 * Social sign-in buttons. They are full-page navigations to the API's OAuth
 * `start` endpoint (not fetch) so the browser follows the provider redirect.
 * The endpoint degrades to /login?error=oauth_unavailable when a provider's
 * credentials are not configured, so these are always safe to render.
 */
function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";
}

export function OAuthButtons(): JSX.Element {
  return (
    <div className="oauth-buttons">
      <a className="oauth-btn" href={`${apiBase()}/auth/oauth/google/start`}>
        <span className="oauth-btn-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
        </span>
        Continue with Google
      </a>
      <a className="oauth-btn" href={`${apiBase()}/auth/oauth/microsoft/start`}>
        <span className="oauth-btn-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path fill="#F25022" d="M0 0h7.6v7.6H0z" />
            <path fill="#7FBA00" d="M8.4 0H16v7.6H8.4z" />
            <path fill="#00A4EF" d="M0 8.4h7.6V16H0z" />
            <path fill="#FFB900" d="M8.4 8.4H16V16H8.4z" />
          </svg>
        </span>
        Continue with Microsoft
      </a>
      <div className="oauth-divider"><span>OR</span></div>
    </div>
  );
}
