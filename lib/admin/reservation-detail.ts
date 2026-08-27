import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import { getTilopayEnv } from "@/lib/env/server";
import {
  getReservationFinancialSummary,
  ReservationFinancialSummaryError,
  type ReservationFinancialSummary,
} from "@/lib/reservations/financial-summary";
import type {
  AdminReservationDetailData,
  AdminReservationFinancialSummary,
  AdminReservationPricingBreakdown
} from "@/types/admin-reservation-detail";

import { getAdminReservationOperationalHistory } from "./reservation-operational-history";
import { getAdminCancellationRequestsForReservation } from "./reservation-cancellation";
import { getAdminDateMutationRequestsForReservation } from "./reservation-date-mutation";
import { getAdminRefundsForReservation } from "./refunds";
import { parseFinalCPricingSnapshot } from "@/lib/pricing";

const PROVIDER_MESSAGE_ID_MAX_LENGTH = 180;
const ERROR_CODE_MAX_LENGTH = 120;
const ERROR_MESSAGE_MAX_LENGTH = 240;
const ADMIN_NAME_MAX_LENGTH = 160;
const ADMIN_EMAIL_MAX_LENGTH = 160;

function normalizeRequiredText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeOptionalText(
  value: string | null,
  maximumLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maximumLength);
}

function toAdminFinancialSummary(
  summary: ReservationFinancialSummary,
): AdminReservationFinancialSummary {
  return {
    currency: summary.currency,
    originalStayAmount: summary.originalStayAmount.toFixed(2),
    approvedCompletedPositiveStayAdjustments:
      summary.approvedCompletedPositiveStayAdjustments.toFixed(2),
    currentStayValue: summary.currentStayValue.toFixed(2),
    capturedStayPayments: summary.capturedStayPayments.toFixed(2),
    committedStayRefunds: summary.committedStayRefunds.toFixed(2),
    approvedStayRefunds: summary.approvedStayRefunds.toFixed(2),
    remainingRefundableStayBalance:
      summary.remainingRefundableStayBalance.toFixed(2),
    eligibleStayPayments: summary.eligibleStayPayments.map((payment) => ({
      paymentId: payment.paymentId,
      purpose: payment.purpose,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      providerReference: payment.providerReference,
      committedRefundAmount: payment.committedRefundAmount.toFixed(2),
      approvedRefundAmount: payment.approvedRefundAmount.toFixed(2),
      remainingRefundableAmount: payment.remainingRefundableAmount.toFixed(2),
    })),
  };
}

async function getAdminFinancialSummary(
  reservationId: string,
): Promise<AdminReservationFinancialSummary | null> {
  try {
    return toAdminFinancialSummary(
      await getReservationFinancialSummary(reservationId),
    );
  } catch (error) {
    if (
      error instanceof ReservationFinancialSummaryError &&
      error.code ===
        "RESERVATION_FINANCIAL_SUMMARY_INITIAL_PAYMENT_NOT_FOUND"
    ) {
      return null;
    }

    throw error;
  }
}

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

async function getAdminReservationPricingBreakdown(
  pricingSnapshotValue: unknown,
  propertyId: string | undefined,
): Promise<AdminReservationPricingBreakdown | null> {
  const snapshot = parseFinalCPricingSnapshot(pricingSnapshotValue);

  if (!snapshot) {
    return null;
  }

  const seasonalRuleIds = Array.from(
    new Set(
      snapshot.segments.flatMap((segment) =>
        segment.kind === "RESOLVED_RATE" &&
        segment.source === "SEASONAL"
          ? [segment.ruleId]
          : [],
      ),
    ),
  );

  const seasonalRules =
    seasonalRuleIds.length > 0
      ? await prisma.seasonalPricingRule.findMany({
          where: {
            id: {
              in: seasonalRuleIds,
            },
            propertyId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const seasonalRuleNames = new Map(
    seasonalRules.map((rule) => [rule.id, rule.name]),
  );

  return {
    currency: snapshot.currency,
    subtotal: centsToAmount(snapshot.subtotalCents),
    segments: snapshot.segments.map((segment) => {
      if (segment.kind === "PRESERVED_LEGACY_STAY") {
        return {
          kind: segment.kind,
          startDate: segment.startDate,
          endDate: segment.endDate,
          nights: segment.nights,
          source: null,
          seasonalRuleName: null,
          minimumNights: null,
          nightlyRate: null,
          subtotal: centsToAmount(segment.acceptedSubtotalCents),
        };
      }

      return {
        kind: segment.kind,
        startDate: segment.startDate,
        endDate: segment.endDate,
        nights: segment.nights,
        source: segment.source,
        seasonalRuleName:
          segment.source === "SEASONAL"
            ? seasonalRuleNames.get(segment.ruleId) ?? null
            : null,
        minimumNights:
          segment.source === "LENGTH_OF_STAY"
            ? segment.minimumNights
            : null,
        nightlyRate: centsToAmount(segment.nightlyRateCents),
        subtotal: centsToAmount(segment.subtotalCents),
      };
    }),
  };
}

export async function getAdminReservationDetail(
  reservationId: string,
): Promise<AdminReservationDetailData | null> {
  const id = reservationId.trim();

  if (!id || id.length > 120) {
    return null;
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      guestCountry: true,
      arrivalTimeEstimate: true,
      checkInDate: true,
      checkOutDate: true,
      guestCount: true,
      status: true,
      subtotal: true,
      cleaningFee: true,
      taxes: true,
      discounts: true,
      total: true,
      pricingSnapshot: true,
      currency: true,
      expiresAt: true,
      confirmedAt: true,
      cancelledAt: true,
      createdAt: true,
      updatedAt: true,
      property: {
        select: {
          id: true,
          nameEs: true,
          nameEn: true,
          checkInTime: true,
        },
      },
      payments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          purpose: true,
          providerReference: true,
          providerTransactionId: true,
          status: true,
          amount: true,
          currency: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      emailNotifications: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          type: true,
          recipient: true,
          locale: true,
          origin: true,
          parentNotificationId: true,
          manualResends: {
            take: 1,
            select: { id: true },
          },
          requestedAt: true,
          requestedByAdmin: {
            select: {
              name: true,
              email: true,
            },
          },
          status: true,
          attemptCount: true,
          lastAttemptAt: true,
          nextAttemptAt: true,
          scheduledFor: true,
          sentAt: true,
          providerMessageId: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const pricingBreakdown = await getAdminReservationPricingBreakdown(
    reservation?.pricingSnapshot,
    reservation?.property.id
  );

  if (!reservation) {
    return null;
  }

  const [
    cancellationRequests,
    dateMutationRequests,
    refunds,
    operationalHistory,
    financialSummary,
  ] = await Promise.all([
    getAdminCancellationRequestsForReservation(reservation.id),
    getAdminDateMutationRequestsForReservation(reservation.id),
    getAdminRefundsForReservation(reservation.id),
    getAdminReservationOperationalHistory(reservation.id),
    getAdminFinancialSummary(reservation.id),
  ]);
  const refundApiExecutionEnabled =
    getTilopayEnv().TILOPAY_ENVIRONMENT === "sandbox";

  return {
    id: reservation.id,
    property: reservation.property,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    guestCountry: reservation.guestCountry,
    arrivalTimeEstimate: reservation.arrivalTimeEstimate,
    checkInDate: dateOnlyFromDate(reservation.checkInDate),
    checkOutDate: dateOnlyFromDate(reservation.checkOutDate),
    guestCount: reservation.guestCount,
    status: reservation.status,
    subtotal: reservation.subtotal.toFixed(2),
    cleaningFee: reservation.cleaningFee.toFixed(2),
    taxes: reservation.taxes.toFixed(2),
    discounts: reservation.discounts.toFixed(2),
    total: reservation.total.toFixed(2),
    currency: reservation.currency,
    expiresAt: reservation.expiresAt?.toISOString() ?? null,
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    pricingBreakdown,
    payments: reservation.payments.map((payment) => ({
      id: payment.id,
      purpose: payment.purpose,
      providerReference: payment.providerReference,
      providerTransactionId: payment.providerTransactionId,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
    emailNotifications: reservation.emailNotifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      recipient: notification.recipient,
      locale: notification.locale,
      origin: notification.origin,
      parentNotificationId: notification.parentNotificationId,
      hasManualResends: notification.manualResends.length > 0,
      requestedAt: notification.requestedAt?.toISOString() ?? null,
      requestedByAdmin: notification.requestedByAdmin
        ? {
            name: normalizeOptionalText(
              notification.requestedByAdmin.name,
              ADMIN_NAME_MAX_LENGTH,
            ),
            email: normalizeRequiredText(
              notification.requestedByAdmin.email,
              ADMIN_EMAIL_MAX_LENGTH,
            ),
          }
        : null,
      status: notification.status,
      attemptCount: notification.attemptCount,
      lastAttemptAt: notification.lastAttemptAt?.toISOString() ?? null,
      nextAttemptAt: notification.nextAttemptAt?.toISOString() ?? null,
      scheduledFor: notification.scheduledFor?.toISOString() ?? null,
      sentAt: notification.sentAt?.toISOString() ?? null,
      providerMessageId: normalizeOptionalText(
        notification.providerMessageId,
        PROVIDER_MESSAGE_ID_MAX_LENGTH,
      ),
      errorCode: normalizeOptionalText(
        notification.errorCode,
        ERROR_CODE_MAX_LENGTH,
      ),
      errorMessage: normalizeOptionalText(
        notification.errorMessage,
        ERROR_MESSAGE_MAX_LENGTH,
      ),
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    })),
    cancellationRequests,
    dateMutationRequests,
    refunds,
    financialSummary,
    operationalHistory,
    refundApiExecutionEnabled,
  };
}
