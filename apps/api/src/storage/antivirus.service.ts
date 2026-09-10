import { Injectable, Logger } from "@nestjs/common";

export interface ScanResult {
  clean: boolean;
  engine: string;
}

/**
 * Seam for malware scanning of uploaded objects. A real engine (ClamAV daemon,
 * VirusTotal, S3 GuardDuty Malware Protection) is infrastructure and plugs in
 * behind {@link scan} without changing callers.
 *
 * Policy:
 *  - `AV_SCAN_ENABLED` unset/false → scanning is off (dev/test); objects pass.
 *  - `AV_SCAN_ENABLED=true` but no scanner wired → **fail closed** (reject),
 *    so enabling the flag in production can never silently pass unscanned files.
 */
@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);
  private readonly enabled = process.env.AV_SCAN_ENABLED === "true";

  async scan(storageKey: string): Promise<ScanResult> {
    if (!this.enabled) {
      this.logger.debug(`AV scanning disabled; passing ${storageKey}.`);
      return { clean: true, engine: "disabled" };
    }
    // No concrete scanner is bundled. Fail closed rather than pass unscanned.
    this.logger.error(
      `AV_SCAN_ENABLED=true but no scanner integration is configured; rejecting ${storageKey}. ` +
        "Wire a ClamAV/VirusTotal client here before enabling scanning in production."
    );
    return { clean: false, engine: "unconfigured" };
  }
}
