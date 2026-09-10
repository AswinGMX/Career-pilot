import { Module } from "@nestjs/common";

import { MetricsController } from "./metrics.controller";
import { ObservabilityService } from "./observability.service";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RequestContextMiddleware } from "./request-context.middleware";
import { SecurityMiddleware } from "./security.middleware";

@Module({
  controllers: [MetricsController],
  providers: [ObservabilityService, RequestContextMiddleware, SecurityMiddleware, RateLimitMiddleware],
  exports: [ObservabilityService, RequestContextMiddleware, SecurityMiddleware, RateLimitMiddleware]
})
export class PlatformModule {}
