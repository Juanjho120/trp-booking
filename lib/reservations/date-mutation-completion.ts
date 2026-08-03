import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PropertyStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { checkAccommodationAvailability } from "@/lib/availability/service";
import {
  buildPreparationBufferRanges,
  dateOnlyFromDate,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import {
  getArrivalCheckInDateTime,
  getArrivalInstructionsScheduledFor,
} from "@/lib/email";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";
import { isAdminAccommodationId } from "@/lib/admin/accommodations";
import type { AccommodationId, PreparationBufferPolicy } from "@/types/accommodation";
import type { AdminDateMutationErrorCode } from "@/types/admin-reservation-date-mutation";
import {
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";

const COMPLETION_TRANSACTION_MAX_ATTEMPTS = 3;
const COMPLETION_TRANSACTION_MAX_WAIT_MS = 10_000;
const COMPLETION_TRANSACTION_TIMEOUT_MS = 20_000;
const COMPLETION_TRANSACTION_RETRY_DELAY_MS = 75;
const GUATEMALA_UTC_OFFSET_HOURS = 6;
const HOLD_RELEASED_REASON_CODE = "LIFECYCLE_DATE_MUTATION_COMPLETED";
const ARRIVAL_SUPERSEDED_ERROR_CODE =
  "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED_DATE_MUTATION";
const ARRIVAL_SUPERSEDED_ERROR_MESSAGE =
  "Superseded because the confirmed reservation dates were updated.";

export type ReservationDateMutationCompletionTrigger =
  | "ADMIN_ZERO_DIFFERENCE_APPROVAL"
  | "APPROVED_ADJUSTMENT_PAYMENT";

export type ReservationDateMutationCompletionResult = Readonly<{
  lifecycleRequestId: string;
  reservationId: string;
  requestType: "DATE_CHANGE" | "STAY_EXTENSION";
  financialBranch: "POSITIVE" | "ZERO";
  paymentId: string | null;
  holdId: string | null;
  completedAt: string;
  reservationUpdatedAt: string;
  confirmedAt: string;
  skippedArrivalNotifications: number;
  arrivalNotificationId: string | null;
  alreadyCompleted: boolean;
}>;

export class ReservationDateMutationCompletionError extends Error {
  constructor(public readonly code: AdminDateMutationErrorCode) {
    super(code);
    this.name = "ReservationDateMutationCompletionError";
  }
}

const completionRequestSelect = {
  id: true,
  reservationId: true,
  requestType: true,
  status: true,
  version: true,
  updatedAt: true,
  completedAt: true,
  expectedReservationUpdatedAt: true,
  financialDifference: true,
  currency: true,
  originalCheckInDate: true,
  originalCheckOutDate: true,
  originalGuestCount: true,
  originalSubtotal: true,
  originalCleaningFee: true,
  originalTaxes: true,
  originalDiscounts: true,
  originalTotal: true,
  requestedCheckInDate: true,
  requestedCheckOutDate: true,
  requestedGuestCount: true,
  requestedSubtotal: true,
  requestedCleaningFee: true,
  requestedTaxes: true,
  requestedDiscounts: true,
  requestedTotal: true,
  createdByAdminId: true,
  reviewedByAdminId: true,
  reviewedByAdmin: {
    select: {
      email: true,
    },
  },
  reservation: {
    select: {
      id: true,
      propertyId: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      guestEmail: true,
      preferredLocale: true,
      checkInDate: true,
      checkOutDate: true,
      guestCount: true,
      subtotal: true,
      cleaningFee: true,
      taxes: true,
      discounts: true,
      total: true,
      currency: true,
      updatedAt: true,
      property: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          checkInTime: true,
          checkOutTime: true,
          preparationDaysBefore: true,
          preparationDaysAfter: true,
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
  },
  hold: {
    select: {
      id: true,
      lifecycleRequestId: true,
      propertyId: true,
      startDate: true,
      endDate: true,
      preparationDaysBefore: true,
      preparationDaysAfter: true,
      status: true,
      expiresAt: true,
      releasedAt: true,
      version: true,
      updatedAt: true,
    },
  },
  adjustmentPayments: {
    where: {
      purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type CompletionRequest = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof completionRequestSelect;
}>;

type RequestedSnapshot = Readonly<{
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  subtotal: Prisma.Decimal;
  cleaningFee: Prisma.Decimal;
  taxes: Prisma.Decimal;
  discounts: Prisma.Decimal;
  total: Prisma.Decimal;
}>;

type PositiveArtifacts = Readonly<{
  paymentId: string;
  holdId: string;
  preparationBuffer: PreparationBufferPolicy;
}>;

type ArrivalIntentResult = Readonly<{
  skippedCount: number;
  notificationId: string | null;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runSerializableCompletionTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= COMPLETION_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: COMPLETION_TRANSACTION_MAX_WAIT_MS,
        timeout: COMPLETION_TRANSACTION_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === COMPLETION_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await wait(COMPLETION_TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new ReservationDateMutationCompletionError(
    "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
  );
}

function requiredDate(value: Date | null): Date {
  if (!value) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  return value;
}

function requiredDecimal(value: Prisma.Decimal | null): Prisma.Decimal {
  if (value === null) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  return value;
}

function requiredGuestCount(value: number | null): number {
  if (value === null) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  return value;
}

function requestedSnapshot(request: CompletionRequest): RequestedSnapshot {
  return {
    checkInDate: requiredDate(request.requestedCheckInDate),
    checkOutDate: requiredDate(request.requestedCheckOutDate),
    guestCount: requiredGuestCount(request.requestedGuestCount),
    subtotal: requiredDecimal(request.requestedSubtotal),
    cleaningFee: requiredDecimal(request.requestedCleaningFee),
    taxes: requiredDecimal(request.requestedTaxes),
    discounts: requiredDecimal(request.requestedDiscounts),
    total: requiredDecimal(request.requestedTotal),
  };
}

function toRequestType(
  value: ReservationLifecycleRequestType,
): "DATE_CHANGE" | "STAY_EXTENSION" {
  if (value === ReservationLifecycleRequestType.DATE_CHANGE) {
    return "DATE_CHANGE";
  }

  if (value === ReservationLifecycleRequestType.STAY_EXTENSION) {
    return "STAY_EXTENSION";
  }

  throw new ReservationDateMutationCompletionError(
    "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
  );
}

function financialBranch(
  difference: Prisma.Decimal,
): "POSITIVE" | "ZERO" | "NEGATIVE" {
  if (difference.greaterThan(0)) {
    return "POSITIVE";
  }

  if (difference.lessThan(0)) {
    return "NEGATIVE";
  }

  return "ZERO";
}

function decimalEquals(
  left: Prisma.Decimal,
  right: Prisma.Decimal,
): boolean {
  return left.comparedTo(right) === 0;
}

function reservationMatchesSnapshot(
  request: CompletionRequest,
  snapshot: RequestedSnapshot,
): boolean {
  const reservation = request.reservation;

  return (
    reservation.status === ReservationStatus.CONFIRMED &&
    Boolean(reservation.confirmedAt) &&
    !reservation.cancelledAt &&
    reservation.checkInDate.getTime() === snapshot.checkInDate.getTime() &&
    reservation.checkOutDate.getTime() === snapshot.checkOutDate.getTime() &&
    reservation.guestCount === snapshot.guestCount &&
    decimalEquals(reservation.subtotal, snapshot.subtotal) &&
    decimalEquals(reservation.cleaningFee, snapshot.cleaningFee) &&
    decimalEquals(reservation.taxes, snapshot.taxes) &&
    decimalEquals(reservation.discounts, snapshot.discounts) &&
    decimalEquals(reservation.total, snapshot.total) &&
    reservation.currency === request.currency
  );
}

function assertCurrentReservationSnapshot(
  request: CompletionRequest,
): void {
  const reservation = request.reservation;

  if (
    reservation.status !== ReservationStatus.CONFIRMED ||
    !reservation.confirmedAt ||
    reservation.cancelledAt
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED",
    );
  }

  if (
    reservation.updatedAt.getTime() !==
      request.expectedReservationUpdatedAt.getTime() ||
    reservation.checkInDate.getTime() !== request.originalCheckInDate.getTime() ||
    reservation.checkOutDate.getTime() !== request.originalCheckOutDate.getTime() ||
    reservation.guestCount !== request.originalGuestCount ||
    !decimalEquals(reservation.subtotal, request.originalSubtotal) ||
    !decimalEquals(reservation.cleaningFee, request.originalCleaningFee) ||
    !decimalEquals(reservation.taxes, request.originalTaxes) ||
    !decimalEquals(reservation.discounts, request.originalDiscounts) ||
    !decimalEquals(reservation.total, request.originalTotal) ||
    reservation.currency !== request.currency
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_STALE",
    );
  }

  if (
    reservation.property.status !== PropertyStatus.ACTIVE ||
    reservation.property.deletedAt ||
    reservation.property.id !== reservation.propertyId ||
    !isAdminAccommodationId(reservation.propertyId)
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
    );
  }
}

function toGuatemalaDateTime(
  date: Date,
  time: string | null,
  fallbackToEndOfDay: boolean,
): Date | null {
  const dateOnly = dateOnlyFromDate(date);
  const [year, month, day] = dateOnly.split("-").map(Number);
  const normalizedTime = time ? normalizeTimeOfDay(time) : null;

  if (normalizedTime) {
    const [hours, minutes] = normalizedTime.split(":").map(Number);
    return new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hours + GUATEMALA_UTC_OFFSET_HOURS,
        minutes,
      ),
    );
  }

  if (!fallbackToEndOfDay) {
    return null;
  }

  return new Date(
    Date.UTC(year, month - 1, day + 1, GUATEMALA_UTC_OFFSET_HOURS) - 1,
  );
}

function assertCompletionTimeEligibility(
  request: CompletionRequest,
  snapshot: RequestedSnapshot,
  now: Date,
): void {
  if (request.requestType === ReservationLifecycleRequestType.DATE_CHANGE) {
    const originalCheckInAt = getArrivalCheckInDateTime(
      request.originalCheckInDate,
      request.reservation.property.checkInTime,
    );
    const requestedCheckInAt = getArrivalCheckInDateTime(
      snapshot.checkInDate,
      request.reservation.property.checkInTime,
    );

    if (!originalCheckInAt || !requestedCheckInAt) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
      );
    }

    if (now >= originalCheckInAt || now >= requestedCheckInAt) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }

    return;
  }

  const checkOutBoundary = toGuatemalaDateTime(
    request.reservation.checkOutDate,
    request.reservation.property.checkOutTime,
    true,
  );

  if (!checkOutBoundary || now >= checkOutBoundary) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
    );
  }

  if (
    snapshot.checkInDate.getTime() !== request.originalCheckInDate.getTime() ||
    snapshot.checkOutDate.getTime() <=
      request.originalCheckOutDate.getTime()
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_EXTENSION_INVALID",
    );
  }
}

function assertCompletedState(
  request: CompletionRequest,
  snapshot: RequestedSnapshot,
  branch: "POSITIVE" | "ZERO" | "NEGATIVE",
  expectedPaymentId: string | null,
): ReservationDateMutationCompletionResult {
  if (!request.completedAt || !reservationMatchesSnapshot(request, snapshot)) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  let paymentId: string | null = null;
  let holdId: string | null = null;

  if (branch === "POSITIVE") {
    const approvedPayments = request.adjustmentPayments.filter(
      (payment) => payment.status === PaymentStatus.APPROVED,
    );

    if (
      approvedPayments.length !== 1 ||
      (expectedPaymentId && approvedPayments[0].id !== expectedPaymentId) ||
      !request.hold ||
      request.hold.status !== LifecycleRequestHoldStatus.RELEASED
    ) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }

    paymentId = approvedPayments[0].id;
    holdId = request.hold.id;
  } else if (branch !== "ZERO") {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_NEGATIVE_COMPLETION_DEFERRED",
    );
  }

  return {
    lifecycleRequestId: request.id,
    reservationId: request.reservationId,
    requestType: toRequestType(request.requestType),
    financialBranch: branch,
    paymentId,
    holdId,
    completedAt: request.completedAt.toISOString(),
    reservationUpdatedAt: request.reservation.updatedAt.toISOString(),
    confirmedAt: request.reservation.confirmedAt!.toISOString(),
    skippedArrivalNotifications: 0,
    arrivalNotificationId: null,
    alreadyCompleted: true,
  };
}

function assertPositiveArtifacts(
  request: CompletionRequest,
  difference: Prisma.Decimal,
  snapshot: RequestedSnapshot,
  expectedPaymentId: string | null,
  now: Date,
): PositiveArtifacts {
  const hold = request.hold;
  const approvedPayments = request.adjustmentPayments.filter(
    (payment) => payment.status === PaymentStatus.APPROVED,
  );

  if (
    request.status !==
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
    !hold ||
    hold.lifecycleRequestId !== request.id ||
    hold.propertyId !== request.reservation.propertyId ||
    hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
    hold.expiresAt <= now ||
    hold.startDate.getTime() !== snapshot.checkInDate.getTime() ||
    hold.endDate.getTime() !== snapshot.checkOutDate.getTime()
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE",
    );
  }

  if (approvedPayments.length !== 1) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED",
    );
  }

  const payment = approvedPayments[0];

  if (
    (expectedPaymentId && payment.id !== expectedPaymentId) ||
    payment.reservationId !== request.reservationId ||
    payment.lifecycleRequestId !== request.id ||
    payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
    !payment.paidAt ||
    payment.paidAt > hold.expiresAt ||
    payment.currency !== request.currency ||
    payment.amount.comparedTo(difference) !== 0
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED",
    );
  }

  return {
    paymentId: payment.id,
    holdId: hold.id,
    preparationBuffer: {
      daysBefore: hold.preparationDaysBefore,
      daysAfter: hold.preparationDaysAfter,
    },
  };
}

async function assertFinalAvailability(
  transaction: Prisma.TransactionClient,
  request: CompletionRequest,
  snapshot: RequestedSnapshot,
  preparationBuffer: PreparationBufferPolicy,
  now: Date,
): Promise<void> {
  const accommodationId = request.reservation.propertyId as AccommodationId;
  const stayRange = {
    startDate: dateOnlyFromDate(snapshot.checkInDate),
    endDate: dateOnlyFromDate(snapshot.checkOutDate),
  };
  const ranges = [
    stayRange,
    ...buildPreparationBufferRanges(
      accommodationId,
      stayRange,
      preparationBuffer,
    ).map((range) => ({
      startDate: range.startDate,
      endDate: range.endDate,
    })),
  ];

  for (const range of ranges) {
    const availability = await checkAccommodationAvailability(
      {
        accommodationId,
        startDate: range.startDate,
        endDate: range.endDate,
        excludeReservationId: request.reservationId,
        excludeLifecycleRequestId: request.id,
      },
      { prismaClient: transaction, now },
    );

    if (!availability.available) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE",
      );
    }
  }
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function normalizeRecipient(value: string): string {
  return value.trim().toLowerCase();
}

function hasCompleteArrivalSettings(
  settings: CompletionRequest["reservation"]["property"]["arrivalInstructions"],
): settings is NonNullable<
  CompletionRequest["reservation"]["property"]["arrivalInstructions"]
> {
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

async function supersedeAndRefreshArrivalInstructions(
  transaction: Prisma.TransactionClient,
  request: CompletionRequest,
  snapshot: RequestedSnapshot,
  now: Date,
): Promise<ArrivalIntentResult> {
  const skipped = await transaction.emailNotification.updateMany({
    where: {
      reservationId: request.reservationId,
      type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
      reservationCheckInDateSnapshot: request.reservation.checkInDate,
      status: {
        in: [
          EmailNotificationStatus.PENDING,
          EmailNotificationStatus.FAILED,
        ],
      },
    },
    data: {
      status: EmailNotificationStatus.SKIPPED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: ARRIVAL_SUPERSEDED_ERROR_CODE,
      errorMessage: ARRIVAL_SUPERSEDED_ERROR_MESSAGE,
    },
  });
  const settings = request.reservation.property.arrivalInstructions;

  if (!hasCompleteArrivalSettings(settings)) {
    return { skippedCount: skipped.count, notificationId: null };
  }

  const checkInAt = getArrivalCheckInDateTime(
    snapshot.checkInDate,
    request.reservation.property.checkInTime,
  );
  const scheduledFor = getArrivalInstructionsScheduledFor(
    snapshot.checkInDate,
    request.reservation.property.checkInTime,
    settings.leadTimeHours,
  );

  if (!checkInAt || !scheduledFor || checkInAt <= now) {
    return { skippedCount: skipped.count, notificationId: null };
  }

  const recipient = normalizeRecipient(request.reservation.guestEmail);
  const checkInDate = dateOnlyFromDate(snapshot.checkInDate);
  const deduplicationKey = `arrival-instructions/date-mutation/${request.id}/${checkInDate}/${settings.updatedAt.getTime()}/${recipient}`;
  const existing = await transaction.emailNotification.findUnique({
    where: { deduplicationKey },
    select: { id: true },
  });

  if (existing) {
    return {
      skippedCount: skipped.count,
      notificationId: existing.id,
    };
  }

  const notification = await transaction.emailNotification.create({
    data: {
      reservationId: request.reservationId,
      type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
      recipient,
      locale: normalizeLocale(request.reservation.preferredLocale),
      deduplicationKey,
      origin: EmailNotificationOrigin.AUTOMATIC,
      status: EmailNotificationStatus.PENDING,
      scheduledFor,
      nextAttemptAt: scheduledFor,
      reservationCheckInDateSnapshot: snapshot.checkInDate,
      arrivalInstructionsVersion: settings.updatedAt,
    },
    select: { id: true },
  });

  return {
    skippedCount: skipped.count,
    notificationId: notification.id,
  };
}

async function completeRequestInTransaction(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    lifecycleRequestId: string;
    trigger: ReservationDateMutationCompletionTrigger;
    expectedPaymentId: string | null;
    now: Date;
  }>,
): Promise<ReservationDateMutationCompletionResult> {
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: input.lifecycleRequestId.trim() },
    select: completionRequestSelect,
  });

  if (!request) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  const requestType = toRequestType(request.requestType);
  const difference = requiredDecimal(request.financialDifference);
  const branch = financialBranch(difference);
  const snapshot = requestedSnapshot(request);

  if (request.status === ReservationLifecycleRequestStatus.COMPLETED) {
    return assertCompletedState(
      request,
      snapshot,
      branch,
      input.expectedPaymentId,
    );
  }

  if (branch === "NEGATIVE") {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_NEGATIVE_COMPLETION_DEFERRED",
    );
  }

  assertCurrentReservationSnapshot(request);
  assertCompletionTimeEligibility(request, snapshot, input.now);

  let positiveArtifacts: PositiveArtifacts | null = null;
  let preparationBuffer: PreparationBufferPolicy = {
    daysBefore: request.reservation.property.preparationDaysBefore,
    daysAfter: request.reservation.property.preparationDaysAfter,
  };

  if (branch === "POSITIVE") {
    positiveArtifacts = assertPositiveArtifacts(
      request,
      difference,
      snapshot,
      input.expectedPaymentId,
      input.now,
    );
    preparationBuffer = positiveArtifacts.preparationBuffer;
  } else if (request.status !== ReservationLifecycleRequestStatus.APPROVED) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  await assertFinalAvailability(
    transaction,
    request,
    snapshot,
    preparationBuffer,
    input.now,
  );

  const reservationUpdate = await transaction.reservation.updateMany({
    where: {
      id: request.reservationId,
      status: ReservationStatus.CONFIRMED,
      updatedAt: request.reservation.updatedAt,
      cancelledAt: null,
    },
    data: {
      checkInDate: snapshot.checkInDate,
      checkOutDate: snapshot.checkOutDate,
      subtotal: snapshot.subtotal,
      cleaningFee: snapshot.cleaningFee,
      taxes: snapshot.taxes,
      discounts: snapshot.discounts,
      total: snapshot.total,
    },
  });

  if (reservationUpdate.count !== 1) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_STALE",
    );
  }

  const requestUpdate =
    await transaction.reservationLifecycleRequest.updateMany({
      where: {
        id: request.id,
        status: request.status,
        version: request.version,
        updatedAt: request.updatedAt,
      },
      data: {
        status: ReservationLifecycleRequestStatus.COMPLETED,
        completedAt: input.now,
        failureCode: null,
        version: { increment: 1 },
      },
    });

  if (requestUpdate.count !== 1) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  if (positiveArtifacts && request.hold) {
    const holdUpdate = await transaction.lifecycleRequestHold.updateMany({
      where: {
        id: request.hold.id,
        lifecycleRequestId: request.id,
        status: LifecycleRequestHoldStatus.ACTIVE,
        version: request.hold.version,
        updatedAt: request.hold.updatedAt,
        expiresAt: { gt: input.now },
      },
      data: {
        status: LifecycleRequestHoldStatus.RELEASED,
        releasedAt: input.now,
        releaseReasonCode: HOLD_RELEASED_REASON_CODE,
        version: { increment: 1 },
      },
    });

    if (holdUpdate.count !== 1) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE",
      );
    }
  }

  const arrival = await supersedeAndRefreshArrivalInstructions(
    transaction,
    request,
    snapshot,
    input.now,
  );
  const updatedReservation = await transaction.reservation.findUnique({
    where: { id: request.reservationId },
    select: {
      updatedAt: true,
      confirmedAt: true,
    },
  });

  if (!updatedReservation?.confirmedAt) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  const actorId = request.reviewedByAdminId ?? request.createdByAdminId;
  const actorEmail = request.reviewedByAdmin?.email ?? null;

  if (positiveArtifacts) {
    await transaction.adminAuditLog.create({
      data: {
        userId: actorId,
        action: "LIFECYCLE_ADJUSTMENT_HOLD_RELEASED",
        entityType: "LifecycleRequestHold",
        entityId: positiveArtifacts.holdId,
        metadata: {
          actorEmail,
          reservationId: request.reservationId,
          lifecycleRequestId: request.id,
          requestType,
          holdId: positiveArtifacts.holdId,
          paymentId: positiveArtifacts.paymentId,
          releasedAt: input.now.toISOString(),
          reasonCode: HOLD_RELEASED_REASON_CODE,
          publicPendingReservationHoldChanged: false,
        },
      },
    });
  }

  await transaction.adminAuditLog.create({
    data: {
      userId: actorId,
      action:
        request.requestType === ReservationLifecycleRequestType.DATE_CHANGE
          ? "LIFECYCLE_DATE_CHANGE_COMPLETED"
          : "LIFECYCLE_STAY_EXTENSION_COMPLETED",
      entityType: "ReservationLifecycleRequest",
      entityId: request.id,
      metadata: {
        actorEmail,
        trigger: input.trigger,
        reservationId: request.reservationId,
        lifecycleRequestId: request.id,
        requestType,
        previousRequestStatus: request.status,
        requestStatus: ReservationLifecycleRequestStatus.COMPLETED,
        originalCheckInDate: dateOnlyFromDate(request.originalCheckInDate),
        originalCheckOutDate: dateOnlyFromDate(request.originalCheckOutDate),
        requestedCheckInDate: dateOnlyFromDate(snapshot.checkInDate),
        requestedCheckOutDate: dateOnlyFromDate(snapshot.checkOutDate),
        originalTotal: request.originalTotal.toFixed(2),
        requestedTotal: snapshot.total.toFixed(2),
        financialDifference: difference.toFixed(2),
        financialBranch: branch,
        currency: request.currency,
        paymentId: positiveArtifacts?.paymentId ?? null,
        holdId: positiveArtifacts?.holdId ?? null,
        reservationStatus: ReservationStatus.CONFIRMED,
        reservationUpdatedAt: updatedReservation.updatedAt.toISOString(),
        skippedArrivalNotifications: arrival.skippedCount,
        arrivalNotificationId: arrival.notificationId,
        lifecycleNotificationCreated: false,
      },
    },
  });

  return {
    lifecycleRequestId: request.id,
    reservationId: request.reservationId,
    requestType,
    financialBranch: branch,
    paymentId: positiveArtifacts?.paymentId ?? null,
    holdId: positiveArtifacts?.holdId ?? null,
    completedAt: input.now.toISOString(),
    reservationUpdatedAt: updatedReservation.updatedAt.toISOString(),
    confirmedAt: updatedReservation.confirmedAt.toISOString(),
    skippedArrivalNotifications: arrival.skippedCount,
    arrivalNotificationId: arrival.notificationId,
    alreadyCompleted: false,
  };
}

export async function completeApprovedZeroDateMutationInTransaction(
  transaction: Prisma.TransactionClient,
  lifecycleRequestId: string,
  now: Date,
): Promise<ReservationDateMutationCompletionResult> {
  const result = await completeRequestInTransaction(transaction, {
    lifecycleRequestId,
    trigger: "ADMIN_ZERO_DIFFERENCE_APPROVAL",
    expectedPaymentId: null,
    now,
  });

  if (result.financialBranch !== "ZERO") {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  return result;
}

export async function completePaidDateMutation(
  paymentId: string,
  now: Date = new Date(),
): Promise<ReservationDateMutationCompletionResult> {
  const normalizedPaymentId = paymentId.trim();

  if (!normalizedPaymentId) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED",
    );
  }

  return runSerializableCompletionTransaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: normalizedPaymentId },
      select: {
        id: true,
        lifecycleRequestId: true,
        purpose: true,
        status: true,
      },
    });

    if (
      !payment ||
      !payment.lifecycleRequestId ||
      payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
      payment.status !== PaymentStatus.APPROVED
    ) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED",
      );
    }

    return completeRequestInTransaction(transaction, {
      lifecycleRequestId: payment.lifecycleRequestId,
      trigger: "APPROVED_ADJUSTMENT_PAYMENT",
      expectedPaymentId: payment.id,
      now,
    });
  });
}
