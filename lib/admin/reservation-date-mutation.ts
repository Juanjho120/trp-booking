import {
  LifecycleRequestHoldStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PropertyStatus,
  RefundStatus,
  ReservationLifecycleRequestChannel,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import {
  checkAccommodationAvailability,
  getAvailabilityBlockingRecords,
} from "@/lib/availability/service";
import {
  addDaysToDateOnly,
  assertDateOnlyString,
  assertValidAvailabilityDateRange,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
  getAffectedAccommodationIds,
  getBlockingAccommodationIds,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import { getArrivalCheckInDateTime } from "@/lib/email";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";
import { createLifecycleAdjustmentHandoffToken } from "@/lib/payments/lifecycle-adjustment-handoff";
import {
  buildLifecycleAdjustmentHoldExpiresAt,
  expireLifecycleAdjustmentRequestIfNeeded,
  LIFECYCLE_ADJUSTMENT_HOLD_DURATION_MINUTES,
} from "@/lib/reservations/lifecycle-adjustment-holds";
import type { AccommodationId } from "@/types/accommodation";
import type { AdminActor } from "@/types/admin";
import type {
  AdminDateMutationAdminSummary,
  AdminDateMutationChannel,
  AdminDateMutationDecisionResult,
  AdminDateMutationErrorCode,
  AdminDateMutationPricingMode,
  AdminDateMutationRequestSummary,
  AdminDateMutationRequestType,
  CreateAdminDateMutationRequestInput,
  DecideAdminDateMutationRequestInput,
} from "@/types/admin-reservation-date-mutation";
import type {
  AvailabilityBlockingRecord,
  DateOnlyString,
} from "@/types/availability";
import type { BlockedDatesApiResponse } from "@/types/availability-blocked-dates";

import { isAdminAccommodationId } from "./accommodations";
import { resolveAdminActor } from "./admin-actor";

const DATE_MUTATION_REVIEW_DURATION_HOURS = 24;
const DATE_MUTATION_MAX_HORIZON_DAYS = 365;
const DATE_MUTATION_CALENDAR_MAX_RANGE_DAYS = 42;
const DATE_MUTATION_TRANSACTION_MAX_ATTEMPTS = 3;
const DATE_MUTATION_TRANSACTION_MAX_WAIT_MS = 10_000;
const DATE_MUTATION_TRANSACTION_TIMEOUT_MS = 20_000;
const DATE_MUTATION_TRANSACTION_RETRY_DELAY_MS = 75;
const GUATEMALA_UTC_OFFSET_HOURS = 6;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1_000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const PENDING_REVIEW_EXPIRED_FAILURE_CODE =
  "LIFECYCLE_PENDING_REVIEW_EXPIRED";

const ACTIVE_DATE_MUTATION_STATUSES = [
  ReservationLifecycleRequestStatus.PENDING_REVIEW,
  ReservationLifecycleRequestStatus.APPROVED,
  ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT,
] as const;

const ACTIVE_CANCELLATION_STATUSES = [
  ReservationLifecycleRequestStatus.PENDING_REVIEW,
  ReservationLifecycleRequestStatus.APPROVED,
] as const;

const VALIDATED_INITIAL_PAYMENT_STATUSES = [
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
] as const;

const dateMutationRequestSummarySelect = {
  id: true,
  reservationId: true,
  sourcePaymentId: true,
  requestType: true,
  status: true,
  channel: true,
  requesterName: true,
  requesterEmail: true,
  requesterPhone: true,
  requestNote: true,
  clientRequestId: true,
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
  financialDifference: true,
  currency: true,
  createdByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  reviewedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  decisionReasonCode: true,
  decisionNote: true,
  reviewedAt: true,
  decidedAt: true,
  hold: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      preparationDaysBefore: true,
      preparationDaysAfter: true,
      expiresAt: true,
      releasedAt: true,
      expiredAt: true,
      releaseReasonCode: true,
      version: true,
    },
  },
  adjustmentPayments: {
    where: {
      purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      paidAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  requestedAt: true,
  expiredAt: true,
  expectedReservationUpdatedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      propertyId: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type DateMutationRequestSummaryRecord =
  Prisma.ReservationLifecycleRequestGetPayload<{
    select: typeof dateMutationRequestSummarySelect;
  }>;

const dateMutationRequestForDecisionSelect = {
  ...dateMutationRequestSummarySelect,
  originalReservationStatus: true,
  reservation: {
    select: {
      id: true,
      propertyId: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      checkInDate: true,
      checkOutDate: true,
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
        },
      },
    },
  },
  sourcePayment: {
    select: {
      id: true,
      reservationId: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type DateMutationRequestForDecision =
  Prisma.ReservationLifecycleRequestGetPayload<{
    select: typeof dateMutationRequestForDecisionSelect;
  }>;

const reservationForDateMutationSelect = {
  id: true,
  propertyId: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  guestCountry: true,
  preferredLocale: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  status: true,
  subtotal: true,
  cleaningFee: true,
  taxes: true,
  discounts: true,
  total: true,
  currency: true,
  confirmedAt: true,
  cancelledAt: true,
  updatedAt: true,
  property: {
    select: {
      id: true,
      status: true,
      deletedAt: true,
      baseNightlyPrice: true,
      currency: true,
      checkInTime: true,
      checkOutTime: true,
      preparationDaysBefore: true,
      preparationDaysAfter: true,
    },
  },
  payments: {
    where: {
      purpose: PaymentPurpose.INITIAL_RESERVATION,
      status: {
        in: [...VALIDATED_INITIAL_PAYMENT_STATUSES],
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
    },
  },
} satisfies Prisma.ReservationSelect;

type ReservationForDateMutation = Prisma.ReservationGetPayload<{
  select: typeof reservationForDateMutationSelect;
}>;

type NormalizedCreateInput = Readonly<{
  reservationId: string;
  requestType: AdminDateMutationRequestType;
  requestedCheckInDate: DateOnlyString;
  requestedCheckOutDate: DateOnlyString;
  channel: AdminDateMutationChannel;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestNote: string;
  expectedReservationUpdatedAt: string;
  requestId: string;
}>;

type DateMutationQuote = Readonly<{
  pricingMode: AdminDateMutationPricingMode;
  requestedSubtotal: Prisma.Decimal;
  requestedCleaningFee: Prisma.Decimal;
  requestedTaxes: Prisma.Decimal;
  requestedDiscounts: Prisma.Decimal;
  requestedTotal: Prisma.Decimal;
  financialDifference: Prisma.Decimal;
}>;

export class AdminReservationDateMutationError extends Error {
  constructor(public readonly code: AdminDateMutationErrorCode) {
    super(code);
    this.name = "AdminReservationDateMutationError";
  }
}

function normalizeRequiredText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  return normalizeOptionalText(value, 254)?.toLowerCase() ?? null;
}

function normalizeDateOnly(value: string): DateOnlyString {
  try {
    assertDateOnlyString(value, "date");
    return value;
  } catch {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }
}

function normalizeCreateInput(
  input: CreateAdminDateMutationRequestInput,
): NormalizedCreateInput {
  const reservationId = input.reservationId.trim();
  const requestId = input.requestId.trim();
  const requesterName = normalizeRequiredText(input.requesterName, 160);
  const requestNote = normalizeRequiredText(input.requestNote, 2_000);
  const expectedReservationUpdatedAt = input.expectedReservationUpdatedAt.trim();

  if (
    !reservationId ||
    reservationId.length > 120 ||
    !requestId ||
    requestId.length > 120 ||
    !requesterName ||
    !requestNote ||
    !expectedReservationUpdatedAt
  ) {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  const requestedCheckInDate = normalizeDateOnly(input.requestedCheckInDate);
  const requestedCheckOutDate = normalizeDateOnly(input.requestedCheckOutDate);

  try {
    assertValidAvailabilityDateRange({
      startDate: requestedCheckInDate,
      endDate: requestedCheckOutDate,
    });
  } catch {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  return {
    reservationId,
    requestType: input.requestType,
    requestedCheckInDate,
    requestedCheckOutDate,
    channel: input.channel,
    requesterName,
    requesterEmail: normalizeEmail(input.requesterEmail),
    requesterPhone: normalizeOptionalText(input.requesterPhone, 40),
    requestNote,
    expectedReservationUpdatedAt,
    requestId,
  };
}

function buildDateMutationIdempotencyKey(
  reservationId: string,
  requestId: string,
): string {
  return `reservation-date-mutation/${reservationId}/${requestId}`;
}

function toDateMutationRequestType(
  value: ReservationLifecycleRequestType,
): AdminDateMutationRequestType {
  if (
    value !== ReservationLifecycleRequestType.DATE_CHANGE &&
    value !== ReservationLifecycleRequestType.STAY_EXTENSION
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return value as AdminDateMutationRequestType;
}

function toDateMutationChannel(
  value: DateMutationRequestSummaryRecord["channel"],
): AdminDateMutationChannel {
  if (
    value !== ReservationLifecycleRequestChannel.EMAIL &&
    value !== ReservationLifecycleRequestChannel.PHONE &&
    value !== ReservationLifecycleRequestChannel.WHATSAPP &&
    value !== ReservationLifecycleRequestChannel.OTHER
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return value as AdminDateMutationChannel;
}

function toAdminSummary(
  admin: Readonly<{ name: string | null; email: string }>,
): AdminDateMutationAdminSummary {
  return {
    name: normalizeOptionalText(admin.name, 160),
    email: normalizeRequiredText(admin.email, 254).toLowerCase(),
  };
}

function pricingModeForRequestType(
  requestType: AdminDateMutationRequestType,
): AdminDateMutationPricingMode {
  return requestType === "DATE_CHANGE"
    ? "FULL_STAY_CURRENT_PRICE"
    : "ADDED_NIGHTS_CURRENT_PRICE";
}

function requireRequestedDecimal(
  value: Prisma.Decimal | null,
): Prisma.Decimal {
  if (value === null) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return value;
}

function requireRequestedDate(value: Date | null): Date {
  if (!value) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return value;
}

function requireRequestedGuestCount(value: number | null): number {
  if (value === null) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return value;
}

export function toAdminDateMutationRequestSummary(
  request: DateMutationRequestSummaryRecord,
  now: Date = new Date(),
): AdminDateMutationRequestSummary {
  const requestType = toDateMutationRequestType(request.requestType);
  const sourcePaymentId = request.sourcePaymentId;
  const requestedAt = request.requestedAt;
  const reviewExpiresAt = new Date(
    requestedAt.getTime() +
      DATE_MUTATION_REVIEW_DURATION_HOURS * MILLISECONDS_PER_HOUR,
  );
  const propertyId = request.reservation.propertyId;

  if (!sourcePaymentId || !isAdminAccommodationId(propertyId)) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return {
    id: request.id,
    reservationId: request.reservationId,
    sourcePaymentId,
    requestType,
    status: request.status,
    channel: toDateMutationChannel(request.channel),
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    requesterPhone: request.requesterPhone,
    requestNote: request.requestNote,
    original: {
      checkInDate: dateOnlyFromDate(request.originalCheckInDate),
      checkOutDate: dateOnlyFromDate(request.originalCheckOutDate),
      guestCount: request.originalGuestCount,
      pricing: {
        subtotal: request.originalSubtotal.toFixed(2),
        cleaningFee: request.originalCleaningFee.toFixed(2),
        taxes: request.originalTaxes.toFixed(2),
        discounts: request.originalDiscounts.toFixed(2),
        total: request.originalTotal.toFixed(2),
        currency: request.currency,
      },
    },
    requested: {
      checkInDate: dateOnlyFromDate(
        requireRequestedDate(request.requestedCheckInDate),
      ),
      checkOutDate: dateOnlyFromDate(
        requireRequestedDate(request.requestedCheckOutDate),
      ),
      guestCount: requireRequestedGuestCount(request.requestedGuestCount),
      pricing: {
        subtotal: requireRequestedDecimal(request.requestedSubtotal).toFixed(2),
        cleaningFee: requireRequestedDecimal(
          request.requestedCleaningFee,
        ).toFixed(2),
        taxes: requireRequestedDecimal(request.requestedTaxes).toFixed(2),
        discounts: requireRequestedDecimal(
          request.requestedDiscounts,
        ).toFixed(2),
        total: requireRequestedDecimal(request.requestedTotal).toFixed(2),
        currency: request.currency,
      },
    },
    financialDifference: requireRequestedDecimal(
      request.financialDifference,
    ).toFixed(2),
    pricingMode: pricingModeForRequestType(requestType),
    availability: {
      available: true,
      validatedAt: requestedAt.toISOString(),
      affectedAccommodationIds: getAffectedAccommodationIds(propertyId),
      blockingAccommodationIds: getBlockingAccommodationIds(propertyId),
    },
    createdByAdmin: toAdminSummary(request.createdByAdmin),
    reviewedByAdmin: request.reviewedByAdmin
      ? toAdminSummary(request.reviewedByAdmin)
      : null,
    decisionReasonCode: request.decisionReasonCode,
    decisionNote: request.decisionNote,
    requestedAt: requestedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    reviewExpiresAt: reviewExpiresAt.toISOString(),
    reviewExpired:
      request.status === ReservationLifecycleRequestStatus.EXPIRED ||
      (request.status === ReservationLifecycleRequestStatus.PENDING_REVIEW &&
        reviewExpiresAt <= now),
    hold: request.hold
      ? {
          id: request.hold.id,
          status: request.hold.status,
          startDate: dateOnlyFromDate(request.hold.startDate),
          endDate: dateOnlyFromDate(request.hold.endDate),
          preparationDaysBefore: request.hold.preparationDaysBefore,
          preparationDaysAfter: request.hold.preparationDaysAfter,
          expiresAt: request.hold.expiresAt.toISOString(),
          releasedAt: request.hold.releasedAt?.toISOString() ?? null,
          expiredAt: request.hold.expiredAt?.toISOString() ?? null,
          releaseReasonCode: request.hold.releaseReasonCode,
          version: request.hold.version,
        }
      : null,
    adjustmentPayments: request.adjustmentPayments.map((payment) => ({
      id: payment.id,
      purpose: "LIFECYCLE_ADJUSTMENT" as const,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      providerReference: payment.providerReference,
      paidAt: payment.paidAt?.toISOString() ?? null,
      failedAt: payment.failedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
    paymentHandoffPath:
      request.status ===
        ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT &&
      request.hold?.status === LifecycleRequestHoldStatus.ACTIVE &&
      request.hold.expiresAt > now &&
      request.adjustmentPayments[0]
        ? `/reservas/ajuste/${createLifecycleAdjustmentHandoffToken({
            lifecycleRequestId: request.id,
            holdId: request.hold.id,
            paymentId: request.adjustmentPayments[0].id,
            expiresAt: request.hold.expiresAt.toISOString(),
          })}`
        : null,
    version: request.version,
    expectedReservationUpdatedAt:
      request.expectedReservationUpdatedAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function getGuatemalaDateOnlyString(value: Date): DateOnlyString {
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

  return `${values.year}-${values.month}-${values.day}` as DateOnlyString;
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

function countNights(startDate: DateOnlyString, endDate: DateOnlyString): number {
  const nights =
    (dateOnlyToUtcDate(endDate).getTime() -
      dateOnlyToUtcDate(startDate).getTime()) /
    MILLISECONDS_PER_DAY;

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  return nights;
}

function assertReservationEligible(
  reservation: ReservationForDateMutation,
  input: NormalizedCreateInput,
  now: Date,
): void {
  if (reservation.updatedAt.toISOString() !== input.expectedReservationUpdatedAt) {
    throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
  }

  if (
    reservation.status !== ReservationStatus.CONFIRMED ||
    !reservation.confirmedAt ||
    reservation.cancelledAt
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED",
    );
  }

  if (
    reservation.property.status !== PropertyStatus.ACTIVE ||
    reservation.property.deletedAt ||
    !isAdminAccommodationId(reservation.propertyId) ||
    reservation.property.id !== reservation.propertyId ||
    reservation.property.currency !== reservation.currency
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
    );
  }

  const sourcePayment = reservation.payments[0];
  if (!sourcePayment || sourcePayment.currency !== reservation.currency) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND",
    );
  }

  const originalCheckInDate = dateOnlyFromDate(reservation.checkInDate);
  const originalCheckOutDate = dateOnlyFromDate(reservation.checkOutDate);

  if (
    input.requestedCheckInDate === originalCheckInDate &&
    input.requestedCheckOutDate === originalCheckOutDate
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_DATES_UNCHANGED",
    );
  }

  const maximumCheckOutDate = addDaysToDateOnly(
    getGuatemalaDateOnlyString(now),
    DATE_MUTATION_MAX_HORIZON_DAYS,
  );

  if (input.requestedCheckOutDate > maximumCheckOutDate) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_DATE_HORIZON_EXCEEDED",
    );
  }

  if (input.requestType === "DATE_CHANGE") {
    const originalCheckInAt = getArrivalCheckInDateTime(
      reservation.checkInDate,
      reservation.property.checkInTime,
    );
    const requestedCheckInAt = getArrivalCheckInDateTime(
      dateOnlyToUtcDate(input.requestedCheckInDate),
      reservation.property.checkInTime,
    );

    if (!originalCheckInAt || !requestedCheckInAt) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
      );
    }

    if (now >= originalCheckInAt || now >= requestedCheckInAt) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_DATE_CHANGE_AFTER_CHECK_IN",
      );
    }
  } else {
    if (
      input.requestedCheckInDate !== originalCheckInDate ||
      input.requestedCheckOutDate <= originalCheckOutDate
    ) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_EXTENSION_INVALID",
      );
    }

    const checkOutBoundary = toGuatemalaDateTime(
      reservation.checkOutDate,
      reservation.property.checkOutTime,
      true,
    );

    if (!checkOutBoundary || now >= checkOutBoundary) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_STAY_ENDED",
      );
    }
  }
}

function calculateDateMutationQuote(
  reservation: ReservationForDateMutation,
  input: NormalizedCreateInput,
): DateMutationQuote {
  const nightlyPrice = reservation.property.baseNightlyPrice;

  if (input.requestType === "DATE_CHANGE") {
    const requestedNights = countNights(
      input.requestedCheckInDate,
      input.requestedCheckOutDate,
    );
    const requestedSubtotal = nightlyPrice
      .mul(requestedNights)
      .toDecimalPlaces(2);
    const requestedCleaningFee = new Prisma.Decimal(0);
    const requestedTaxes = new Prisma.Decimal(0);
    const requestedDiscounts = new Prisma.Decimal(0);
    const requestedTotal = requestedSubtotal
      .add(requestedCleaningFee)
      .add(requestedTaxes)
      .sub(requestedDiscounts)
      .toDecimalPlaces(2);

    return {
      pricingMode: "FULL_STAY_CURRENT_PRICE",
      requestedSubtotal,
      requestedCleaningFee,
      requestedTaxes,
      requestedDiscounts,
      requestedTotal,
      financialDifference: requestedTotal
        .sub(reservation.total)
        .toDecimalPlaces(2),
    };
  }

  const originalCheckOutDate = dateOnlyFromDate(reservation.checkOutDate);
  const addedNights = countNights(
    originalCheckOutDate,
    input.requestedCheckOutDate,
  );
  const addedNightsSubtotal = nightlyPrice
    .mul(addedNights)
    .toDecimalPlaces(2);

  return {
    pricingMode: "ADDED_NIGHTS_CURRENT_PRICE",
    requestedSubtotal: reservation.subtotal
      .add(addedNightsSubtotal)
      .toDecimalPlaces(2),
    requestedCleaningFee: reservation.cleaningFee,
    requestedTaxes: reservation.taxes,
    requestedDiscounts: reservation.discounts,
    requestedTotal: reservation.total
      .add(addedNightsSubtotal)
      .toDecimalPlaces(2),
    financialDifference: addedNightsSubtotal,
  };
}

function assertIdempotentReplayMatches(
  existing: DateMutationRequestSummaryRecord,
  input: NormalizedCreateInput,
): void {
  const existingCheckInDate = existing.requestedCheckInDate
    ? dateOnlyFromDate(existing.requestedCheckInDate)
    : null;
  const existingCheckOutDate = existing.requestedCheckOutDate
    ? dateOnlyFromDate(existing.requestedCheckOutDate)
    : null;

  if (
    existing.reservationId !== input.reservationId ||
    existing.clientRequestId !== input.requestId ||
    existing.requestType !== input.requestType ||
    existingCheckInDate !== input.requestedCheckInDate ||
    existingCheckOutDate !== input.requestedCheckOutDate ||
    existing.channel !== input.channel ||
    existing.requesterName !== input.requesterName ||
    existing.requesterEmail !== input.requesterEmail ||
    existing.requesterPhone !== input.requesterPhone ||
    existing.requestNote !== input.requestNote
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_IDEMPOTENCY_CONFLICT",
    );
  }
}

async function expireStalePendingDateMutationRequests(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  now: Date,
  adminActor: Readonly<{ id: string; email: string }>,
): Promise<void> {
  const reviewCutoff = new Date(
    now.getTime() -
      DATE_MUTATION_REVIEW_DURATION_HOURS * MILLISECONDS_PER_HOUR,
  );
  const staleRequests = await transaction.reservationLifecycleRequest.findMany({
    where: {
      reservationId,
      requestType: {
        in: [
          ReservationLifecycleRequestType.DATE_CHANGE,
          ReservationLifecycleRequestType.STAY_EXTENSION,
        ],
      },
      status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
      requestedAt: {
        lte: reviewCutoff,
      },
    },
    select: {
      id: true,
      requestType: true,
      version: true,
      requestedAt: true,
    },
  });

  for (const staleRequest of staleRequests) {
    const update = await transaction.reservationLifecycleRequest.updateMany({
      where: {
        id: staleRequest.id,
        status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
        version: staleRequest.version,
      },
      data: {
        status: ReservationLifecycleRequestStatus.EXPIRED,
        expiredAt: now,
        failureCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
        version: {
          increment: 1,
        },
      },
    });

    if (update.count === 1) {
      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "LIFECYCLE_REQUEST_EXPIRED",
          entityType: "ReservationLifecycleRequest",
          entityId: staleRequest.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId,
            lifecycleRequestId: staleRequest.id,
            requestType: staleRequest.requestType,
            requestedAt: staleRequest.requestedAt.toISOString(),
            expiredAt: now.toISOString(),
            reasonCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
          },
        },
      });
    }
  }
}

function isDateMutationSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runDateMutationTransactionWithRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isDateMutationSerializationFailure(error) ||
        attempt >= DATE_MUTATION_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await new Promise<void>((resolve) => {
        setTimeout(
          resolve,
          DATE_MUTATION_TRANSACTION_RETRY_DELAY_MS * attempt,
        );
      });
      attempt += 1;
    }
  }
}

async function createDateMutationRequestTransaction(
  input: NormalizedCreateInput,
  actor: AdminActor,
): Promise<AdminDateMutationRequestSummary> {
  const idempotencyKey = buildDateMutationIdempotencyKey(
    input.reservationId,
    input.requestId,
  );

  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.reservationLifecycleRequest.findFirst({
        where: {
          OR: [
            { idempotencyKey },
            { clientRequestId: input.requestId },
          ],
        },
        select: dateMutationRequestSummarySelect,
      });

      if (existing) {
        assertIdempotentReplayMatches(existing, input);
        return toAdminDateMutationRequestSummary(existing);
      }

      const reservation = await transaction.reservation.findUnique({
        where: { id: input.reservationId },
        select: reservationForDateMutationSelect,
      });

      if (!reservation) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND",
        );
      }

      const now = new Date();
      assertReservationEligible(reservation, input, now);

      const reservationFence = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          status: ReservationStatus.CONFIRMED,
          updatedAt: reservation.updatedAt,
        },
        data: {
          // Obtain a serializable row fence without changing the version snapshot.
          updatedAt: reservation.updatedAt,
        },
      });

      if (reservationFence.count !== 1) {
        throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
      }

      await expireStalePendingDateMutationRequests(
        transaction,
        reservation.id,
        now,
        adminActor,
      );

      const [activeDateMutation, activeCancellation] = await Promise.all([
        transaction.reservationLifecycleRequest.findFirst({
          where: {
            reservationId: reservation.id,
            requestType: {
              in: [
                ReservationLifecycleRequestType.DATE_CHANGE,
                ReservationLifecycleRequestType.STAY_EXTENSION,
              ],
            },
            status: {
              in: [...ACTIVE_DATE_MUTATION_STATUSES],
            },
          },
          select: { id: true },
        }),
        transaction.reservationLifecycleRequest.findFirst({
          where: {
            reservationId: reservation.id,
            requestType: ReservationLifecycleRequestType.CANCELLATION,
            status: {
              in: [...ACTIVE_CANCELLATION_STATUSES],
            },
          },
          select: { id: true },
        }),
      ]);

      if (activeDateMutation) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_REQUEST_ALREADY_ACTIVE",
        );
      }

      if (activeCancellation) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_CANCELLATION_ACTIVE",
        );
      }

      const accommodationId = reservation.propertyId as AccommodationId;
      const availability = await checkAccommodationAvailability(
        {
          accommodationId,
          startDate: input.requestedCheckInDate,
          endDate: input.requestedCheckOutDate,
          excludeReservationId: reservation.id,
        },
        {
          prismaClient: transaction,
          now,
        },
      );

      if (!availability.available) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE",
        );
      }

      const quote = calculateDateMutationQuote(reservation, input);
      const sourcePayment = reservation.payments[0];

      if (!sourcePayment) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND",
        );
      }

      const requestType =
        input.requestType === "DATE_CHANGE"
          ? ReservationLifecycleRequestType.DATE_CHANGE
          : ReservationLifecycleRequestType.STAY_EXTENSION;
      const request = await transaction.reservationLifecycleRequest.create({
        data: {
          reservationId: reservation.id,
          sourcePaymentId: sourcePayment.id,
          requestType,
          status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
          channel: input.channel,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          requesterPhone: input.requesterPhone,
          requestNote: input.requestNote,
          clientRequestId: input.requestId,
          idempotencyKey,
          originalReservationStatus: reservation.status,
          originalCheckInDate: reservation.checkInDate,
          originalCheckOutDate: reservation.checkOutDate,
          originalGuestName: reservation.guestName,
          originalGuestEmail: reservation.guestEmail,
          originalGuestPhone: reservation.guestPhone,
          originalGuestCountry: reservation.guestCountry,
          originalPreferredLocale: reservation.preferredLocale,
          originalGuestCount: reservation.guestCount,
          originalSubtotal: reservation.subtotal,
          originalCleaningFee: reservation.cleaningFee,
          originalTaxes: reservation.taxes,
          originalDiscounts: reservation.discounts,
          originalTotal: reservation.total,
          currency: reservation.currency,
          requestedCheckInDate: dateOnlyToUtcDate(
            input.requestedCheckInDate,
          ),
          requestedCheckOutDate: dateOnlyToUtcDate(
            input.requestedCheckOutDate,
          ),
          requestedGuestCount: reservation.guestCount,
          requestedSubtotal: quote.requestedSubtotal,
          requestedCleaningFee: quote.requestedCleaningFee,
          requestedTaxes: quote.requestedTaxes,
          requestedDiscounts: quote.requestedDiscounts,
          requestedTotal: quote.requestedTotal,
          financialDifference: quote.financialDifference,
          createdByAdminId: adminActor.id,
          expectedReservationUpdatedAt: reservation.updatedAt,
        },
        select: dateMutationRequestSummarySelect,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action:
            requestType === ReservationLifecycleRequestType.DATE_CHANGE
              ? "LIFECYCLE_DATE_CHANGE_REQUESTED"
              : "LIFECYCLE_STAY_EXTENSION_REQUESTED",
          entityType: "ReservationLifecycleRequest",
          entityId: request.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: reservation.id,
            lifecycleRequestId: request.id,
            clientRequestId: input.requestId,
            requestType,
            channel: input.channel,
            sourcePaymentId: sourcePayment.id,
            originalCheckInDate: dateOnlyFromDate(
              reservation.checkInDate,
            ),
            originalCheckOutDate: dateOnlyFromDate(
              reservation.checkOutDate,
            ),
            requestedCheckInDate: input.requestedCheckInDate,
            requestedCheckOutDate: input.requestedCheckOutDate,
            originalTotal: reservation.total.toFixed(2),
            requestedTotal: quote.requestedTotal.toFixed(2),
            financialDifference: quote.financialDifference.toFixed(2),
            currency: reservation.currency,
            pricingMode: quote.pricingMode,
            availabilityValidatedAt: now.toISOString(),
            availabilityAffectedAccommodationIds:
              availability.affectedAccommodationIds,
            availabilityBlockingAccommodationIds:
              availability.blockingAccommodationIds,
            reservationVersion: reservation.updatedAt.toISOString(),
            holdCreated: false,
            adjustmentPaymentCreated: false,
            reservationDatesChanged: false,
          },
        },
      });

      return toAdminDateMutationRequestSummary(request, now);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: DATE_MUTATION_TRANSACTION_MAX_WAIT_MS,
      timeout: DATE_MUTATION_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export async function createAdminDateMutationRequest(
  input: CreateAdminDateMutationRequestInput,
  actor: AdminActor,
): Promise<AdminDateMutationRequestSummary> {
  const normalizedInput = normalizeCreateInput(input);
  const idempotencyKey = buildDateMutationIdempotencyKey(
    normalizedInput.reservationId,
    normalizedInput.requestId,
  );

  try {
    return await runDateMutationTransactionWithRetry(() =>
      createDateMutationRequestTransaction(normalizedInput, actor),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.reservationLifecycleRequest.findFirst({
        where: {
          OR: [
            { idempotencyKey },
            { clientRequestId: normalizedInput.requestId },
          ],
        },
        select: dateMutationRequestSummarySelect,
      });

      if (existing) {
        assertIdempotentReplayMatches(existing, normalizedInput);
        return toAdminDateMutationRequestSummary(existing);
      }

      const activeDateMutation =
        await prisma.reservationLifecycleRequest.findFirst({
          where: {
            reservationId: normalizedInput.reservationId,
            requestType: {
              in: [
                ReservationLifecycleRequestType.DATE_CHANGE,
                ReservationLifecycleRequestType.STAY_EXTENSION,
              ],
            },
            status: {
              in: [...ACTIVE_DATE_MUTATION_STATUSES],
            },
          },
          select: { id: true },
        });

      if (activeDateMutation) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_REQUEST_ALREADY_ACTIVE",
        );
      }

      throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
    }

    throw error;
  }
}

function financialBranch(
  difference: Prisma.Decimal,
): AdminDateMutationDecisionResult["financialBranch"] {
  if (difference.greaterThan(0)) {
    return "POSITIVE";
  }

  if (difference.lessThan(0)) {
    return "NEGATIVE";
  }

  return "ZERO";
}

function isApprovedDecisionState(
  status: ReservationLifecycleRequestStatus,
): boolean {
  return (
    status === ReservationLifecycleRequestStatus.APPROVED ||
    status ===
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT
  );
}

function assertDateMutationDecisionRequest(
  request: DateMutationRequestForDecision,
  input: DecideAdminDateMutationRequestInput,
  now: Date,
): asserts request is DateMutationRequestForDecision & {
  sourcePayment: NonNullable<
    DateMutationRequestForDecision["sourcePayment"]
  >;
} {
  if (
    request.reservationId !== input.reservationId.trim() ||
    (request.requestType !== ReservationLifecycleRequestType.DATE_CHANGE &&
      request.requestType !== ReservationLifecycleRequestType.STAY_EXTENSION)
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  if (
    input.decision === "APPROVE" &&
    isApprovedDecisionState(request.status)
  ) {
    return;
  }

  if (
    input.decision === "REJECT" &&
    request.status === ReservationLifecycleRequestStatus.REJECTED
  ) {
    return;
  }

  if (request.status !== ReservationLifecycleRequestStatus.PENDING_REVIEW) {
    if (
      request.status === ReservationLifecycleRequestStatus.EXPIRED ||
      request.status === ReservationLifecycleRequestStatus.FAILED
    ) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }

    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_DECISION_CONFLICT",
    );
  }

  const reviewExpiresAt = new Date(
    request.requestedAt.getTime() +
      DATE_MUTATION_REVIEW_DURATION_HOURS * MILLISECONDS_PER_HOUR,
  );

  if (reviewExpiresAt <= now) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
    );
  }

  if (
    request.version !== input.expectedRequestVersion ||
    request.expectedReservationUpdatedAt.toISOString() !==
      input.expectedReservationUpdatedAt ||
    request.reservation.updatedAt.toISOString() !==
      input.expectedReservationUpdatedAt
  ) {
    throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
  }

  if (
    request.originalReservationStatus !== ReservationStatus.CONFIRMED ||
    request.reservation.status !== ReservationStatus.CONFIRMED ||
    !request.reservation.confirmedAt ||
    request.reservation.cancelledAt
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED",
    );
  }

  if (
    request.reservation.property.status !== PropertyStatus.ACTIVE ||
    request.reservation.property.deletedAt ||
    request.reservation.property.id !== request.reservation.propertyId ||
    !isAdminAccommodationId(request.reservation.propertyId)
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
    );
  }

  if (
    !request.sourcePayment ||
    request.sourcePayment.reservationId !== request.reservationId ||
    request.sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    !VALIDATED_INITIAL_PAYMENT_STATUSES.some(
      (status) => status === request.sourcePayment!.status,
    ) ||
    request.sourcePayment.currency !== request.currency
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND",
    );
  }

  const requestedCheckInDate = requireRequestedDate(
    request.requestedCheckInDate,
  );
  const requestedCheckOutDate = requireRequestedDate(
    request.requestedCheckOutDate,
  );
  requireRequestedDecimal(request.requestedTotal);
  requireRequestedDecimal(request.financialDifference);

  if (request.requestType === ReservationLifecycleRequestType.DATE_CHANGE) {
    const originalCheckInAt = getArrivalCheckInDateTime(
      request.originalCheckInDate,
      request.reservation.property.checkInTime,
    );
    const requestedCheckInAt = getArrivalCheckInDateTime(
      requestedCheckInDate,
      request.reservation.property.checkInTime,
    );

    if (!originalCheckInAt || !requestedCheckInAt) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
      );
    }

    if (now >= originalCheckInAt || now >= requestedCheckInAt) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }
  } else {
    const checkOutBoundary = toGuatemalaDateTime(
      request.reservation.checkOutDate,
      request.reservation.property.checkOutTime,
      true,
    );

    if (!checkOutBoundary || now >= checkOutBoundary) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }

    if (
      dateOnlyFromDate(requestedCheckInDate) !==
        dateOnlyFromDate(request.originalCheckInDate) ||
      requestedCheckOutDate <= request.originalCheckOutDate
    ) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_EXTENSION_INVALID",
      );
    }
  }
}

async function expirePendingReviewDecisionRequest(
  transaction: Prisma.TransactionClient,
  request: DateMutationRequestForDecision,
  now: Date,
  adminActor: Readonly<{ id: string; email: string }>,
): Promise<boolean> {
  if (request.status !== ReservationLifecycleRequestStatus.PENDING_REVIEW) {
    return false;
  }

  const reviewExpiresAt = new Date(
    request.requestedAt.getTime() +
      DATE_MUTATION_REVIEW_DURATION_HOURS * MILLISECONDS_PER_HOUR,
  );

  if (reviewExpiresAt > now) {
    return false;
  }

  const update = await transaction.reservationLifecycleRequest.updateMany({
    where: {
      id: request.id,
      status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
      version: request.version,
    },
    data: {
      status: ReservationLifecycleRequestStatus.EXPIRED,
      expiredAt: now,
      failureCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
      version: { increment: 1 },
    },
  });

  if (update.count === 1) {
    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "LIFECYCLE_REQUEST_EXPIRED",
        entityType: "ReservationLifecycleRequest",
        entityId: request.id,
        metadata: {
          actorEmail: adminActor.email,
          reservationId: request.reservationId,
          lifecycleRequestId: request.id,
          requestType: request.requestType,
          requestedAt: request.requestedAt.toISOString(),
          expiredAt: now.toISOString(),
          reasonCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
        },
      },
    });
  }

  return update.count === 1;
}

async function readDateMutationSummaryById(
  transaction: Prisma.TransactionClient,
  requestId: string,
  now: Date,
): Promise<AdminDateMutationRequestSummary> {
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: requestId },
    select: dateMutationRequestSummarySelect,
  });

  if (!request) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  return toAdminDateMutationRequestSummary(request, now);
}

async function decideDateMutationRequestTransaction(
  input: DecideAdminDateMutationRequestInput,
  actor: AdminActor,
): Promise<AdminDateMutationDecisionResult | null> {
  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const request = await transaction.reservationLifecycleRequest.findUnique({
        where: { id: input.requestId.trim() },
        select: dateMutationRequestForDecisionSelect,
      });

      if (!request) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
        );
      }

      const now = new Date();
      const expired = await expirePendingReviewDecisionRequest(
        transaction,
        request,
        now,
        adminActor,
      );

      if (expired) {
        return null;
      }

      assertDateMutationDecisionRequest(request, input, now);
      const difference = requireRequestedDecimal(request.financialDifference);
      const branch = financialBranch(difference);

      if (
        input.decision === "APPROVE" &&
        isApprovedDecisionState(request.status)
      ) {
        return {
          request: toAdminDateMutationRequestSummary(request, now),
          decision: input.decision,
          financialBranch: branch,
          holdCreated: Boolean(request.hold),
          paymentCreated: request.adjustmentPayments.length > 0,
          alreadyProcessed: true,
        };
      }

      if (
        input.decision === "REJECT" &&
        request.status === ReservationLifecycleRequestStatus.REJECTED
      ) {
        return {
          request: toAdminDateMutationRequestSummary(request, now),
          decision: input.decision,
          financialBranch: branch,
          holdCreated: false,
          paymentCreated: false,
          alreadyProcessed: true,
        };
      }

      const decisionNote = normalizeRequiredText(input.decisionNote, 2_000);

      if (!decisionNote) {
        throw new AdminReservationDateMutationError(
          "INVALID_ADMIN_DATE_MUTATION_REQUEST",
        );
      }

      if (input.decision === "REJECT") {
        const update = await transaction.reservationLifecycleRequest.updateMany({
          where: {
            id: request.id,
            status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
            version: input.expectedRequestVersion,
          },
          data: {
            status: ReservationLifecycleRequestStatus.REJECTED,
            reviewedByAdminId: adminActor.id,
            reviewedAt: now,
            decidedAt: now,
            decisionReasonCode: "DATE_MUTATION_REJECTED",
            decisionNote,
            version: { increment: 1 },
          },
        });

        if (update.count !== 1) {
          throw new AdminReservationDateMutationError(
            "ADMIN_DATE_MUTATION_STALE",
          );
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "LIFECYCLE_REQUEST_REJECTED",
            entityType: "ReservationLifecycleRequest",
            entityId: request.id,
            metadata: {
              actorEmail: adminActor.email,
              reservationId: request.reservationId,
              lifecycleRequestId: request.id,
              requestType: request.requestType,
              financialDifference: difference.toFixed(2),
              currency: request.currency,
              decisionNote,
              requestVersion: input.expectedRequestVersion,
              reservationDatesChanged: false,
              holdCreated: false,
              adjustmentPaymentCreated: false,
            },
          },
        });

        return {
          request: await readDateMutationSummaryById(
            transaction,
            request.id,
            now,
          ),
          decision: input.decision,
          financialBranch: branch,
          holdCreated: false,
          paymentCreated: false,
          alreadyProcessed: false,
        };
      }

      const accommodationId = request.reservation.propertyId as AccommodationId;
      const requestedCheckInDate = dateOnlyFromDate(
        requireRequestedDate(request.requestedCheckInDate),
      );
      const requestedCheckOutDate = dateOnlyFromDate(
        requireRequestedDate(request.requestedCheckOutDate),
      );
      const availability = await checkAccommodationAvailability(
        {
          accommodationId,
          startDate: requestedCheckInDate,
          endDate: requestedCheckOutDate,
          excludeReservationId: request.reservationId,
        },
        { prismaClient: transaction, now },
      );

      if (!availability.available) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE",
        );
      }

      if (request.adjustmentPayments.length > 0 || request.hold) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_CONFLICT",
        );
      }

      if (branch === "NEGATIVE") {
        const committedRefunds = await transaction.refund.aggregate({
          where: {
            paymentId: request.sourcePayment.id,
            status: {
              in: [
                RefundStatus.PENDING,
                RefundStatus.PROCESSING,
                RefundStatus.APPROVED,
                RefundStatus.MANUAL,
              ],
            },
          },
          _sum: { amount: true },
        });
        const committedAmount =
          committedRefunds._sum.amount ?? new Prisma.Decimal(0);
        const remainingCapturedBalance = request.sourcePayment.amount
          .sub(committedAmount)
          .toDecimalPlaces(2);

        if (remainingCapturedBalance.lessThan(difference.abs())) {
          throw new AdminReservationDateMutationError(
            "ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT",
          );
        }
      }

      const nextStatus =
        branch === "POSITIVE"
          ? ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT
          : ReservationLifecycleRequestStatus.APPROVED;
      const update = await transaction.reservationLifecycleRequest.updateMany({
        where: {
          id: request.id,
          status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
          version: input.expectedRequestVersion,
        },
        data: {
          status: nextStatus,
          reviewedByAdminId: adminActor.id,
          reviewedAt: now,
          decidedAt: now,
          decisionReasonCode:
            branch === "POSITIVE"
              ? "DATE_MUTATION_APPROVED_REQUIRES_PAYMENT"
              : branch === "ZERO"
                ? "DATE_MUTATION_APPROVED_ZERO_DIFFERENCE"
                : "DATE_MUTATION_APPROVED_NEGATIVE_DIFFERENCE",
          decisionNote,
          version: { increment: 1 },
        },
      });

      if (update.count !== 1) {
        throw new AdminReservationDateMutationError(
          "ADMIN_DATE_MUTATION_STALE",
        );
      }

      let holdId: string | null = null;
      let holdExpiresAt: Date | null = null;
      let paymentId: string | null = null;

      if (branch === "POSITIVE") {
        holdExpiresAt = buildLifecycleAdjustmentHoldExpiresAt(now);
        const hold = await transaction.lifecycleRequestHold.create({
          data: {
            lifecycleRequestId: request.id,
            propertyId: request.reservation.propertyId,
            startDate: requireRequestedDate(request.requestedCheckInDate),
            endDate: requireRequestedDate(request.requestedCheckOutDate),
            preparationDaysBefore:
              request.reservation.property.preparationDaysBefore,
            preparationDaysAfter:
              request.reservation.property.preparationDaysAfter,
            status: LifecycleRequestHoldStatus.ACTIVE,
            expiresAt: holdExpiresAt,
          },
          select: { id: true },
        });
        holdId = hold.id;

        const payment = await transaction.payment.create({
          data: {
            reservationId: request.reservationId,
            lifecycleRequestId: request.id,
            provider: PaymentProvider.TILOPAY,
            purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
            status: PaymentStatus.PENDING,
            amount: difference,
            currency: request.currency,
          },
          select: { id: true },
        });
        paymentId = payment.id;

        await transaction.adminAuditLog.createMany({
          data: [
            {
              userId: adminActor.id,
              action: "LIFECYCLE_ADJUSTMENT_HOLD_CREATED",
              entityType: "LifecycleRequestHold",
              entityId: hold.id,
              metadata: {
                actorEmail: adminActor.email,
                reservationId: request.reservationId,
                lifecycleRequestId: request.id,
                requestType: request.requestType,
                startDate: requestedCheckInDate,
                endDate: requestedCheckOutDate,
                preparationDaysBefore:
                  request.reservation.property.preparationDaysBefore,
                preparationDaysAfter:
                  request.reservation.property.preparationDaysAfter,
                expiresAt: holdExpiresAt.toISOString(),
                durationMinutes:
                  LIFECYCLE_ADJUSTMENT_HOLD_DURATION_MINUTES,
                publicPendingReservationHoldChanged: false,
              },
            },
            {
              userId: adminActor.id,
              action: "LIFECYCLE_ADJUSTMENT_PAYMENT_CREATED",
              entityType: "Payment",
              entityId: payment.id,
              metadata: {
                actorEmail: adminActor.email,
                reservationId: request.reservationId,
                lifecycleRequestId: request.id,
                requestType: request.requestType,
                purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
                amount: difference.toFixed(2),
                currency: request.currency,
                holdId: hold.id,
                holdExpiresAt: holdExpiresAt.toISOString(),
                providerCalled: false,
              },
            },
          ],
        });
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "LIFECYCLE_REQUEST_APPROVED",
          entityType: "ReservationLifecycleRequest",
          entityId: request.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: request.reservationId,
            lifecycleRequestId: request.id,
            requestType: request.requestType,
            previousStatus: ReservationLifecycleRequestStatus.PENDING_REVIEW,
            status: nextStatus,
            originalCheckInDate: dateOnlyFromDate(
              request.originalCheckInDate,
            ),
            originalCheckOutDate: dateOnlyFromDate(
              request.originalCheckOutDate,
            ),
            requestedCheckInDate,
            requestedCheckOutDate,
            originalTotal: request.originalTotal.toFixed(2),
            requestedTotal: requireRequestedDecimal(
              request.requestedTotal,
            ).toFixed(2),
            financialDifference: difference.toFixed(2),
            financialBranch: branch,
            currency: request.currency,
            holdId,
            holdExpiresAt: holdExpiresAt?.toISOString() ?? null,
            paymentId,
            requestVersion: input.expectedRequestVersion,
            reservationVersion:
              request.reservation.updatedAt.toISOString(),
            reservationDatesChanged: false,
            reservationPricingChanged: false,
          },
        },
      });

      return {
        request: await readDateMutationSummaryById(
          transaction,
          request.id,
          now,
        ),
        decision: input.decision,
        financialBranch: branch,
        holdCreated: branch === "POSITIVE",
        paymentCreated: branch === "POSITIVE",
        alreadyProcessed: false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: DATE_MUTATION_TRANSACTION_MAX_WAIT_MS,
      timeout: DATE_MUTATION_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export async function decideAdminDateMutationRequest(
  input: DecideAdminDateMutationRequestInput,
  actor: AdminActor,
): Promise<AdminDateMutationDecisionResult> {
  try {
    const result = await runDateMutationTransactionWithRetry(() =>
      decideDateMutationRequestTransaction(input, actor),
    );

    if (!result) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.reservationLifecycleRequest.findUnique({
        where: { id: input.requestId.trim() },
        select: dateMutationRequestSummarySelect,
      });

      if (existing) {
        const difference = requireRequestedDecimal(
          existing.financialDifference,
        );

        if (
          input.decision === "APPROVE" &&
          isApprovedDecisionState(existing.status)
        ) {
          return {
            request: toAdminDateMutationRequestSummary(existing),
            decision: input.decision,
            financialBranch: financialBranch(difference),
            holdCreated: Boolean(existing.hold),
            paymentCreated: existing.adjustmentPayments.length > 0,
            alreadyProcessed: true,
          };
        }

        if (
          input.decision === "REJECT" &&
          existing.status === ReservationLifecycleRequestStatus.REJECTED
        ) {
          return {
            request: toAdminDateMutationRequestSummary(existing),
            decision: input.decision,
            financialBranch: financialBranch(difference),
            holdCreated: false,
            paymentCreated: false,
            alreadyProcessed: true,
          };
        }
      }

      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_STALE",
      );
    }

    throw error;
  }
}

function maxDateOnly(
  left: DateOnlyString,
  right: DateOnlyString,
): DateOnlyString {
  return left >= right ? left : right;
}

function minDateOnly(
  left: DateOnlyString,
  right: DateOnlyString,
): DateOnlyString {
  return left <= right ? left : right;
}

function blockingRecordsToDateOnlyStrings(
  records: readonly AvailabilityBlockingRecord[],
  startDate: DateOnlyString,
  endDate: DateOnlyString,
): readonly DateOnlyString[] {
  const blockedDates = new Set<DateOnlyString>();

  for (const record of records) {
    let cursor = maxDateOnly(record.startDate, startDate);
    const recordEndDate = minDateOnly(record.endDate, endDate);

    while (cursor < recordEndDate) {
      blockedDates.add(cursor);
      cursor = addDaysToDateOnly(cursor, 1);
    }
  }

  return Array.from(blockedDates).sort();
}

export async function getAdminDateMutationBlockedDates(input: Readonly<{
  reservationId: string;
  startDate: string;
  endDate: string;
}>): Promise<BlockedDatesApiResponse> {
  const reservationId = input.reservationId.trim();
  const startDate = normalizeDateOnly(input.startDate);
  const endDate = normalizeDateOnly(input.endDate);

  if (!reservationId || reservationId.length > 120) {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  try {
    assertValidAvailabilityDateRange({ startDate, endDate });
  } catch {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  if (
    endDate >
    addDaysToDateOnly(startDate, DATE_MUTATION_CALENDAR_MAX_RANGE_DAYS)
  ) {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      propertyId: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      property: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND",
    );
  }

  if (
    reservation.status !== ReservationStatus.CONFIRMED ||
    !reservation.confirmedAt ||
    reservation.cancelledAt
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED",
    );
  }

  if (
    reservation.property.status !== PropertyStatus.ACTIVE ||
    reservation.property.deletedAt ||
    reservation.property.id !== reservation.propertyId ||
    !isAdminAccommodationId(reservation.propertyId)
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
    );
  }

  const accommodationId = reservation.propertyId as AccommodationId;
  const blockingRecords = await getAvailabilityBlockingRecords({
    accommodationId,
    startDate,
    endDate,
    excludeReservationId: reservation.id,
  });

  return {
    accommodationId,
    startDate,
    endDate,
    blockedDates: [
      ...blockingRecordsToDateOnlyStrings(
        blockingRecords,
        startDate,
        endDate,
      ),
    ],
  };
}

export async function getAdminDateMutationRequestsForReservation(
  reservationId: string,
): Promise<readonly AdminDateMutationRequestSummary[]> {
  const id = reservationId.trim();

  if (!id || id.length > 120) {
    return [];
  }

  const now = new Date();
  const awaitingRequests = await prisma.reservationLifecycleRequest.findMany({
    where: {
      reservationId: id,
      requestType: {
        in: [
          ReservationLifecycleRequestType.DATE_CHANGE,
          ReservationLifecycleRequestType.STAY_EXTENSION,
        ],
      },
      status:
        ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT,
    },
    select: { id: true },
  });

  for (const request of awaitingRequests) {
    await expireLifecycleAdjustmentRequestIfNeeded(request.id, now);
  }

  const requests = await prisma.reservationLifecycleRequest.findMany({
    where: {
      reservationId: id,
      requestType: {
        in: [
          ReservationLifecycleRequestType.DATE_CHANGE,
          ReservationLifecycleRequestType.STAY_EXTENSION,
        ],
      },
    },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    select: dateMutationRequestSummarySelect,
  });

  return requests.map((request) =>
    toAdminDateMutationRequestSummary(request, now),
  );
}
