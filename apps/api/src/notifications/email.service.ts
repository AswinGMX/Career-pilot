import { Injectable, Logger } from "@nestjs/common";

/**
 * Email delivery behind a swappable driver. The default `log` driver records
 * the message (safe for dev/CI); production wires a provider (SES/SendGrid)
 * behind the same interface via `EMAIL_DRIVER`.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly driver = process.env.EMAIL_DRIVER || "log";

  async send(to: string, subject: string, body: string): Promise<void> {
    if (this.driver === "log") {
      this.logger.log(`[email → ${to}] ${subject} :: ${body}`);
      return;
    }
    // Future: SES / SendGrid drivers selected by EMAIL_DRIVER.
    this.logger.warn(`Unknown EMAIL_DRIVER "${this.driver}"; dropping email to ${to}.`);
  }
}
