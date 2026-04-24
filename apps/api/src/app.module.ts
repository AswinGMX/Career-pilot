import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiModule } from "./ai/ai.module";
import { AssessmentsModule } from "./assessments/assessments.module";
import { AuthModule } from "./auth/auth.module";
import { CareersModule } from "./careers/careers.module";
import { HealthModule } from "./health/health.module";
import { McqModule } from "./mcq/mcq.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { PlatformModule } from "./platform/platform.module";
import { RateLimitMiddleware } from "./platform/rate-limit.middleware";
import { RequestContextMiddleware } from "./platform/request-context.middleware";
import { SecurityMiddleware } from "./platform/security.middleware";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ReportsModule } from "./reports/reports.module";
import { TenantsModule } from "./tenants/tenants.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PlatformModule,
    AiModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AssessmentsModule,
    TenantsModule,
    ProfileModule,
    CareersModule,
    RecommendationsModule,
    ReportsModule,
    McqModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, SecurityMiddleware, RateLimitMiddleware).forRoutes("*");
  }
}
