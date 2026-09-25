import type { AdminNotificationType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { coerceAdminNotificationTargetPath } from "./targets";

export type AdminNotificationCenterItem = Readonly<{
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  targetPath: string;
  createdAt: string;
  readAt: string | null;
}>;

export type AdminNotificationCenterData = Readonly<{
  notifications: readonly AdminNotificationCenterItem[];
  unreadCount: number;
}>;

export type AdminNotificationCenterErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_NOTIFICATION_ORIGIN_INVALID"
  | "INVALID_ADMIN_NOTIFICATION_REQUEST"
  | "ADMIN_NOTIFICATION_NOT_FOUND"
  | "ADMIN_NOTIFICATION_UNEXPECTED_ERROR";

export class AdminNotificationCenterError extends Error {
  constructor(readonly code: AdminNotificationCenterErrorCode) {
    super(code);
    this.name = "AdminNotificationCenterError";
  }
}

function serializeNotification(
  notification: Readonly<{
    id: string;
    type: AdminNotificationType;
    title: string;
    body: string;
    targetPath: string;
    createdAt: Date;
    reads: readonly { readAt: Date }[];
  }>,
): AdminNotificationCenterItem {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    targetPath: coerceAdminNotificationTargetPath(notification.targetPath),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.reads[0]?.readAt.toISOString() ?? null,
  };
}

export async function getAdminNotificationCenter(
  actor: AdminActor | null,
): Promise<AdminNotificationCenterData> {
  if (!actor) {
    throw new AdminNotificationCenterError("ADMIN_UNAUTHORIZED");
  }

  const user = await resolveAdminActor(prisma, actor);
  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        targetPath: true,
        createdAt: true,
        reads: {
          where: { userId: user.id },
          select: { readAt: true },
          take: 1,
        },
      },
    }),
    prisma.adminNotification.count({
      where: {
        reads: {
          none: { userId: user.id },
        },
      },
    }),
  ]);

  return {
    notifications: notifications.map(serializeNotification),
    unreadCount,
  };
}

export async function markAdminNotificationRead(
  input: Readonly<{
    notificationId: string;
    actor: AdminActor | null;
    now?: Date;
  }>,
): Promise<Readonly<{ readAt: string }>> {
  if (!input.actor) {
    throw new AdminNotificationCenterError("ADMIN_UNAUTHORIZED");
  }

  const notificationId = input.notificationId.trim();

  if (!notificationId || notificationId.length > 160) {
    throw new AdminNotificationCenterError(
      "INVALID_ADMIN_NOTIFICATION_REQUEST",
    );
  }

  const user = await resolveAdminActor(prisma, input.actor);
  const notification = await prisma.adminNotification.findUnique({
    where: { id: notificationId },
    select: { id: true },
  });

  if (!notification) {
    throw new AdminNotificationCenterError("ADMIN_NOTIFICATION_NOT_FOUND");
  }

  const readAt = input.now ?? new Date();
  const read = await prisma.adminNotificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId: notification.id,
        userId: user.id,
      },
    },
    update: {
      readAt,
    },
    create: {
      notificationId: notification.id,
      userId: user.id,
      readAt,
    },
    select: {
      readAt: true,
    },
  });

  return {
    readAt: read.readAt.toISOString(),
  };
}
