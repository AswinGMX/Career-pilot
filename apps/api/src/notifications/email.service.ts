import { Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Email delivery behind a swappable driver. The default `log` driver records
 * the message (safe for dev/CI); `smtp` sends for real over SMTP (e.g. Gmail
 * with an App Password) using `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly driver = process.env.EMAIL_DRIVER || "log";
  private transporter: Transporter | null = null;

  async send(to: string, subject: string, body: string): Promise<void> {
    if (this.driver === "log") {
      this.logger.log(`[email → ${to}] ${subject} :: ${body}`);
      return;
    }

    if (this.driver === "smtp") {
      await this.sendViaSmtp(to, subject, body);
      return;
    }

    this.logger.warn(`Unknown EMAIL_DRIVER "${this.driver}"; dropping email to ${to}.`);
  }

  /** Built lazily and reused so every send doesn't renegotiate a new SMTP connection. */
  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set when EMAIL_DRIVER=smtp.");
    }

    this.transporter = createTransport({
      host,
      port,
      // 465 is implicit TLS; 587 (Gmail's default) negotiates TLS via STARTTLS instead.
      secure: port === 465,
      auth: { user, pass }
    });

    return this.transporter;
  }

  private async sendViaSmtp(to: string, subject: string, body: string): Promise<void> {
    const transporter = this.getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
      await transporter.sendMail({ from, to, subject, text: body });
    } catch (err) {
      this.logger.error(`SMTP send to ${to} failed: ${(err as Error)?.message}`);
      throw err;
    }
  }
}
