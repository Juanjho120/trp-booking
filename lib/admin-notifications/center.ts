import type { AdminNotificationType, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { coerceAdminNotificationTargetPath } from "./targets";

type AdminNotificationCenterActor = Readonly<{
  id: string;
  email: string;
  name: string | null;
}>;

type AdminNotificationCenterActorResolver = (
  prismaClient: PrismaClient,
  actor: AdminActor,
) => Promise<AdminNotificationCenterActor>;

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
  input: Readonly<{
    prismaClient?: PrismaClient;
    resolveActor?: AdminNotificationCenterActorResolver;
  }> = {},
): Promise<AdminNotificationCenterData> {
  if (!actor) {
    throw new AdminNotificationCenterError("ADMIN_UNAUTHORIZED");
  }

  const prismaClient = input.prismaClient ?? prisma;
  const resolveActor =
    input.resolveActor ??
    ((client: PrismaClient, adminActor: AdminActor) =>
      resolveAdminActor(client, adminActor));
  const user = await resolveActor(prismaClient, actor);
  const [notifications, unreadCount] = await Promise.all([
    prismaClient.adminNotification.findMany({
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
    prismaClient.adminNotification.count({
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
    prismaClient?: PrismaClient;
    resolveActor?: AdminNotificationCenterActorResolver;
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

  const prismaClient = input.prismaClient ?? prisma;
  const resolveActor =
    input.resolveActor ??
    ((client: PrismaClient, adminActor: AdminActor) =>
      resolveAdminActor(client, adminActor));
  const user = await resolveActor(prismaClient, input.actor);
  const notification = await prismaClient.adminNotification.findUnique({
    where: { id: notificationId },
    select: { id: true },
  });

  if (!notification) {
    throw new AdminNotificationCenterError("ADMIN_NOTIFICATION_NOT_FOUND");
  }

  const readAt = input.now ?? new Date();
  await prismaClient.adminNotificationRead.createMany({
    data: {
      notificationId: notification.id,
      userId: user.id,
      readAt,
    },
    skipDuplicates: true,
  });

  const read = await prismaClient.adminNotificationRead.findUnique({
    where: {
      notificationId_userId: {
        notificationId: notification.id,
        userId: user.id,
      },
    },
    select: {
      readAt: true,
    },
  });

  if (!read) {
    throw new AdminNotificationCenterError(
      "ADMIN_NOTIFICATION_UNEXPECTED_ERROR",
    );
  }

  return {
    readAt: read.readAt.toISOString(),
  };
}
