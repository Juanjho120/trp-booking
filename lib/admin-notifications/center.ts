import type { AdminNotificationType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import {
  mergeTargetedAdminNotification,
  normalizeAdminNotificationId,
} from "./center-routing";
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
  zohoEmail: Readonly<{
    fromAddress: string;
    toAddress: string;
    subject: string;
    receivedAt: string;
    reservationMatched: boolean;
  }> | null;
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

const adminNotificationCenterSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  targetPath: true,
  createdAt: true,
  reservationId: true,
  zohoInboundEmailEvent: {
    select: {
      fromAddress: true,
      toAddress: true,
      subject: true,
      receivedAt: true,
    },
  },
  reads: {
    select: { readAt: true },
    take: 1,
  },
} satisfies Prisma.AdminNotificationSelect;

type AdminNotificationCenterRecord = Prisma.AdminNotificationGetPayload<{
  select: typeof adminNotificationCenterSelect;
}>;

function serializeNotification(
  notification: AdminNotificationCenterRecord,
): AdminNotificationCenterItem {
  const zohoEmail =
    notification.type === "GUEST_EMAIL_RECEIVED" &&
    notification.zohoInboundEmailEvent
      ? {
          fromAddress: notification.zohoInboundEmailEvent.fromAddress,
          toAddress: notification.zohoInboundEmailEvent.toAddress,
          subject: notification.zohoInboundEmailEvent.subject,
          receivedAt: notification.zohoInboundEmailEvent.receivedAt.toISOString(),
          reservationMatched: notification.reservationId !== null,
        }
      : null;

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    targetPath: coerceAdminNotificationTargetPath(notification.targetPath),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.reads[0]?.readAt.toISOString() ?? null,
    zohoEmail,
  };
}

export async function getAdminNotificationCenter(
  actor: AdminActor | null,
  input: Readonly<{
    requestedNotificationId?: string | null;
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
  const requestedNotificationId = normalizeAdminNotificationId(
    input.requestedNotificationId,
  );
  const selectWithReads = {
    ...adminNotificationCenterSelect,
    reads: {
      ...adminNotificationCenterSelect.reads,
      where: { userId: user.id },
    },
  } satisfies Prisma.AdminNotificationSelect;
  const [notifications, targetedNotification, unreadCount] = await Promise.all([
    prismaClient.adminNotification.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: selectWithReads,
    }),
    requestedNotificationId
      ? prismaClient.adminNotification.findUnique({
          where: { id: requestedNotificationId },
          select: selectWithReads,
        })
      : Promise.resolve(null),
    prismaClient.adminNotification.count({
      where: {
        reads: {
          none: { userId: user.id },
        },
      },
    }),
  ]);

  return {
    notifications: mergeTargetedAdminNotification(
      notifications.map(serializeNotification),
      targetedNotification ? serializeNotification(targetedNotification) : null,
    ),
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
