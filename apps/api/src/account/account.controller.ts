import type { Request } from "express";

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from "@nestjs/common";

import type { AccountOptionsResponse, AccountResponse, AvatarUploadInitResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { AccountService } from "./account.service";
import { AvatarUploadInitDto } from "./dto/avatar-upload-init.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

/**
 * The signed-in user's own account. Every route here acts on the caller and
 * takes no user id, so one account can never address another.
 */
@Controller("account")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  private token(request: Request): string | undefined {
    return request.cookies?.[SESSION_COOKIE_NAME];
  }

  @Get()
  getAccount(@Req() request: Request): Promise<AccountResponse> {
    return this.accountService.getAccount(this.token(request));
  }

  @Get("options")
  getOptions(@Req() request: Request): Promise<AccountOptionsResponse> {
    return this.accountService.getOptions(this.token(request));
  }

  @Patch()
  updateAccount(@Req() request: Request, @Body() body: UpdateAccountDto): Promise<AccountResponse> {
    return this.accountService.updateAccount(this.token(request), body);
  }

  @Post("avatar")
  initAvatarUpload(@Req() request: Request, @Body() body: AvatarUploadInitDto): Promise<AvatarUploadInitResponse> {
    return this.accountService.initAvatarUpload(this.token(request), body);
  }

  // 200, not Nest's default 201 for POST: this adopts an object that already
  // exists in storage rather than creating a new resource.
  @Post("avatar/:mediaId/complete")
  @HttpCode(200)
  completeAvatarUpload(@Req() request: Request, @Param("mediaId") mediaId: string): Promise<AccountResponse> {
    return this.accountService.completeAvatarUpload(this.token(request), mediaId);
  }

  @Delete("avatar")
  deleteAvatar(@Req() request: Request): Promise<AccountResponse> {
    return this.accountService.deleteAvatar(this.token(request));
  }
}
