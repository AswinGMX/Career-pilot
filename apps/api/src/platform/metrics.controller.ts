import { Controller, Get, Header } from "@nestjs/common";

import { ObservabilityService } from "./observability.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly observabilityService: ObservabilityService) {
    this.getMetrics = this.getMetrics.bind(this);
  }

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4")
  getMetrics(): string {
    return this.observabilityService.renderMetrics();
  }
}
