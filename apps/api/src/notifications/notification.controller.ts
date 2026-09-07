import type { Request } from "express";

import { Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { NotificationListResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { NotificationService } from "./notification.service";

@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Get()
  list(@Req() request: Request): Promise<NotificationListResponse> {
    return this.notificationService.list(this.token(request));
  }

  @Post(":id/read")
  markRead(@Req() request: Request, @Param("id") id: string): Promise<{ ok: true }> {
    return this.notificationService.markRead(this.token(request), id);
  }
}
