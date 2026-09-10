import { Injectable, NotFoundException } from "@nestjs/common";
import { CareerStatus, type Prisma } from "@prisma/client";

import type {
  CareerCategoriesResponse,
  CareerDetailResponse,
  CareerListResponse,
  CareerRecord
} from "@career-pilot/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCareers(params: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CareerListResponse> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));

    const where: Prisma.CareerWhereInput = {
      status: CareerStatus.active,
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: "insensitive" } },
              { summary: { contains: params.q, mode: "insensitive" } },
              { category: { name: { contains: params.q, mode: "insensitive" } } }
            ]
          }
        : {}),
      ...(params.category
        ? {
            category: {
              slug: params.category
            }
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.career.findMany({
        where,
        include: {
          category: true,
          detail: true
        },
        orderBy: {
          title: "asc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.career.count({ where })
    ]);

    return {
      items: items.map((career) => this.serializeCareer(career)),
      page,
      pageSize,
      total
    };
  }

  async getCategories(): Promise<CareerCategoriesResponse> {
    const categories = await this.prisma.careerCategory.findMany({
      include: {
        _count: {
          select: {
            careers: {
              where: {
                status: CareerStatus.active
              }
            }
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return {
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        count: category._count.careers
      }))
    };
  }

  async getCareerBySlug(slug: string): Promise<CareerDetailResponse> {
    const career = await this.prisma.career.findUnique({
      where: { slug },
      include: {
        category: true,
        detail: true
      }
    });

    if (!career || career.status !== CareerStatus.active || !career.detail) {
      throw new NotFoundException("Career not found.");
    }

    return {
      career: this.serializeCareer(career)
    };
  }

  private serializeCareer(
    career: Prisma.CareerGetPayload<{
      include: {
        category: true;
        detail: true;
      };
    }>
  ): CareerRecord {
    return {
      id: career.id,
      slug: career.slug,
      title: career.title,
      summary: career.summary,
      category: {
        id: career.category.id,
        slug: career.category.slug,
        name: career.category.name
      },
      educationPath: this.jsonToStringArray(career.detail?.educationPath),
      skills: this.jsonToStringArray(career.detail?.skills),
      positives: this.jsonToStringArray(career.detail?.positives),
      challenges: this.jsonToStringArray(career.detail?.challenges),
      drawbacks: this.jsonToStringArray(career.detail?.drawbacks),
      salaryMeta: this.jsonToRecord(career.detail?.salaryMeta),
      outlookMeta: this.jsonToRecord(career.detail?.outlookMeta),
      resilienceMeta: this.jsonToRecord(career.detail?.resilienceMeta),
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString()
    };
  }

  private jsonToStringArray(value: Prisma.JsonValue | null | undefined): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private jsonToRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
