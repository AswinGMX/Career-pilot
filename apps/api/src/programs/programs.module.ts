import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProgramAuthoringController } from "./program-authoring.controller";
import { ProgramAuthoringService } from "./program-authoring.service";
import { ProgramsController } from "./programs.controller";
import { ProgramsService } from "./programs.service";

/**
 * Experience Program catalog (read) + authoring (admin). PrismaModule,
 * StorageModule, QueueModule, and AiModule are global; AuthModule is imported
 * for admin gating.
 */
@Module({
  imports: [AuthModule],
  controllers: [ProgramsController, ProgramAuthoringController],
  providers: [ProgramsService, ProgramAuthoringService],
  exports: [ProgramsService, ProgramAuthoringService]
})
export class ProgramsModule {}
