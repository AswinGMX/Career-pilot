import { randomBytes, timingSafeEqual } from "node:crypto";

import type { Request, Response } from "express";

import { Controller, Get, Logger, Param, Query, Req, Res } from "@nestjs/common";

import { AuthService, OAuthLinkNotVerifiedError } from "./auth.service";
import { OAuthService } from "./oauth.service";

const STATE_COOKIE = "cp_oauth_state";
const VERIFIER_COOKIE = "cp_oauth_verifier";
/** The flow is a single redirect round-trip; anything longer is a stale tab. */
const FLOW_TTL_SECONDS = 600;

/**
 * OAuth entrypoints. `start` redirects the browser to the provider; `callback`
 * exchanges the code, provisions/links the user, mints a session cookie, and
 * bounces back to the app. Both degrade gracefully to the login page with an
 * error query when a provider is not configured or the flow fails.
 */
@Controller("auth/oauth")
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauth: OAuthService,
    private readonly authService: AuthService
  ) {}

  private appBaseUrl(): string {
    return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  }

  private flowCookie(name: string, value: string, maxAgeSeconds: number): string {
    const isProd = process.env.NODE_ENV === "production";
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isProd ? "; Secure" : ""}`;
  }

  @Get(":provider/start")
  start(@Param("provider") provider: string, @Res() res: Response): void {
    if (!this.oauth.isProvider(provider) || !this.oauth.isConfigured(provider)) {
      res.redirect(`${this.appBaseUrl()}/login?error=oauth_unavailable`);
      return;
    }
    const state = randomBytes(16).toString("base64url");
    const pkce = this.oauth.createPkcePair();
    // The verifier never leaves the browser-to-API channel; only its SHA-256
    // challenge goes to the provider, so an intercepted code is not redeemable.
    res.setHeader("Set-Cookie", [
      this.flowCookie(STATE_COOKIE, state, FLOW_TTL_SECONDS),
      this.flowCookie(VERIFIER_COOKIE, pkce.verifier, FLOW_TTL_SECONDS)
    ]);
    res.redirect(this.oauth.buildAuthorizeUrl(provider, state, pkce.challenge));
  }

  @Get(":provider/callback")
  async callback(
    @Param("provider") provider: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const app = this.appBaseUrl();
    const clearFlowCookies = [this.flowCookie(STATE_COOKIE, "", 0), this.flowCookie(VERIFIER_COOKIE, "", 0)];

    try {
      if (!this.oauth.isProvider(provider) || !this.oauth.isConfigured(provider)) {
        res.redirect(`${app}/login?error=oauth_unavailable`);
        return;
      }
      const expectedState = req.cookies?.[STATE_COOKIE];
      const codeVerifier = req.cookies?.[VERIFIER_COOKIE];
      if (!code || !codeVerifier || !this.statesMatch(state, expectedState)) {
        res.setHeader("Set-Cookie", clearFlowCookies);
        res.redirect(`${app}/login?error=oauth_state`);
        return;
      }

      const profile = await this.oauth.fetchProfile(provider, code, codeVerifier);
      const userId = await this.authService.findOrCreateOAuthUser({
        provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        fullName: profile.fullName,
        emailVerified: profile.emailVerified
      });
      const token = await this.authService.createSessionForUser(userId, req.headers["user-agent"], req.ip);

      // Clear the flow cookies and set the session cookie.
      res.setHeader("Set-Cookie", [...clearFlowCookies, this.authService.buildSessionCookie(token)]);
      res.redirect(`${app}/student/dashboard`);
    } catch (error) {
      res.setHeader("Set-Cookie", clearFlowCookies);

      if (error instanceof OAuthLinkNotVerifiedError) {
        // Expected refusal, not a fault: an account already owns this email and
        // the provider did not prove the caller owns it.
        this.logger.warn(`OAuth link refused (${provider}): unverified email.`);
        res.redirect(`${app}/login?error=oauth_email_in_use`);
        return;
      }

      this.logger.error(`OAuth callback (${provider}) failed: ${(error as Error)?.message}`);
      res.redirect(`${app}/login?error=oauth_failed`);
    }
  }

  /** Constant-time state comparison; lengths are compared first, as required. */
  private statesMatch(received: string | undefined, expected: string | undefined): boolean {
    if (!received || !expected) {
      return false;
    }

    const a = Buffer.from(received);
    const b = Buffer.from(expected);

    return a.length === b.length && timingSafeEqual(a, b);
  }
}
