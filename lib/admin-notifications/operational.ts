import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  ReservationStatus,
  UserRole,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import * as webPush from "web-push";

import { isAllowedAdminEmail } from "@/lib/auth/admin-access";
import { prisma } from "@/lib/db/prisma";
import { getAllowedAdminEmails, getWebPushEnv } from "@/lib/env/server";
import { getArrivalCheckInDateTime } from "@/lib/email/arrival-instructions";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";
import { calculateReviewInvitationTimes } from "@/lib/reviews/review-invitation-time";
import type { Locale } from "@/types/locale";

import {
  coerceAdminNotificationTargetPath,
  resolveAdminNotificationTarget,
} from "./targets";

const ADMIN_PUSH_DELIVERY_BATCH_SIZE = 50;
const ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS = 5;
const ADMIN_PUSH_DELIVERY_STALE_TIMEOUT_MS = 10 * 60 * 1000;
const ADMIN_PUSH_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
] as const;
const REMINDER_CANDIDATE_BATCH_SIZE = 500;
const CHECK_IN_REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;
const CHECK_OUT_REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;
const BUSINESS_UTC_OFFSET_HOURS = 6;
const SAFE_PUSH_DELIVERY_ERROR_MESSAGES = {
  ADMIN_PUSH_DELIVERY_ADMIN_UNAUTHORIZED:
    "The subscription no longer belongs to an authorized admin.",
  ADMIN_PUSH_SUBSCRIPTION_EXPIRED:
    "The browser push subscription expired or is no longer available.",
  ADMIN_PUSH_PROVIDER_RATE_LIMITED:
    "The Web Push provider rate limit was reached.",
  ADMIN_PUSH_PROVIDER_TEMPORARY_FAILURE:
    "The Web Push provider is temporarily unavailable.",
  ADMIN_PUSH_PROVIDER_REJECTED:
    "The Web Push provider rejected the delivery request.",
  ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS:
    "The Web Push delivery reached the retry limit.",
  ADMIN_PUSH_DELIVERY_STALE:
    "The Web Push delivery was recovered after stale processing.",
  ADMIN_PUSH_DELIVERY_UNEXPECTED_ERROR:
    "The Web Push delivery could not be completed.",
} as const;

type AdminNotificationClient = PrismaClient | Prisma.TransactionClient;
type AdminPushDeliveryErrorCode = keyof typeof SAFE_PUSH_DELIVERY_ERROR_MESSAGES;
type MaybeAdminNotificationPersistenceClient = Readonly<{
  adminNotification?: Readonly<{
    createMany?: unknown;
    findUnique?: unknown;
  }>;
  adminPushSubscription?: Readonly<{
    findMany?: unknown;
  }>;
  adminPushDelivery?: Readonly<{
    createMany?: unknown;
  }>;
}>;

type AdminOperationalNotificationIntent = Readonly<{
  id: string;
  type: AdminNotificationType;
  created: boolean;
}>;

type AdminNotificationContext = Readonly<{
  reservationId: string | null;
  reviewId: string | null;
  propertyNameEs: string;
  propertyNameEn: string;
}>;

type AdminPushDeliveryClaim = Readonly<{
  id: string;
  attemptCount: number;
  processingStartedAt: Date;
  notification: Readonly<{
    id: string;
    title: string;
    body: string;
    targetPath: string;
  }>;
  subscription: Readonly<{
    id: string;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    active: boolean;
    user: Readonly<{
      id: string;
      email: string;
      role: UserRole;
    }>;
  }>;
}>;

type AdminPushDeliveryOutcome =
  | Readonly<{ outcome: "sent" }>
  | Readonly<{ outcome: "skipped" }>
  | Readonly<{ outcome: "failed"; retryScheduled: boolean }>;

export type AdminPushProcessingSummary = Readonly<{
  deliveryMode: "enabled" | "unavailable";
  requested: number;
  remindersCreated: number;
  recovered: number;
  claimed: number;
  sent: number;
  failed: number;
  retryScheduled: number;
  skipped: number;
}>;

const reservationNotificationContextSelect = {
  id: true,
  property: {
    select: {
      nameEs: true,
      nameEn: true,
      checkInTime: true,
      checkOutTime: true,
    },
  },
} satisfies Prisma.ReservationSelect;

type ReservationNotificationContext = Prisma.ReservationGetPayload<{
  select: typeof reservationNotificationContextSelect;
}>;

function normalizeAdminNotificationLocale(
  source: NodeJS.ProcessEnv = process.env,
): Locale {
  return source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es";
}

function propertyNameForLocale(
  context: AdminNotificationContext,
  locale: Locale,
): string {
  return locale === "en" ? context.propertyNameEn : context.propertyNameEs;
}

function buildAdminNotificationCopy(
  input: Readonly<{
    type: AdminNotificationType;
    context: AdminNotificationContext;
    source?: NodeJS.ProcessEnv;
  }>,
): Readonly<{ title: string; body: string }> {
  const locale = normalizeAdminNotificationLocale(input.source);
  const propertyName = propertyNameForLocale(input.context, locale);

  if (locale === "en") {
    const title = {
      RESERVATION_CONFIRMED: `Reservation confirmed · ${propertyName}`,
      RESERVATION_CANCELLED: `Reservation cancelled · ${propertyName}`,
      CHECK_IN_MINUS_48H: `Check-in in 48 hours · ${propertyName}`,
      CHECK_OUT_MINUS_6H: `Check-out in 6 hours · ${propertyName}`,
      REVIEW_SUBMITTED: `New review received · ${propertyName}`,
      GUEST_EMAIL_RECEIVED: `New guest email · ${propertyName}`,
    }[input.type];

    return {
      title,
      body:
        input.type === AdminNotificationType.GUEST_EMAIL_RECEIVED
          ? "Tap to review correspondence."
          : "Tap to view details.",
    };
  }

  const title = {
    RESERVATION_CONFIRMED: `Reservación confirmada · ${propertyName}`,
    RESERVATION_CANCELLED: `Reservación cancelada · ${propertyName}`,
    CHECK_IN_MINUS_48H: `Check-in en 48 horas · ${propertyName}`,
    CHECK_OUT_MINUS_6H: `Check-out en 6 horas · ${propertyName}`,
    REVIEW_SUBMITTED: `Nueva reseña recibida · ${propertyName}`,
    GUEST_EMAIL_RECEIVED: `Nuevo correo de huésped · ${propertyName}`,
  }[input.type];

  return {
    title,
    body:
      input.type === AdminNotificationType.GUEST_EMAIL_RECEIVED
        ? "Toca para revisar la correspondencia."
        : "Toca para ver detalles.",
  };
}

function normalizeNotificationText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeDeduplicationKey(value: string): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > 191) {
    throw new TypeError("Invalid admin notification deduplication key.");
  }

  return normalized;
}

function hasAdminNotificationPersistence(
  transaction: Prisma.TransactionClient,
): boolean {
  const candidate = transaction as MaybeAdminNotificationPersistenceClient;

  return (
    typeof candidate.adminNotification?.createMany === "function" &&
    typeof candidate.adminNotification?.findUnique === "function" &&
    typeof candidate.adminPushSubscription?.findMany === "function" &&
    typeof candidate.adminPushDelivery?.createMany === "function"
  );
}

function toDateOnly(value: Date): `${number}-${number}-${number}` {
  return value.toISOString().slice(0, 10) as `${number}-${number}-${number}`;
}

function toDateWindow(now: Date, startOffsetDays: number, endOffsetDays: number) {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + startOffsetDays,
    ),
  );
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + endOffsetDays,
      23,
      59,
      59,
      999,
    ),
  );

  return { start, end };
}

function getGuatemalaDateTime(date: Date, time: string | null): Date | null {
  if (!time) {
    return null;
  }

  const normalizedTime = normalizeTimeOfDay(time);

  if (!normalizedTime) {
    return null;
  }

  const [hours, minutes] = normalizedTime.split(":").map(Number);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours + BUSINESS_UTC_OFFSET_HOURS,
      minutes,
      0,
      0,
    ),
  );
}

export function isAdminOperationalReminderDueWithinWindow(
  target: Date | null,
  now: Date,
  windowMs: number,
): boolean {
  if (!target) {
    return false;
  }

  const deltaMs = target.getTime() - now.getTime();

  return deltaMs > 0 && deltaMs <= windowMs;
}

export function isCheckInMinus48hAdminReminderDue(
  input: Readonly<{
    checkInDate: Date;
    checkInTime: string | null;
    now: Date;
  }>,
): boolean {
  return isAdminOperationalReminderDueWithinWindow(
    input.checkInTime
      ? getArrivalCheckInDateTime(input.checkInDate, input.checkInTime)
      : null,
    input.now,
    CHECK_IN_REMINDER_WINDOW_MS,
  );
}

export function isCheckOutMinus6hAdminReminderDue(
  input: Readonly<{
    checkOutDate: Date;
    checkOutTime: string | null;
    now: Date;
  }>,
): boolean {
  const checkoutTime = calculateReviewInvitationTimes(
    input.checkOutDate,
    input.checkOutTime,
  );
  const checkOutAt = checkoutTime.ok
    ? checkoutTime.checkoutAt
    : getGuatemalaDateTime(input.checkOutDate, input.checkOutTime);

  return isAdminOperationalReminderDueWithinWindow(
    checkOutAt,
    input.now,
    CHECK_OUT_REMINDER_WINDOW_MS,
  );
}

async function readReservationNotificationContext(
  transaction: AdminNotificationClient,
  reservationId: string,
): Promise<ReservationNotificationContext> {
  const reservation = await transaction.reservation.findUnique({
    where: { id: reservationId.trim() },
    select: reservationNotificationContextSelect,
  });

  if (!reservation) {
    throw new TypeError("Missing admin notification reservation relation.");
  }

  return reservation;
}

async function ensureAdminOperationalNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    type: AdminNotificationType;
    deduplicationKey: string;
    context: AdminNotificationContext;
    targetPath: string;
    source?: NodeJS.ProcessEnv;
  }>,
): Promise<AdminOperationalNotificationIntent> {
  const deduplicationKey = normalizeDeduplicationKey(input.deduplicationKey);
  const targetPath = coerceAdminNotificationTargetPath(input.targetPath);
  if (!hasAdminNotificationPersistence(transaction)) {
    return {
      id: "",
      type: input.type,
      created: false,
    };
  }

  const copy = buildAdminNotificationCopy({
    type: input.type,
    context: input.context,
    source: input.source,
  });
  const data = {
    type: input.type,
    reservationId: input.context.reservationId,
    reviewId: input.context.reviewId,
    deduplicationKey,
    title: normalizeNotificationText(copy.title, 160),
    body: normalizeNotificationText(copy.body, 240),
    targetPath,
  };

  const creation = await transaction.adminNotification.createMany({
    data,
    skipDuplicates: true,
  });
  const notification = await transaction.adminNotification.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      type: true,
      reservationId: true,
      reviewId: true,
      deduplicationKey: true,
      targetPath: true,
    },
  });

  if (!notification) {
    throw new TypeError("Admin notification intent was not persisted.");
  }

  if (
    notification.type !== input.type ||
    notification.reservationId !== input.context.reservationId ||
    notification.reviewId !== input.context.reviewId ||
    notification.targetPath !== targetPath
  ) {
    throw new TypeError("Admin notification deduplication conflict.");
  }

  if (creation.count === 1) {
    const subscriptions = await transaction.adminPushSubscription.findMany({
      where: { active: true },
      select: { id: true },
    });

    if (subscriptions.length > 0) {
      await transaction.adminPushDelivery.createMany({
        data: subscriptions.map((subscription) => ({
          notificationId: notification.id,
          subscriptionId: subscription.id,
          status: AdminPushDeliveryStatus.PENDING,
        })),
        skipDuplicates: true,
      });
    }
  }

  return {
    id: notification.id,
    type: notification.type,
    created: creation.count === 1,
  };
}

export async function ensureReservationConfirmedAdminNotificationIntent(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  source: NodeJS.ProcessEnv = process.env,
): Promise<AdminOperationalNotificationIntent> {
  const reservation = await readReservationNotificationContext(
    transaction,
    reservationId,
  );

  return ensureAdminOperationalNotificationIntent(transaction, {
    type: AdminNotificationType.RESERVATION_CONFIRMED,
    deduplicationKey: `admin-notification/reservation-confirmed/${reservation.id}`,
    context: {
      reservationId: reservation.id,
      reviewId: null,
      propertyNameEs: reservation.property.nameEs,
      propertyNameEn: reservation.property.nameEn,
    },
    targetPath: resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: reservation.id,
    }).targetPath,
    source,
  });
}

export async function ensureReservationCancelledAdminNotificationIntent(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  source: NodeJS.ProcessEnv = process.env,
): Promise<AdminOperationalNotificationIntent> {
  const reservation = await readReservationNotificationContext(
    transaction,
    reservationId,
  );

  return ensureAdminOperationalNotificationIntent(transaction, {
    type: AdminNotificationType.RESERVATION_CANCELLED,
    deduplicationKey: `admin-notification/reservation-cancelled/${reservation.id}`,
    context: {
      reservationId: reservation.id,
      reviewId: null,
      propertyNameEs: reservation.property.nameEs,
      propertyNameEn: reservation.property.nameEn,
    },
    targetPath: resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: reservation.id,
    }).targetPath,
    source,
  });
}

export async function ensureReviewSubmittedAdminNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reviewId: string;
    reservationId: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<AdminOperationalNotificationIntent> {
  if (!hasAdminNotificationPersistence(transaction)) {
    return {
      id: "",
      type: AdminNotificationType.REVIEW_SUBMITTED,
      created: false,
    };
  }

  const review = await transaction.review.findUnique({
    where: { id: input.reviewId.trim() },
    select: {
      id: true,
      reservationId: true,
      reservation: {
        select: {
          property: {
            select: {
              nameEs: true,
              nameEn: true,
            },
          },
        },
      },
    },
  });

  if (!review || review.reservationId !== input.reservationId.trim()) {
    throw new TypeError("Missing admin notification review relation.");
  }

  return ensureAdminOperationalNotificationIntent(transaction, {
    type: AdminNotificationType.REVIEW_SUBMITTED,
    deduplicationKey: `admin-notification/review-submitted/${review.id}`,
    context: {
      reservationId: review.reservationId,
      reviewId: review.id,
      propertyNameEs: review.reservation.property.nameEs,
      propertyNameEn: review.reservation.property.nameEn,
    },
    targetPath: resolveAdminNotificationTarget({ kind: "reviews" }).targetPath,
    source,
  });
}

async function ensureCheckInReminderIntent(
  transaction: Prisma.TransactionClient,
  reservation: ReservationNotificationContext & {
    checkInDate: Date;
  },
  source: NodeJS.ProcessEnv,
): Promise<AdminOperationalNotificationIntent | null> {
  const normalizedCheckInTime = normalizeTimeOfDay(
    reservation.property.checkInTime,
  );

  if (!normalizedCheckInTime) {
    return null;
  }

  const deduplicationKey = buildCheckInMinus48hAdminNotificationDeduplicationKey(
    {
      reservationId: reservation.id,
      checkInDate: reservation.checkInDate,
      checkInTime: normalizedCheckInTime,
    },
  );

  if (!deduplicationKey) {
    return null;
  }

  return ensureAdminOperationalNotificationIntent(transaction, {
    type: AdminNotificationType.CHECK_IN_MINUS_48H,
    deduplicationKey,
    context: {
      reservationId: reservation.id,
      reviewId: null,
      propertyNameEs: reservation.property.nameEs,
      propertyNameEn: reservation.property.nameEn,
    },
    targetPath: resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: reservation.id,
    }).targetPath,
    source,
  });
}

async function ensureCheckOutReminderIntent(
  transaction: Prisma.TransactionClient,
  reservation: ReservationNotificationContext & {
    checkOutDate: Date;
  },
  source: NodeJS.ProcessEnv,
): Promise<AdminOperationalNotificationIntent | null> {
  const normalizedCheckOutTime = normalizeTimeOfDay(
    reservation.property.checkOutTime ?? "",
  );

  if (!normalizedCheckOutTime) {
    return null;
  }

  const deduplicationKey =
    buildCheckOutMinus6hAdminNotificationDeduplicationKey({
      reservationId: reservation.id,
      checkOutDate: reservation.checkOutDate,
      checkOutTime: normalizedCheckOutTime,
    });

  if (!deduplicationKey) {
    return null;
  }

  return ensureAdminOperationalNotificationIntent(transaction, {
    type: AdminNotificationType.CHECK_OUT_MINUS_6H,
    deduplicationKey,
    context: {
      reservationId: reservation.id,
      reviewId: null,
      propertyNameEs: reservation.property.nameEs,
      propertyNameEn: reservation.property.nameEn,
    },
    targetPath: resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: reservation.id,
    }).targetPath,
    source,
  });
}

export async function ensureDueAdminOperationalReminders(
  input: Readonly<{
    now?: Date;
    source?: NodeJS.ProcessEnv;
    prismaClient?: PrismaClient;
  }> = {},
): Promise<Readonly<{ created: number; reused: number; skipped: number }>> {
  const now = input.now ?? new Date();
  const source = input.source ?? process.env;
  const prismaClient = input.prismaClient ?? prisma;
  const checkInWindow = toDateWindow(now, -1, 3);
  const checkOutWindow = toDateWindow(now, -1, 1);
  const [checkInCandidates, checkOutCandidates] = await Promise.all([
    prismaClient.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: { not: null },
        cancelledAt: null,
        checkInDate: {
          gte: checkInWindow.start,
          lte: checkInWindow.end,
        },
      },
      orderBy: [{ checkInDate: "asc" }, { id: "asc" }],
      take: REMINDER_CANDIDATE_BATCH_SIZE,
      select: {
        ...reservationNotificationContextSelect,
        checkInDate: true,
      },
    }),
    prismaClient.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: { not: null },
        cancelledAt: null,
        checkOutDate: {
          gte: checkOutWindow.start,
          lte: checkOutWindow.end,
        },
      },
      orderBy: [{ checkOutDate: "asc" }, { id: "asc" }],
      take: REMINDER_CANDIDATE_BATCH_SIZE,
      select: {
        ...reservationNotificationContextSelect,
        checkOutDate: true,
      },
    }),
  ]);

  let created = 0;
  let reused = 0;
  let skipped = 0;

  for (const reservation of checkInCandidates) {
    const checkInAt = getArrivalCheckInDateTime(
      reservation.checkInDate,
      reservation.property.checkInTime,
    );

    if (
      !isAdminOperationalReminderDueWithinWindow(
        checkInAt,
        now,
        CHECK_IN_REMINDER_WINDOW_MS,
      )
    ) {
      skipped += 1;
      continue;
    }

    const intent = await prismaClient.$transaction((transaction) =>
      ensureCheckInReminderIntent(transaction, reservation, source),
    );

    if (intent?.created) {
      created += 1;
    } else if (intent) {
      reused += 1;
    } else {
      skipped += 1;
    }
  }

  for (const reservation of checkOutCandidates) {
    const checkoutTime = calculateReviewInvitationTimes(
      reservation.checkOutDate,
      reservation.property.checkOutTime,
    );
    const checkOutAt = checkoutTime.ok
      ? checkoutTime.checkoutAt
      : getGuatemalaDateTime(
          reservation.checkOutDate,
          reservation.property.checkOutTime,
        );

    if (
      !isAdminOperationalReminderDueWithinWindow(
        checkOutAt,
        now,
        CHECK_OUT_REMINDER_WINDOW_MS,
      )
    ) {
      skipped += 1;
      continue;
    }

    const intent = await prismaClient.$transaction((transaction) =>
      ensureCheckOutReminderIntent(transaction, reservation, source),
    );

    if (intent?.created) {
      created += 1;
    } else if (intent) {
      reused += 1;
    } else {
      skipped += 1;
    }
  }

  return { created, reused, skipped };
}

export function calculateNextAdminPushDeliveryAttemptAt(
  attemptCount: number,
  failedAt: Date,
): Date | null {
  if (attemptCount >= ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS) {
    return null;
  }

  const delayIndex = Math.min(
    Math.max(attemptCount - 1, 0),
    ADMIN_PUSH_RETRY_DELAYS_MS.length - 1,
  );

  return new Date(failedAt.getTime() + ADMIN_PUSH_RETRY_DELAYS_MS[delayIndex]);
}

function getWebPushStatusCode(error: unknown): number | null {
  if (error instanceof webPush.WebPushError) {
    return error.statusCode;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return null;
}

export function buildCheckInMinus48hAdminNotificationDeduplicationKey(
  input: Readonly<{
    reservationId: string;
    checkInDate: Date;
    checkInTime: string | null;
  }>,
): string | null {
  const normalizedCheckInTime = normalizeTimeOfDay(input.checkInTime ?? "");

  if (!normalizedCheckInTime) {
    return null;
  }

  return [
    "admin-notification/check-in-minus-48h",
    input.reservationId,
    toDateOnly(input.checkInDate),
    normalizedCheckInTime,
  ].join("/");
}

export function buildCheckOutMinus6hAdminNotificationDeduplicationKey(
  input: Readonly<{
    reservationId: string;
    checkOutDate: Date;
    checkOutTime: string | null;
  }>,
): string | null {
  const normalizedCheckOutTime = normalizeTimeOfDay(input.checkOutTime ?? "");

  if (!normalizedCheckOutTime) {
    return null;
  }

  return [
    "admin-notification/check-out-minus-6h",
    input.reservationId,
    toDateOnly(input.checkOutDate),
    normalizedCheckOutTime,
  ].join("/");
}

export function classifyAdminPushDeliveryStatusCode(
  statusCode: number | null,
): Readonly<{
  code: AdminPushDeliveryErrorCode;
  retryable: boolean;
  expired: boolean;
}> {
  if (statusCode === 404 || statusCode === 410) {
    return {
      code: "ADMIN_PUSH_SUBSCRIPTION_EXPIRED",
      retryable: false,
      expired: true,
    };
  }

  if (statusCode === 429) {
    return {
      code: "ADMIN_PUSH_PROVIDER_RATE_LIMITED",
      retryable: true,
      expired: false,
    };
  }

  if (statusCode !== null && statusCode >= 500) {
    return {
      code: "ADMIN_PUSH_PROVIDER_TEMPORARY_FAILURE",
      retryable: true,
      expired: false,
    };
  }

  if (statusCode !== null && statusCode >= 400) {
    return {
      code: "ADMIN_PUSH_PROVIDER_REJECTED",
      retryable: false,
      expired: false,
    };
  }

  return {
    code: "ADMIN_PUSH_DELIVERY_UNEXPECTED_ERROR",
    retryable: true,
    expired: false,
  };
}

function normalizeDeliveryError(error: unknown): Readonly<{
  code: AdminPushDeliveryErrorCode;
  retryable: boolean;
  expired: boolean;
}> {
  return classifyAdminPushDeliveryStatusCode(getWebPushStatusCode(error));
}

export async function recoverStaleAdminPushDeliveries(
  now: Date,
  prismaClient: Pick<PrismaClient, "adminPushDelivery">,
): Promise<number> {
  const staleBefore = new Date(
    now.getTime() - ADMIN_PUSH_DELIVERY_STALE_TIMEOUT_MS,
  );
  const retryable = await prismaClient.adminPushDelivery.updateMany({
    where: {
      status: AdminPushDeliveryStatus.PROCESSING,
      processingStartedAt: { lt: staleBefore },
      attemptCount: { lt: ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS },
    },
    data: {
      status: AdminPushDeliveryStatus.FAILED,
      processingStartedAt: null,
      nextAttemptAt: now,
      errorCode: "ADMIN_PUSH_DELIVERY_STALE",
      errorMessage: SAFE_PUSH_DELIVERY_ERROR_MESSAGES.ADMIN_PUSH_DELIVERY_STALE,
    },
  });
  const exhausted = await prismaClient.adminPushDelivery.updateMany({
    where: {
      status: AdminPushDeliveryStatus.PROCESSING,
      processingStartedAt: { lt: staleBefore },
      attemptCount: { gte: ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS },
    },
    data: {
      status: AdminPushDeliveryStatus.FAILED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: "ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS",
      errorMessage:
        SAFE_PUSH_DELIVERY_ERROR_MESSAGES.ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS,
    },
  });

  return retryable.count + exhausted.count;
}

function buildEligibleDeliveryWhere(
  now: Date,
  notificationIds?: readonly string[],
): Prisma.AdminPushDeliveryWhereInput {
  const where: Prisma.AdminPushDeliveryWhereInput = {
    attemptCount: { lt: ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS },
    OR: [
      {
        status: AdminPushDeliveryStatus.PENDING,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      {
        status: AdminPushDeliveryStatus.FAILED,
        nextAttemptAt: { lte: now },
      },
    ],
  };

  if (notificationIds) {
    where.notificationId = { in: [...notificationIds] };
  }

  return where;
}

async function claimEligibleAdminPushDeliveries(
  input: Readonly<{
    now: Date;
    notificationIds?: readonly string[];
    prismaClient: PrismaClient;
  }>,
): Promise<readonly AdminPushDeliveryClaim[]> {
  const candidates = await input.prismaClient.adminPushDelivery.findMany({
    where: buildEligibleDeliveryWhere(input.now, input.notificationIds),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ADMIN_PUSH_DELIVERY_BATCH_SIZE,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      attemptCount: true,
      notification: {
        select: {
          id: true,
          title: true,
          body: true,
          targetPath: true,
        },
      },
      subscription: {
        select: {
          id: true,
          endpoint: true,
          p256dhKey: true,
          authKey: true,
          active: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
  const claims: AdminPushDeliveryClaim[] = [];

  for (const candidate of candidates) {
    const claimed = await input.prismaClient.adminPushDelivery.updateMany({
      where: {
        id: candidate.id,
        updatedAt: candidate.updatedAt,
        status: candidate.status,
        attemptCount: candidate.attemptCount,
      },
      data: {
        status: AdminPushDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        lastAttemptAt: input.now,
        nextAttemptAt: null,
        processingStartedAt: input.now,
        errorCode: null,
        errorMessage: null,
      },
    });

    if (claimed.count !== 1) {
      continue;
    }

    claims.push({
      id: candidate.id,
      attemptCount: candidate.attemptCount + 1,
      processingStartedAt: input.now,
      notification: candidate.notification,
      subscription: candidate.subscription,
    });
  }

  return claims;
}

function isAuthorizedAdminSubscription(
  claim: AdminPushDeliveryClaim,
  allowedAdminEmails: ReadonlySet<string>,
): boolean {
  return (
    claim.subscription.active &&
    claim.subscription.user.role === UserRole.ADMIN &&
    isAllowedAdminEmail(claim.subscription.user.email, allowedAdminEmails)
  );
}

async function markAdminPushDeliverySkipped(
  claim: AdminPushDeliveryClaim,
  code: AdminPushDeliveryErrorCode,
  prismaClient: PrismaClient,
): Promise<void> {
  await prismaClient.adminPushDelivery.updateMany({
    where: {
      id: claim.id,
      status: AdminPushDeliveryStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: AdminPushDeliveryStatus.SKIPPED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: code,
      errorMessage: SAFE_PUSH_DELIVERY_ERROR_MESSAGES[code],
    },
  });
}

async function markAdminPushDeliverySent(
  claim: AdminPushDeliveryClaim,
  sentAt: Date,
  prismaClient: PrismaClient,
): Promise<void> {
  await prismaClient.$transaction(async (transaction) => {
    await transaction.adminPushDelivery.updateMany({
      where: {
        id: claim.id,
        status: AdminPushDeliveryStatus.PROCESSING,
        processingStartedAt: claim.processingStartedAt,
      },
      data: {
        status: AdminPushDeliveryStatus.SENT,
        processingStartedAt: null,
        nextAttemptAt: null,
        errorCode: null,
        errorMessage: null,
      },
    });
    await transaction.adminPushSubscription.update({
      where: { id: claim.subscription.id },
      data: { lastUsedAt: sentAt },
    });
  });
}

async function markAdminPushDeliveryFailed(
  claim: AdminPushDeliveryClaim,
  error: Readonly<{
    code: AdminPushDeliveryErrorCode;
    retryable: boolean;
  }>,
  failedAt: Date,
  prismaClient: PrismaClient,
): Promise<Date | null> {
  const nextAttemptAt = error.retryable
    ? calculateNextAdminPushDeliveryAttemptAt(claim.attemptCount, failedAt)
    : null;
  const exhausted =
    error.retryable &&
    claim.attemptCount >= ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS;
  const errorCode = exhausted ? "ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS" : error.code;

  const updated = await prismaClient.adminPushDelivery.updateMany({
    where: {
      id: claim.id,
      status: AdminPushDeliveryStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: AdminPushDeliveryStatus.FAILED,
      processingStartedAt: null,
      nextAttemptAt,
      errorCode,
      errorMessage: SAFE_PUSH_DELIVERY_ERROR_MESSAGES[errorCode],
    },
  });

  return updated.count === 1 ? nextAttemptAt : null;
}

async function deactivateExpiredSubscription(
  subscriptionId: string,
  prismaClient: PrismaClient,
): Promise<void> {
  await prismaClient.adminPushSubscription.update({
    where: { id: subscriptionId },
    data: {
      active: false,
      revokedAt: new Date(),
    },
  });
}

async function deliverClaimedAdminPushNotification(
  input: Readonly<{
    claim: AdminPushDeliveryClaim;
    allowedAdminEmails: ReadonlySet<string>;
    env: ReturnType<typeof getWebPushEnv> & { configured: true };
    now: () => Date;
    prismaClient: PrismaClient;
  }>,
): Promise<AdminPushDeliveryOutcome> {
  if (!isAuthorizedAdminSubscription(input.claim, input.allowedAdminEmails)) {
    await markAdminPushDeliverySkipped(
      input.claim,
      "ADMIN_PUSH_DELIVERY_ADMIN_UNAUTHORIZED",
      input.prismaClient,
    );

    return { outcome: "skipped" };
  }

  webPush.setVapidDetails(
    input.env.subject,
    input.env.publicKey,
    input.env.privateKey,
  );

  try {
    await webPush.sendNotification(
      {
        endpoint: input.claim.subscription.endpoint,
        keys: {
          p256dh: input.claim.subscription.p256dhKey,
          auth: input.claim.subscription.authKey,
        },
      },
      JSON.stringify({
        title: input.claim.notification.title,
        body: input.claim.notification.body,
        targetPath: coerceAdminNotificationTargetPath(
          input.claim.notification.targetPath,
        ),
      }),
      {
        TTL: 60 * 60,
        urgency: "normal",
      },
    );

    await markAdminPushDeliverySent(
      input.claim,
      input.now(),
      input.prismaClient,
    );

    return { outcome: "sent" };
  } catch (error) {
    const normalized = normalizeDeliveryError(error);

    if (normalized.expired) {
      await deactivateExpiredSubscription(
        input.claim.subscription.id,
        input.prismaClient,
      );
      await markAdminPushDeliverySkipped(
        input.claim,
        normalized.code,
        input.prismaClient,
      );

      return { outcome: "skipped" };
    }

    const nextAttemptAt = await markAdminPushDeliveryFailed(
      input.claim,
      normalized,
      input.now(),
      input.prismaClient,
    );

    return {
      outcome: "failed",
      retryScheduled: nextAttemptAt !== null,
    };
  }
}

function unavailablePushSummary(
  requested: number,
  remindersCreated: number,
): AdminPushProcessingSummary {
  return {
    deliveryMode: "unavailable",
    requested,
    remindersCreated,
    recovered: 0,
    claimed: 0,
    sent: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  };
}

function readDeliveryEnvironment(source: NodeJS.ProcessEnv) {
  try {
    const env = getWebPushEnv(source);

    return env.configured ? env : null;
  } catch {
    return null;
  }
}

function readAllowedAdminEmailSet(source: NodeJS.ProcessEnv) {
  try {
    return new Set(getAllowedAdminEmails(source));
  } catch {
    return null;
  }
}

export async function processAdminPushNotifications(
  input: Readonly<{
    notificationIds?: readonly string[];
    now?: Date;
    source?: NodeJS.ProcessEnv;
    prismaClient?: PrismaClient;
  }> = {},
): Promise<AdminPushProcessingSummary> {
  const now = input.now ?? new Date();
  const source = input.source ?? process.env;
  const prismaClient = input.prismaClient ?? prisma;
  const notificationIds = input.notificationIds
    ? Array.from(
        new Set(input.notificationIds.map((id) => id.trim()).filter(Boolean)),
      )
    : undefined;
  const requested = notificationIds?.length ?? 0;
  const reminderSummary = notificationIds
    ? { created: 0 }
    : await ensureDueAdminOperationalReminders({
        now,
        source,
        prismaClient,
      });
  const env = readDeliveryEnvironment(source);
  const allowedAdminEmails = readAllowedAdminEmailSet(source);

  if (!env || !allowedAdminEmails) {
    return unavailablePushSummary(requested, reminderSummary.created);
  }

  const recovered = await recoverStaleAdminPushDeliveries(now, prismaClient);
  const claims = await claimEligibleAdminPushDeliveries({
    now,
    notificationIds,
    prismaClient,
  });
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const claim of claims) {
    const outcome = await deliverClaimedAdminPushNotification({
      claim,
      allowedAdminEmails,
      env,
      now: () => new Date(),
      prismaClient,
    });

    if (outcome.outcome === "sent") {
      sent += 1;
    } else if (outcome.outcome === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
      if (outcome.retryScheduled) {
        retryScheduled += 1;
      }
    }
  }

  return {
    deliveryMode: "enabled",
    requested,
    remindersCreated: reminderSummary.created,
    recovered,
    claimed: claims.length,
    sent,
    failed,
    retryScheduled,
    skipped,
  };
}

export async function deliverAdminPushNotificationsBestEffort(
  notificationIds: readonly string[],
  input: Readonly<{
    source?: NodeJS.ProcessEnv;
    now?: Date;
    prismaClient?: PrismaClient;
  }> = {},
): Promise<AdminPushProcessingSummary> {
  try {
    return await processAdminPushNotifications({
      ...input,
      notificationIds,
    });
  } catch {
    return unavailablePushSummary(
      Array.from(
        new Set(notificationIds.map((id) => id.trim()).filter(Boolean)),
      ).length,
      0,
    );
  }
}
