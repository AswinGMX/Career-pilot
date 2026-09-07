# Social Sign-In (Google & Microsoft OAuth) — Setup

The OAuth flow is fully implemented (authorization-code, state/CSRF protection,
user provisioning, session). It stays **inert until credentials are set** — the
buttons render but bounce to `/login?error=oauth_unavailable` until then. To make
sign-in actually work you must create OAuth apps in the provider consoles (this
cannot be done from code) and paste the values into `apps/api/.env`.

## Redirect (callback) URIs to register

The API exposes:

- `GET /v1/auth/oauth/google/start` and `/v1/auth/oauth/google/callback`
- `GET /v1/auth/oauth/microsoft/start` and `/v1/auth/oauth/microsoft/callback`

Register the **callback** URL in each console. It must match
`OAUTH_REDIRECT_BASE_URL` + `/auth/oauth/<provider>/callback` exactly:

- Local dev: `http://localhost:4000/v1/auth/oauth/google/callback`
  and `http://localhost:4000/v1/auth/oauth/microsoft/callback`
- Production: `https://<api-domain>/v1/auth/oauth/<provider>/callback`

## Google

1. https://console.cloud.google.com → APIs & Services → Credentials.
2. Create **OAuth client ID** → Web application.
3. Add the callback URI above to **Authorized redirect URIs**.
4. Copy the Client ID / Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## Microsoft

1. https://portal.azure.com → App registrations → New registration.
2. Supported account types: choose multi-tenant + personal if you want the
   default `common` authority. For a school deployment, register a single-tenant
   app and set `MICROSOFT_TENANT_ID` so only that tenant's identities are
   accepted — `common` accepts an identity from *any* Microsoft tenant.
3. Add a **Web** redirect URI = the callback above.
4. Certificates & secrets → New client secret.
5. Copy Application (client) ID / secret into `MICROSOFT_CLIENT_ID` /
   `MICROSOFT_CLIENT_SECRET`.

## Env summary (`apps/api/.env`)

```
APP_BASE_URL=http://localhost:3000
OAUTH_REDIRECT_BASE_URL=http://localhost:4000/v1
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
# Optional: pin one Azure AD tenant instead of the multi-tenant `common`.
MICROSOFT_TENANT_ID=
```

Restart the API after setting these. New users signing in via a provider get a
passwordless `individual` account.

## Account linking policy

An OAuth identity is linked to an **existing** account only when the provider
asserts that it verified the email address:

- **Google** — linked when the `email_verified` claim is true.
- **Microsoft** — never linked. Graph's userinfo makes no verification
  assertion, and with the `common` authority the address can come from any
  tenant, so a matching email is treated as a collision: the callback redirects
  to `/login?error=oauth_email_in_use` and the user signs in with their password
  instead. Sign-in still works normally for identities that do not collide with
  an existing account.

Without that rule, anyone able to put an arbitrary address in their own provider
profile could sign in as the owner of that address — the linking step grants
full access to the existing account.

## Notes / hardening

- A new user provisioned via OAuth lands on the student experience
  (`/student/dashboard`). Role/tenant assignment for OAuth users is a follow-up.
- The state parameter is stored in a short-lived HttpOnly cookie and compared
  in constant time on callback (CSRF protection).
- The flow uses PKCE (S256). The verifier is held in an HttpOnly cookie and
  replayed on token exchange, so an intercepted authorization code cannot be
  redeemed by anyone else.
- The session cookie is host-scoped; in dev (`localhost:4000` API,
  `localhost:3000` web) it is shared because cookies ignore port.
