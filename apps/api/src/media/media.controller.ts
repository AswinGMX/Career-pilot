import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { MediaInitResponse, MediaView } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { AttachMediaDto, InitMediaDto } from "./dto/media.dto";
import { MediaService } from "./media.service";

/** Admin media ingestion API (school_admin gated). */
@Controller("admin/media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Post()
  init(@Req() request: Request, @Body() body: InitMediaDto): Promise<MediaInitResponse> {
    return this.mediaService.initUpload(this.token(request), body);
  }

  @Post(":id/complete")
  complete(@Req() request: Request, @Param("id") id: string): Promise<MediaView> {
    return this.mediaService.completeUpload(this.token(request), id);
  }

  @Get(":id")
  get(@Req() request: Request, @Param("id") id: string): Promise<MediaView> {
    return this.mediaService.getMedia(this.token(request), id);
  }

  @Post(":id/attach")
  attach(@Req() request: Request, @Param("id") id: string, @Body() body: AttachMediaDto): Promise<{ ok: true }> {
    return this.mediaService.attachToBlock(this.token(request), body.contentBlockId, id);
  }
}
