import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  ReservationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  ArrivalInstructionsNotificationIntent,
  ArrivalInstructionsSchedulingSummary,
} from "@/types/email-notification";
import {
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";

const BUSINESS_UTC_OFFSET_HOURS = 6;
const ARRIVAL_SCHEDULING_LOOKAHEAD_DAYS = 8;
const ARRIVAL_SCHEDULING_MAX_CANDIDATES = 500;

export type ArrivalInstructionsPrismaClient =
  | PrismaClient
  | Prisma.TransactionClient;

type EnsureArrivalInstructionsOptions = Readonly<{
  now?: Date;
}>;

type ScheduleArrivalInstructionsOptions = Readonly<{
  now?: Date;
  propertyId?: string;
}>;

type ArrivalSettings = Readonly<{
  enabled: boolean;
  leadTimeHours: number;
  exactAddress: string | null;
  instructionsEs: string | null;
  instructionsEn: string | null;
  updatedAt: Date;
}>;

type ReservationForArrivalIntent = Readonly<{
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  guestEmail: string;
  preferredLocale: string;
  checkInDate: Date;
  property: Readonly<{
    checkInTime: string;
    arrivalInstructions: ArrivalSettings | null;
  }>;
}>;

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function normalizeRecipient(value: string): string {
  return value.trim().toLowerCase();
}

function toDateOnly(value: Date): `${number}-${number}-${number}` {
  return value.toISOString().slice(0, 10) as `${number}-${number}-${number}`;
}

function parseCheckInTime(value: string): Readonly<{
  hours: number;
  minutes: number;
}> | null {
  const normalizedTime = normalizeTimeOfDay(value);

  if (!normalizedTime) {
    return null;
  }

  const [hours, minutes] = normalizedTime.split(":").map(Number);

  return {
    hours,
    minutes,
  };
}

export function getArrivalCheckInDateTime(
  checkInDate: Date,
  checkInTime: string,
): Date | null {
  const parsedTime = parseCheckInTime(checkInTime);

  if (!parsedTime) {
    return null;
  }

  const dateOnly = toDateOnly(checkInDate);
  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      parsedTime.hours + BUSINESS_UTC_OFFSET_HOURS,
      parsedTime.minutes,
    ),
  );
}

export function getArrivalInstructionsScheduledFor(
  checkInDate: Date,
  checkInTime: string,
  leadTimeHours: number,
): Date | null {
  const checkInAt = getArrivalCheckInDateTime(checkInDate, checkInTime);

  if (!checkInAt) {
    return null;
  }

  return new Date(checkInAt.getTime() - leadTimeHours * 60 * 60 * 1_000);
}

function isCompleteArrivalSettings(
  settings: ArrivalSettings | null,
): settings is ArrivalSettings {
  return Boolean(
    settings?.enabled &&
      Number.isInteger(settings.leadTimeHours) &&
      settings.leadTimeHours >= ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS &&
      settings.leadTimeHours <= ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS &&
      settings.exactAddress?.trim() &&
      settings.instructionsEs?.trim() &&
      settings.instructionsEn?.trim(),
  );
}

function buildArrivalInstructionsDeduplicationKey(
  reservation: ReservationForArrivalIntent,
  settings: ArrivalSettings,
): string {
  const checkInDate = toDateOnly(reservation.checkInDate);
  const version = settings.updatedAt.getTime();
  const recipient = normalizeRecipient(reservation.guestEmail);

  return `arrival-instructions/${reservation.id}/${checkInDate}/${version}/${recipient}`;
}

async function readReservationForArrivalIntent(
  prismaClient: ArrivalInstructionsPrismaClient,
  reservationId: string,
): Promise<ReservationForArrivalIntent | null> {
  return prismaClient.reservation.findUnique({
    where: {
      id: reservationId,
    },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      guestEmail: true,
      preferredLocale: true,
      checkInDate: true,
      property: {
        select: {
          checkInTime: true,
          arrivalInstructions: {
            select: {
              enabled: true,
              leadTimeHours: true,
              exactAddress: true,
              instructionsEs: true,
              instructionsEn: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
}

export async function ensureArrivalInstructionsNotificationIntent(
  prismaClient: ArrivalInstructionsPrismaClient,
  reservationId: string,
  options: EnsureArrivalInstructionsOptions = {},
): Promise<ArrivalInstructionsNotificationIntent> {
  const now = options.now ?? new Date();
  const reservation = await readReservationForArrivalIntent(
    prismaClient,
    reservationId,
  );

  if (
    !reservation ||
    reservation.status !== ReservationStatus.CONFIRMED ||
    !reservation.confirmedAt
  ) {
    return {
      outcome: "not-confirmed",
      notificationId: null,
      scheduledFor: null,
    };
  }

  const settings = reservation.property.arrivalInstructions;

  if (!isCompleteArrivalSettings(settings)) {
    return {
      outcome: "not-configured",
      notificationId: null,
      scheduledFor: null,
    };
  }

  const checkInAt = getArrivalCheckInDateTime(
    reservation.checkInDate,
    reservation.property.checkInTime,
  );
  const scheduledFor = getArrivalInstructionsScheduledFor(
    reservation.checkInDate,
    reservation.property.checkInTime,
    settings.leadTimeHours,
  );

  if (!checkInAt || !scheduledFor) {
    return {
      outcome: "invalid-data",
      notificationId: null,
      scheduledFor: null,
    };
  }

  if (checkInAt <= now) {
    return {
      outcome: "check-in-passed",
      notificationId: null,
      scheduledFor: scheduledFor.toISOString(),
    };
  }

  const deduplicationKey = buildArrivalInstructionsDeduplicationKey(
    reservation,
    settings,
  );
  const existing = await prismaClient.emailNotification.findUnique({
    where: {
      deduplicationKey,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      outcome: "existing",
      notificationId: existing.id,
      scheduledFor: scheduledFor.toISOString(),
    };
  }

  try {
    const notification = await prismaClient.emailNotification.create({
      data: {
        reservationId: reservation.id,
        type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
        recipient: normalizeRecipient(reservation.guestEmail),
        locale: normalizeLocale(reservation.preferredLocale),
        deduplicationKey,
        origin: EmailNotificationOrigin.AUTOMATIC,
        status: EmailNotificationStatus.PENDING,
        scheduledFor,
        nextAttemptAt: scheduledFor,
        reservationCheckInDateSnapshot: reservation.checkInDate,
        arrivalInstructionsVersion: settings.updatedAt,
      },
      select: {
        id: true,
      },
    });

    return {
      outcome: "created",
      notificationId: notification.id,
      scheduledFor: scheduledFor.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const raced = await prismaClient.emailNotification.findUnique({
        where: {
          deduplicationKey,
        },
        select: {
          id: true,
        },
      });

      if (raced) {
        return {
          outcome: "existing",
          notificationId: raced.id,
          scheduledFor: scheduledFor.toISOString(),
        };
      }
    }

    throw error;
  }
}

function getGuatemalaDateOnly(value: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guatemala",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

export async function scheduleArrivalInstructionsNotifications(
  options: ScheduleArrivalInstructionsOptions = {},
): Promise<ArrivalInstructionsSchedulingSummary> {
  const now = options.now ?? new Date();
  const startDate = getGuatemalaDateOnly(now);
  const endDate = new Date(
    startDate.getTime() + ARRIVAL_SCHEDULING_LOOKAHEAD_DAYS * 86_400_000,
  );
  const candidates = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      confirmedAt: {
        not: null,
      },
      checkInDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(options.propertyId
        ? {
            propertyId: options.propertyId,
          }
        : {}),
      property: {
        arrivalInstructions: {
          is: {
            enabled: true,
          },
        },
      },
    },
    orderBy: [{ checkInDate: "asc" }, { id: "asc" }],
    take: ARRIVAL_SCHEDULING_MAX_CANDIDATES,
    select: {
      id: true,
    },
  });

  let created = 0;
  let existing = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const result = await ensureArrivalInstructionsNotificationIntent(
        prisma,
        candidate.id,
        { now },
      );

      if (result.outcome === "created") {
        created += 1;
      } else if (result.outcome === "existing") {
        existing += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    processedAt: now.toISOString(),
    lookaheadDays: ARRIVAL_SCHEDULING_LOOKAHEAD_DAYS,
    candidates: candidates.length,
    created,
    existing,
    skipped,
    failed,
  };
}
