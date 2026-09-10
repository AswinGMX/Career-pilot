import type { Request } from "express";

import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";

import type { SchoolStudentCreateResponse, TenantDetailResponse, TenantMembersResponse } from "@career-pilot/types";

import { SESSION_COOKIE_NAME } from "../auth/auth.service";
import { CreateSchoolStudentDto } from "./dto/create-school-student.dto";
import { TenantsService } from "./tenants.service";

@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {
    this.getActiveTenant = this.getActiveTenant.bind(this);
    this.getTenantById = this.getTenantById.bind(this);
    this.getTenantMembers = this.getTenantMembers.bind(this);
    this.createSchoolStudent = this.createSchoolStudent.bind(this);
  }

  @Get("me")
  getActiveTenant(@Req() request: Request): Promise<TenantDetailResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.tenantsService.getActiveTenant(token);
  }

  @Get(":tenantId")
  getTenantById(@Req() request: Request, @Param("tenantId") tenantId: string): Promise<TenantDetailResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.tenantsService.getTenantById(token, tenantId);
  }

  @Get(":tenantId/members")
  getTenantMembers(@Req() request: Request, @Param("tenantId") tenantId: string): Promise<TenantMembersResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.tenantsService.getTenantMembers(token, tenantId);
  }

  @Post(":tenantId/students")
  createSchoolStudent(
    @Req() request: Request,
    @Param("tenantId") tenantId: string,
    @Body() body: CreateSchoolStudentDto
  ): Promise<SchoolStudentCreateResponse> {
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    return this.tenantsService.createSchoolStudent(token, tenantId, body);
  }
}
