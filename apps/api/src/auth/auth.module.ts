import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService],
  exports: [AuthService]
})
export class AuthModule {}
