import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";

import { getAdminCancellationRequestsForReservation } from "./reservation-cancellation";

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
          providerReference: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
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

  if (!reservation) {
    return null;
  }

  const cancellationRequests =
    await getAdminCancellationRequestsForReservation(reservation.id);

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
    payments: reservation.payments.map((payment) => ({
      id: payment.id,
      providerReference: payment.providerReference,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      createdAt: payment.createdAt.toISOString(),
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
  };
}
