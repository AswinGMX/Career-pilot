import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { McqController } from "./mcq.controller";
import { McqService } from "./mcq.service";

@Module({
  imports: [AuthModule],
  controllers: [McqController],
  providers: [McqService]
})
export class McqModule {}
