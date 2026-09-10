import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MentorsController } from "./mentors.controller";
import { MentorsService } from "./mentors.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [MentorsController],
  providers: [MentorsService]
})
export class MentorsModule {}
