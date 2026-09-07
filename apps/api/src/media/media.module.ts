import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { TRANSCODER, buildTranscoder } from "./transcoder";

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, { provide: TRANSCODER, useFactory: buildTranscoder }],
  exports: [MediaService]
})
export class MediaModule {}
