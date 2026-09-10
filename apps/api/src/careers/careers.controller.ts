import { Controller, Get, Param, Query } from "@nestjs/common";

import type { CareerCategoriesResponse, CareerDetailResponse, CareerListResponse } from "@career-pilot/types";

import { CareersService } from "./careers.service";

@Controller("careers")
export class CareersController {
  constructor(private readonly careersService: CareersService) {
    this.listCareers = this.listCareers.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.getCareer = this.getCareer.bind(this);
  }

  @Get()
  listCareers(
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ): Promise<CareerListResponse> {
    return this.careersService.listCareers({
      q,
      category,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Get("categories")
  getCategories(): Promise<CareerCategoriesResponse> {
    return this.careersService.getCategories();
  }

  @Get(":slug")
  getCareer(@Param("slug") slug: string): Promise<CareerDetailResponse> {
    return this.careersService.getCareerBySlug(slug);
  }
}
