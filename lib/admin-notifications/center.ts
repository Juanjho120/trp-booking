import type { AdminNotificationType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import {
  buildAdminReservationFocusedTargetPath,
  resolveAdminNotificationReservationFocus,
} from "@/lib/admin/reservation-detail-focus";
import { normalizeAdminNotificationId } from "./center-routing";
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

export type AdminNotificationCenterPagination = Readonly<{
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;

export type AdminNotificationCenterData = Readonly<{
  notifications: readonly AdminNotificationCenterItem[];
  pagination: AdminNotificationCenterPagination;
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

export const ADMIN_NOTIFICATION_CENTER_PAGE_SIZE = 10;

const adminNotificationCenterSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  targetPath: true,
  deduplicationKey: true,
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

export function normalizeAdminNotificationCenterPage(value: unknown): number {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }

  if (typeof value !== "string") {
    return 1;
  }

  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return 1;
  }

  const page = Number(trimmed);

  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function resolveAdminNotificationCenterTotalPages(
  totalItems: number,
  pageSize = ADMIN_NOTIFICATION_CENTER_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

export function resolveAdminNotificationCenterSafePage(
  input: Readonly<{
    requestedPage: number;
    totalItems: number;
    pageSize?: number;
  }>,
): number {
  const pageSize = input.pageSize ?? ADMIN_NOTIFICATION_CENTER_PAGE_SIZE;
  const totalPages = resolveAdminNotificationCenterTotalPages(
    input.totalItems,
    pageSize,
  );

  return Math.min(Math.max(1, input.requestedPage), totalPages);
}

export function resolveAdminNotificationCenterSkip(
  page: number,
  pageSize = ADMIN_NOTIFICATION_CENTER_PAGE_SIZE,
): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function resolveAdminNotificationTargetPage(
  input: Readonly<{
    rowsBeforeTarget: number;
    pageSize?: number;
  }>,
): number {
  const pageSize = input.pageSize ?? ADMIN_NOTIFICATION_CENTER_PAGE_SIZE;

  return Math.floor(Math.max(0, input.rowsBeforeTarget) / pageSize) + 1;
}

function resolveNotificationTargetPath(
  notification: AdminNotificationCenterRecord,
): string {
  const fallbackTargetPath = coerceAdminNotificationTargetPath(
    notification.targetPath,
  );
  const focus = resolveAdminNotificationReservationFocus({
    type: notification.type,
    deduplicationKey: notification.deduplicationKey,
  });

  if (!focus || !notification.reservationId) {
    return fallbackTargetPath;
  }

  return (
    buildAdminReservationFocusedTargetPath({
      reservationId: notification.reservationId,
      focus,
    }) ?? fallbackTargetPath
  );
}

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
    targetPath: resolveNotificationTargetPath(notification),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.reads[0]?.readAt.toISOString() ?? null,
    zohoEmail,
  };
}

export async function getAdminNotificationCenter(
  actor: AdminActor | null,
  input: Readonly<{
    page?: unknown;
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
  const requestedPage = normalizeAdminNotificationCenterPage(input.page);
  const selectWithReads = {
    ...adminNotificationCenterSelect,
    reads: {
      ...adminNotificationCenterSelect.reads,
      where: { userId: user.id },
    },
  } satisfies Prisma.AdminNotificationSelect;
  const [targetedNotification, totalItems, unreadCount] = await Promise.all([
    requestedNotificationId
      ? prismaClient.adminNotification.findUnique({
          where: { id: requestedNotificationId },
          select: selectWithReads,
        })
      : Promise.resolve(null),
    prismaClient.adminNotification.count(),
    prismaClient.adminNotification.count({
      where: {
        reads: {
          none: { userId: user.id },
        },
      },
    }),
  ]);
  const targetPage = targetedNotification
    ? resolveAdminNotificationTargetPage({
        rowsBeforeTarget: await prismaClient.adminNotification.count({
          where: {
            OR: [
              {
                createdAt: {
                  gt: targetedNotification.createdAt,
                },
              },
              {
                createdAt: {
                  equals: targetedNotification.createdAt,
                },
                id: {
                  gt: targetedNotification.id,
                },
              },
            ],
          },
        }),
      })
    : null;
  const page = resolveAdminNotificationCenterSafePage({
    requestedPage: targetPage ?? requestedPage,
    totalItems,
  });
  const totalPages = resolveAdminNotificationCenterTotalPages(totalItems);
  const notifications = await prismaClient.adminNotification.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: resolveAdminNotificationCenterSkip(page),
    take: ADMIN_NOTIFICATION_CENTER_PAGE_SIZE,
    select: selectWithReads,
  });

  return {
    notifications: notifications.map(serializeNotification),
    pagination: {
      page,
      pageSize: ADMIN_NOTIFICATION_CENTER_PAGE_SIZE,
      totalItems,
      totalPages,
    },
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
