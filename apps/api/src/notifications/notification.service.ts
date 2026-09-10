import { ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, Prisma } from "@prisma/client";

import type {
  DeliverNotificationJobPayload,
  NotificationListResponse,
  NotificationView
} from "@career-pilot/types";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JOB_NAMES, QUEUE_NAMES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { EmailService } from "./email.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService
  ) {}

  /** Creates an in-app notification (immediately visible). Never throws to callers. */
  async notifyInApp(userId: string, type: string, title: string, body: string): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          channel: NotificationChannel.in_app,
          status: NotificationStatus.sent,
          sentAt: new Date(),
          payloadJson: { title, body } as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to create in-app notification: ${(error as Error)?.message}`);
    }
  }

  /** Queues an email notification; delivers inline if the queue is unavailable. */
  async notifyEmail(userId: string, type: string, subject: string, body: string): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.email,
        status: NotificationStatus.pending,
        payloadJson: { subject, body } as Prisma.InputJsonValue
      }
    });

    const enqueued = await this.queueService.enqueue<DeliverNotificationJobPayload>(
      QUEUE_NAMES.notifications,
      JOB_NAMES.deliverNotification,
      { notificationId: notification.id },
      { idempotencyKey: `notif:${notification.id}` }
    );
    if (!enqueued) {
      await this.deliver(notification.id);
    }
  }

  /** Worker entrypoint: sends a pending email notification. */
  async deliver(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true }
    });
    if (!notification || notification.status === NotificationStatus.sent) {
      return;
    }
    const payload = (notification.payloadJson as { subject?: string; body?: string } | null) ?? {};
    try {
      await this.emailService.send(notification.user.email, payload.subject ?? "Career Pilot", payload.body ?? "");
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.sent, sentAt: new Date() }
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.failed }
      });
      throw error;
    }
  }

  async list(token: string | undefined): Promise<NotificationListResponse> {
    const userId = await this.requireUserId(token);
    const rows = await this.prisma.notification.findMany({
      where: { userId, channel: NotificationChannel.in_app },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return { notifications: rows.map((row) => this.toView(row)) };
  }

  async markRead(token: string | undefined, notificationId: string): Promise<{ ok: true }> {
    const userId = await this.requireUserId(token);
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException("Notification not found.");
    }
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: NotificationStatus.read }
    });
    return { ok: true };
  }

  private toView(row: {
    id: string;
    type: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    payloadJson: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationView {
    const payload = (row.payloadJson as { title?: string; body?: string } | null) ?? {};
    return {
      id: row.id,
      type: row.type,
      title: payload.title ?? row.type,
      body: payload.body ?? "",
      channel: row.channel,
      status: row.status,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString()
    };
  }

  private async requireUserId(token: string | undefined): Promise<string> {
    const session = await this.authService.getAuthenticatedSession(token);
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }
    return session.user.id;
  }
}
