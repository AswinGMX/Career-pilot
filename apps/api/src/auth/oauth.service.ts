import { createHash, randomBytes } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";

export type OAuthProvider = "google" | "microsoft";

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  fullName: string;
  /**
   * Whether the PROVIDER asserts it has verified this email address.
   *
   * This is the only thing that makes it safe to link an OAuth identity to an
   * existing account by email: without it, anyone who can put an arbitrary
   * address in their provider profile can claim someone else's account. Google
   * asserts it via the `email_verified` claim. Microsoft's userinfo makes no
   * such assertion — and the multi-tenant `common` authority accepts identities
   * from any tenant — so Microsoft profiles are always unverified here.
   */
  emailVerified: boolean;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** Multi-tenant authority. Override with MICROSOFT_TENANT_ID to pin one tenant. */
const MICROSOFT_DEFAULT_TENANT = "common";

function microsoftTenant(): string {
  return process.env.MICROSOFT_TENANT_ID?.trim() || MICROSOFT_DEFAULT_TENANT;
}

function providerConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === "google") {
    return {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile"
    };
  }

  const tenant = encodeURIComponent(microsoftTenant());

  return {
    authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
    scope: "openid email profile"
  };
}

/**
 * OAuth 2.0 authorization-code flow (with PKCE) for Google and Microsoft.
 * Credentials are read from env per provider; the flow is inert
 * (isConfigured=false) until they are set, so the app runs without them and the
 * UI can disable the buttons.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  isProvider(value: string): value is OAuthProvider {
    return value === "google" || value === "microsoft";
  }

  isConfigured(provider: OAuthProvider): boolean {
    return Boolean(this.clientId(provider) && this.clientSecret(provider));
  }

  /** Exact redirect URI that must also be registered in the provider console. */
  redirectUri(provider: OAuthProvider): string {
    const base = process.env.OAUTH_REDIRECT_BASE_URL || "http://localhost:4000/v1";
    return `${base.replace(/\/$/, "")}/auth/oauth/${provider}/callback`;
  }

  /**
   * One-time PKCE pair. The verifier stays with the browser (in an HttpOnly
   * cookie) and is replayed on token exchange, so an authorization code
   * intercepted from the redirect cannot be redeemed by anyone else.
   */
  createPkcePair(): PkcePair {
    const verifier = randomBytes(32).toString("base64url");

    return {
      verifier,
      challenge: createHash("sha256").update(verifier).digest("base64url")
    };
  }

  buildAuthorizeUrl(provider: OAuthProvider, state: string, codeChallenge: string): string {
    const config = providerConfig(provider);
    const params = new URLSearchParams({
      client_id: this.clientId(provider)!,
      redirect_uri: this.redirectUri(provider),
      response_type: "code",
      scope: config.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account"
    });
    return `${config.authUrl}?${params.toString()}`;
  }

  /** Exchanges an authorization code for the user's profile. */
  async fetchProfile(provider: OAuthProvider, code: string, codeVerifier: string): Promise<OAuthProfile> {
    const config = providerConfig(provider);

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId(provider)!,
        client_secret: this.clientSecret(provider)!,
        redirect_uri: this.redirectUri(provider),
        grant_type: "authorization_code",
        code_verifier: codeVerifier
      })
    });
    if (!tokenRes.ok) {
      throw new Error(`${provider} token exchange failed (${tokenRes.status}).`);
    }
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) {
      throw new Error(`${provider} returned no access token.`);
    }

    const infoRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!infoRes.ok) {
      throw new Error(`${provider} userinfo failed (${infoRes.status}).`);
    }
    const info = (await infoRes.json()) as {
      sub?: string;
      oid?: string;
      id?: string;
      email?: string;
      email_verified?: boolean | string;
      preferred_username?: string;
      name?: string;
      given_name?: string;
    };

    const providerAccountId = info.sub || info.oid || info.id || "";
    const email = (info.email || info.preferred_username || "").trim();
    if (!providerAccountId || !email) {
      throw new Error(`${provider} profile missing id or email.`);
    }

    const emailVerified = this.isEmailVerified(provider, info.email, info.email_verified);
    if (!emailVerified) {
      this.logger.log(`${provider} profile has an unverified email; account linking will be refused.`);
    }

    return {
      providerAccountId,
      email,
      emailVerified,
      fullName: info.name || info.given_name || email.split("@")[0]
    };
  }

  /**
   * Only trust an email the provider explicitly marks verified, and only when
   * it came from the `email` claim (`preferred_username` is a UPN the tenant
   * controls, not a verified address).
   */
  private isEmailVerified(
    provider: OAuthProvider,
    emailClaim: string | undefined,
    verifiedClaim: boolean | string | undefined
  ): boolean {
    if (provider !== "google" || !emailClaim?.trim()) {
      return false;
    }

    return verifiedClaim === true || verifiedClaim === "true";
  }

  private clientId(provider: OAuthProvider): string | undefined {
    return process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  }

  private clientSecret(provider: OAuthProvider): string | undefined {
    return process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  }
}
