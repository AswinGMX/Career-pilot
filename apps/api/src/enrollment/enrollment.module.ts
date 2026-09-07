import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentService } from "./enrollment.service";
import { EvaluationService } from "./evaluation.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EvaluationService],
  exports: [EnrollmentService, EvaluationService]
})
export class EnrollmentModule {}
