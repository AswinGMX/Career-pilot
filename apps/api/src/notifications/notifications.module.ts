import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EmailService } from "./email.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
  providers: [EmailService, NotificationService],
  exports: [NotificationService]
})
export class NotificationsModule {}
