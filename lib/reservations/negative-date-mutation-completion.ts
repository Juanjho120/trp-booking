import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PropertyStatus,
  RefundAuthorizationType,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { checkAccommodationAvailability } from "@/lib/availability/service";
import {
  buildPreparationBufferRanges,
  dateOnlyFromDate,
} from "@/lib/availability/rules";
import {
  createLifecycleRequestNotificationIntents,
  getArrivalCheckInDateTime,
  getArrivalInstructionsScheduledFor,
} from "@/lib/email";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";
import {
  parseFinalCPricingSnapshot,
  pricingSnapshotsEqual,
} from "@/lib/pricing/lifecycle";
import { isAdminAccommodationId } from "@/lib/admin/accommodations";
import type { AccommodationId } from "@/types/accommodation";
import type { FinalCPricingSnapshot } from "@/types/pricing";
import {
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";
import {
  buildNegativeLifecycleRefundOperationKey,
  createNegativeLifecycleAdjustmentRefundInTransaction,
  LifecycleAdjustmentRefundError,
} from "@/lib/reservations/lifecycle-adjustment-refunds";
import {
  getReservationFinancialSummary,
  ReservationFinancialSummaryError,
} from "@/lib/reservations/financial-summary";
import {
  ReservationDateMutationCompletionError,
} from "@/lib/reservations/date-mutation-completion";

const GUATEMALA_UTC_OFFSET_HOURS = 6;
const ARRIVAL_SUPERSEDED_ERROR_CODE =
  "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED_DATE_MUTATION";
const ARRIVAL_SUPERSEDED_ERROR_MESSAGE =
  "Superseded because the confirmed reservation dates were updated.";

export type NegativeDateMutationCompletionResult = Readonly<{
  lifecycleRequestId: string;
  reservationId: string;
  requestType: "DATE_CHANGE" | "STAY_EXTENSION";
  financialBranch: "NEGATIVE";
  paymentId: string;
  paymentIds: readonly string[];
  holdId: null;
  refundId: string;
  refundIds: readonly string[];
  refundOperationKey: string | null;
  requestedRefundAmount: string;
  completedAt: string;
  reservationUpdatedAt: string;
  confirmedAt: string;
  skippedArrivalNotifications: number;
  arrivalNotificationId: string | null;
  alreadyCompleted: boolean;
}>;

const REFUND_HISTORY_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]);

const negativeCompletionSelect = {
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
  decisionNote: true,
  requestNote: true,
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
  requestedPricingSnapshot: true,
  createdByAdminId: true,
  reviewedByAdminId: true,
  reviewedByAdmin: {
    select: {
      email: true,
    },
  },
  sourcePayment: {
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      updatedAt: true,
    },
  },
  refunds: {
    where: {
      authorizationType: RefundAuthorizationType.LIFECYCLE_ADJUSTMENT,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      paymentId: true,
      lifecycleRequestId: true,
      refundOperationKey: true,
      authorizationType: true,
      amount: true,
      currency: true,
      status: true,
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
      pricingSnapshot: true,
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
} satisfies Prisma.ReservationLifecycleRequestSelect;

type NegativeCompletionRequest =
  Prisma.ReservationLifecycleRequestGetPayload<{
    select: typeof negativeCompletionSelect;
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
  pricingSnapshot: FinalCPricingSnapshot;
}>;

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

function requestedSnapshot(
  request: NegativeCompletionRequest,
): RequestedSnapshot {
  const pricingSnapshot = parseFinalCPricingSnapshot(
    request.requestedPricingSnapshot,
  );

  if (!pricingSnapshot) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  return {
    checkInDate: requiredDate(request.requestedCheckInDate),
    checkOutDate: requiredDate(request.requestedCheckOutDate),
    guestCount: requiredGuestCount(request.requestedGuestCount),
    subtotal: requiredDecimal(request.requestedSubtotal),
    cleaningFee: requiredDecimal(request.requestedCleaningFee),
    taxes: requiredDecimal(request.requestedTaxes),
    discounts: requiredDecimal(request.requestedDiscounts),
    total: requiredDecimal(request.requestedTotal),
    pricingSnapshot,
  };
}

function decimalEquals(
  left: Prisma.Decimal,
  right: Prisma.Decimal,
): boolean {
  return left.comparedTo(right) === 0;
}

function requestTypeLabel(
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

function assertCurrentReservationSnapshot(
  request: NegativeCompletionRequest,
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
  const [year, month, day] = dateOnlyFromDate(date).split("-").map(Number);
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

  if (!fallbackToEndOfDay) return null;

  return new Date(
    Date.UTC(year, month - 1, day + 1, GUATEMALA_UTC_OFFSET_HOURS) - 1,
  );
}

function assertCompletionTimeEligibility(
  request: NegativeCompletionRequest,
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
    snapshot.checkOutDate.getTime() <= request.originalCheckOutDate.getTime()
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_EXTENSION_INVALID",
    );
  }
}

async function assertFinalAvailability(
  transaction: Prisma.TransactionClient,
  request: NegativeCompletionRequest,
  snapshot: RequestedSnapshot,
  now: Date,
): Promise<void> {
  const accommodationId = request.reservation.propertyId as AccommodationId;
  const stayRange = {
    startDate: dateOnlyFromDate(snapshot.checkInDate),
    endDate: dateOnlyFromDate(snapshot.checkOutDate),
  };
  const ranges = [
    stayRange,
    ...buildPreparationBufferRanges(accommodationId, stayRange, {
      daysBefore: request.reservation.property.preparationDaysBefore,
      daysAfter: request.reservation.property.preparationDaysAfter,
    }).map((range) => ({
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

function hasCompleteArrivalSettings(
  settings: NegativeCompletionRequest["reservation"]["property"]["arrivalInstructions"],
): settings is NonNullable<
  NegativeCompletionRequest["reservation"]["property"]["arrivalInstructions"]
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
  request: NegativeCompletionRequest,
  snapshot: RequestedSnapshot,
  now: Date,
): Promise<Readonly<{ skippedCount: number; notificationId: string | null }>> {
  const skipped = await transaction.emailNotification.updateMany({
    where: {
      reservationId: request.reservationId,
      type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
      reservationCheckInDateSnapshot: request.reservation.checkInDate,
      status: {
        in: [EmailNotificationStatus.PENDING, EmailNotificationStatus.FAILED],
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

  const recipient = request.reservation.guestEmail.trim().toLowerCase();
  const checkInDate = dateOnlyFromDate(snapshot.checkInDate);
  const deduplicationKey = `arrival-instructions/date-mutation/${request.id}/${checkInDate}/${settings.updatedAt.getTime()}/${recipient}`;
  const existing = await transaction.emailNotification.findUnique({
    where: { deduplicationKey },
    select: { id: true },
  });

  if (existing) {
    return { skippedCount: skipped.count, notificationId: existing.id };
  }

  const notification = await transaction.emailNotification.create({
    data: {
      reservationId: request.reservationId,
      type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
      recipient,
      locale: request.reservation.preferredLocale === "en" ? "en" : "es",
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

  return { skippedCount: skipped.count, notificationId: notification.id };
}

function reservationMatchesSnapshot(
  request: NegativeCompletionRequest,
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
    reservation.currency === request.currency &&
    pricingSnapshotsEqual(
      reservation.pricingSnapshot,
      snapshot.pricingSnapshot,
    )
  );
}

async function completedResult(
  transaction: Prisma.TransactionClient,
  request: NegativeCompletionRequest,
  snapshot: RequestedSnapshot,
): Promise<NegativeDateMutationCompletionResult> {
  const difference = requiredDecimal(request.financialDifference);
  const sourcePayment = request.sourcePayment;

  if (
    !request.completedAt ||
    !request.reservation.confirmedAt ||
    !sourcePayment ||
    sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    !difference.lessThan(0) ||
    !reservationMatchesSnapshot(request, snapshot)
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  let financialSummary;
  try {
    financialSummary = await getReservationFinancialSummary(
      request.reservationId,
      transaction,
    );
  } catch (error) {
    if (error instanceof ReservationFinancialSummaryError) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }
    throw error;
  }

  const eligiblePaymentOrder = new Map(
    financialSummary.eligibleStayPayments.map((payment, index) => [
      payment.paymentId,
      index,
    ] as const),
  );

  if (eligiblePaymentOrder.get(sourcePayment.id) !== 0) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  const expectedAmount = difference.abs().toDecimalPlaces(2);
  const operationKey = buildNegativeLifecycleRefundOperationKey(request.id);
  const operationRefunds = request.refunds.filter(
    (refund) => refund.refundOperationKey === operationKey,
  );

  let orderedRefunds: typeof request.refunds;
  let refundOperationKey: string | null;

  if (operationRefunds.length > 0) {
    if (operationRefunds.length !== request.refunds.length) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }

    const seenPayments = new Set<string>();
    const operationTotal = operationRefunds.reduce((total, refund) => {
      if (
        refund.lifecycleRequestId !== request.id ||
        refund.authorizationType !== RefundAuthorizationType.LIFECYCLE_ADJUSTMENT ||
        refund.currency !== request.currency ||
        !refund.amount.greaterThan(0) ||
        !eligiblePaymentOrder.has(refund.paymentId) ||
        seenPayments.has(refund.paymentId)
      ) {
        throw new ReservationDateMutationCompletionError(
          "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
        );
      }
      seenPayments.add(refund.paymentId);
      return total.add(refund.amount).toDecimalPlaces(2);
    }, new Prisma.Decimal(0));

    if (!operationTotal.equals(expectedAmount)) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }

    orderedRefunds = [...operationRefunds].sort(
      (left, right) =>
        (eligiblePaymentOrder.get(left.paymentId) ?? Number.MAX_SAFE_INTEGER) -
        (eligiblePaymentOrder.get(right.paymentId) ?? Number.MAX_SAFE_INTEGER),
    );
    refundOperationKey = operationKey;
  } else {
    const legacyRefunds = request.refunds.filter(
      (refund) =>
        refund.refundOperationKey === null &&
        refund.paymentId === sourcePayment.id &&
        refund.lifecycleRequestId === request.id &&
        refund.authorizationType === RefundAuthorizationType.LIFECYCLE_ADJUSTMENT &&
        refund.amount.comparedTo(expectedAmount) === 0 &&
        refund.currency === request.currency,
    );

    if (request.refunds.length !== 1 || legacyRefunds.length !== 1) {
      throw new ReservationDateMutationCompletionError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }

    orderedRefunds = legacyRefunds;
    refundOperationKey = null;
  }

  const firstRefund = orderedRefunds[0];
  if (!firstRefund) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  return {
    lifecycleRequestId: request.id,
    reservationId: request.reservationId,
    requestType: requestTypeLabel(request.requestType),
    financialBranch: "NEGATIVE",
    paymentId: firstRefund.paymentId,
    paymentIds: orderedRefunds.map((refund) => refund.paymentId),
    holdId: null,
    refundId: firstRefund.id,
    refundIds: orderedRefunds.map((refund) => refund.id),
    refundOperationKey,
    requestedRefundAmount: expectedAmount.toFixed(2),
    completedAt: request.completedAt.toISOString(),
    reservationUpdatedAt: request.reservation.updatedAt.toISOString(),
    confirmedAt: request.reservation.confirmedAt.toISOString(),
    skippedArrivalNotifications: 0,
    arrivalNotificationId: null,
    alreadyCompleted: true,
  };
}

export async function completeApprovedNegativeDateMutationInTransaction(
  transaction: Prisma.TransactionClient,
  lifecycleRequestId: string,
  now: Date,
): Promise<NegativeDateMutationCompletionResult> {
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: lifecycleRequestId.trim() },
    select: negativeCompletionSelect,
  });

  if (!request) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  const difference = requiredDecimal(request.financialDifference);
  const snapshot = requestedSnapshot(request);

  if (request.status === ReservationLifecycleRequestStatus.COMPLETED) {
    return completedResult(transaction, request, snapshot);
  }

  if (
    request.status !== ReservationLifecycleRequestStatus.APPROVED ||
    !difference.lessThan(0)
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    );
  }

  assertCurrentReservationSnapshot(request);
  assertCompletionTimeEligibility(request, snapshot, now);
  await assertFinalAvailability(transaction, request, snapshot, now);

  const sourcePayment = request.sourcePayment;

  if (
    !sourcePayment ||
    sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    !REFUND_HISTORY_PAYMENT_STATUSES.has(sourcePayment.status)
  ) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND",
    );
  }

  const actorId = request.reviewedByAdminId ?? request.createdByAdminId;
  let refundOperation;

  try {
    refundOperation = await createNegativeLifecycleAdjustmentRefundInTransaction(
      transaction,
      {
        lifecycleRequestId: request.id,
        reservationId: request.reservationId,
        requestedByAdminId: actorId,
        sourcePayment,
        financialDifference: difference,
        currency: request.currency,
        reason: request.decisionNote ?? request.requestNote,
        now,
      },
    );
  } catch (error) {
    if (error instanceof LifecycleAdjustmentRefundError) {
      throw new ReservationDateMutationCompletionError(error.code);
    }
    throw error;
  }

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
      pricingSnapshot: snapshot.pricingSnapshot as Prisma.InputJsonValue,
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
        status: ReservationLifecycleRequestStatus.APPROVED,
        version: request.version,
        updatedAt: request.updatedAt,
      },
      data: {
        status: ReservationLifecycleRequestStatus.COMPLETED,
        completedAt: now,
        failureCode: null,
        version: { increment: 1 },
      },
    });

  if (requestUpdate.count !== 1) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  const arrival = await supersedeAndRefreshArrivalInstructions(
    transaction,
    request,
    snapshot,
    now,
  );
  const updatedReservation = await transaction.reservation.findUnique({
    where: { id: request.reservationId },
    select: { updatedAt: true, confirmedAt: true },
  });

  if (!updatedReservation?.confirmedAt) {
    throw new ReservationDateMutationCompletionError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  const lifecycleNotificationIntents =
    await createLifecycleRequestNotificationIntents(transaction, {
      reservationId: request.reservationId,
      lifecycleRequestId: request.id,
      requestType: request.requestType,
      guestEmail: request.reservation.guestEmail,
      preferredLocale: request.reservation.preferredLocale,
    });

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
        actorEmail: request.reviewedByAdmin?.email ?? null,
        trigger: "ADMIN_NEGATIVE_DIFFERENCE_APPROVAL",
        reservationId: request.reservationId,
        lifecycleRequestId: request.id,
        requestType: requestTypeLabel(request.requestType),
        originalCheckInDate: dateOnlyFromDate(request.originalCheckInDate),
        originalCheckOutDate: dateOnlyFromDate(request.originalCheckOutDate),
        requestedCheckInDate: dateOnlyFromDate(snapshot.checkInDate),
        requestedCheckOutDate: dateOnlyFromDate(snapshot.checkOutDate),
        originalTotal: request.originalTotal.toFixed(2),
        requestedTotal: snapshot.total.toFixed(2),
        financialDifference: difference.toFixed(2),
        financialBranch: "NEGATIVE",
        currency: request.currency,
        pricingSnapshotVersion: snapshot.pricingSnapshot.version,
        pricingSnapshotSegmentCount: snapshot.pricingSnapshot.segments.length,
        sourcePaymentId: sourcePayment.id,
        refundId: refundOperation.refund.refundId,
        refundIds: refundOperation.refunds.map((refund) => refund.refundId),
        refundPaymentIds: refundOperation.refunds.map((refund) => refund.paymentId),
        refundOperationKey: refundOperation.refundOperationKey,
        refundRequestedAmount: refundOperation.requestedAmount,
        refundLegCount: refundOperation.refunds.length,
        refundAuthorizationType:
          RefundAuthorizationType.LIFECYCLE_ADJUSTMENT,
        refundStatus: refundOperation.refund.status,
        reservationStatus: ReservationStatus.CONFIRMED,
        reservationUpdatedAt: updatedReservation.updatedAt.toISOString(),
        skippedArrivalNotifications: arrival.skippedCount,
        arrivalNotificationId: arrival.notificationId,
        lifecycleNotificationCreated: true,
        lifecycleNotificationCount: lifecycleNotificationIntents.length,
        lifecycleNotificationIds: lifecycleNotificationIntents.map(
          ({ id }) => id,
        ),
      },
    },
  });

  return {
    lifecycleRequestId: request.id,
    reservationId: request.reservationId,
    requestType: requestTypeLabel(request.requestType),
    financialBranch: "NEGATIVE",
    paymentId: refundOperation.refund.paymentId,
    paymentIds: refundOperation.refunds.map((refund) => refund.paymentId),
    holdId: null,
    refundId: refundOperation.refund.refundId,
    refundIds: refundOperation.refunds.map((refund) => refund.refundId),
    refundOperationKey: refundOperation.refundOperationKey,
    requestedRefundAmount: refundOperation.requestedAmount,
    completedAt: now.toISOString(),
    reservationUpdatedAt: updatedReservation.updatedAt.toISOString(),
    confirmedAt: updatedReservation.confirmedAt.toISOString(),
    skippedArrivalNotifications: arrival.skippedCount,
    arrivalNotificationId: arrival.notificationId,
    alreadyCompleted: false,
  };
}
