import type { Request } from "express";

import { Body, Controller, Get, Post, Put, Req } from "@nestjs/common";

import type { ProfileSubmitResponse, ProfileUpdatePayload, StudentProfileResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileService } from "./profile.service";

@Controller("student-profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {
    this.getCurrentProfile = this.getCurrentProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.submitProfile = this.submitProfile.bind(this);
  }

  @Get()
  getCurrentProfile(@Req() request: Request): Promise<StudentProfileResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.profileService.getCurrentProfile(token);
  }

  @Put()
  updateProfile(@Req() request: Request, @Body() body: UpdateProfileDto): Promise<StudentProfileResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.profileService.upsertProfile(token, body as ProfileUpdatePayload);
  }

  @Post("submit")
  submitProfile(@Req() request: Request): Promise<ProfileSubmitResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.profileService.submitProfile(token);
  }
}
