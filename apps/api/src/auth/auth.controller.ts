import type { Request, Response } from "express";

import { Body, Controller, Get, Headers, Ip, Post, Req, Res } from "@nestjs/common";

import type {
  AuthMeResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload
} from "@career-pilot/types";

import { AuthService, SESSION_COOKIE_NAME } from "./auth.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpService } from "./otp.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService
  ) {
    this.getMe = this.getMe.bind(this);
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.sendOtp = this.sendOtp.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
  }

  @Get("me")
  async getMe(@Req() request: Request): Promise<AuthMeResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.authService.getMe(token);
  }

  @Post("register")
  async register(
    @Body() body: RegisterDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthMeResponse> {
    const result = await this.authService.register(body as RegisterPayload, userAgent, ipAddress);
    response.setHeader("Set-Cookie", this.authService.buildSessionCookie(result.token));

    return {
      authenticated: true,
      session: result.session
    };
  }

  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthMeResponse> {
    const result = await this.authService.login(body as LoginPayload, userAgent, ipAddress);
    response.setHeader("Set-Cookie", this.authService.buildSessionCookie(result.token));

    return {
      authenticated: true,
      session: result.session
    };
  }

  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthMeResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    const result = await this.authService.refresh(token);

    if (!result) {
      response.setHeader("Set-Cookie", this.authService.buildLogoutCookie());
      return {
        authenticated: false,
        session: null
      };
    }

    response.setHeader("Set-Cookie", this.authService.buildSessionCookie(result.token));
    return {
      authenticated: true,
      session: result.session
    };
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<{ ok: true }> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    await this.authService.logout(token);
    response.setHeader("Set-Cookie", this.authService.buildLogoutCookie());

    return { ok: true };
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<ReturnType<AuthService["requestPasswordReset"]>> {
    return this.authService.requestPasswordReset(body as ForgotPasswordPayload);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordDto): Promise<ReturnType<AuthService["resetPassword"]>> {
    return this.authService.resetPassword(body as ResetPasswordPayload);
  }

  @Post("otp/send")
  async sendOtp(@Body() body: SendOtpDto): Promise<ReturnType<OtpService["sendSignupOtp"]>> {
    return this.otpService.sendSignupOtp(body.email);
  }

  @Post("otp/verify")
  async verifyOtp(@Body() body: VerifyOtpDto): Promise<ReturnType<OtpService["verifySignupOtp"]>> {
    return this.otpService.verifySignupOtp(body.email, body.code);
  }
}
