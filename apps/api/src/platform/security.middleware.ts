import type { NextFunction, Request, Response } from "express";
import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";

import { getAllowedOrigins } from "./origins";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor() {
    this.use = this.use.bind(this);
  }

  use(request: Request, response: Response, next: NextFunction): void {
    this.applyHeaders(response);
    this.enforceAllowedOrigin(request);
    next();
  }

  private applyHeaders(response: Response): void {
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    response.setHeader("x-dns-prefetch-control", "off");
    response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader(
      "content-security-policy",
      "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
    );
  }

  private enforceAllowedOrigin(request: Request): void {
    if (!this.isMutatingMethod(request.method)) {
      return;
    }

    const origin = request.headers.origin;
    if (!origin || typeof origin !== "string") {
      return;
    }

    const allowedOrigins = this.getAllowedOrigins();
    if (!allowedOrigins.length) {
      return;
    }

    if (!allowedOrigins.includes(origin)) {
      throw new ForbiddenException("Origin not allowed.");
    }
  }

  private isMutatingMethod(method: string): boolean {
    return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  }

  private getAllowedOrigins(): string[] {
    return getAllowedOrigins();
  }
}
