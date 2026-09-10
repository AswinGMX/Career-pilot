import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { EmailService } from "../notifications/email.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { OtpService } from "./otp.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService, OtpService, EmailService],
  exports: [AuthService, OtpService]
})
export class AuthModule {}
