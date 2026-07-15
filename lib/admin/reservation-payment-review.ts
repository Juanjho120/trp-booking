import { prisma } from "@/lib/db/prisma";
import type {
  AdminPaymentClientEventSummary,
  AdminPaymentSummary,
  AdminReservationPaymentReview,
  AdminReservationSummary,
  AdminSafePaymentDiagnostics,
  AdminStatusCount,
} from "@/types/admin-reservation-payment-review";

const RECENT_ITEM_LIMIT = 10;
const MAX_DIAGNOSTIC_LENGTH = 180;

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIsoString(value: Date): string {
  return value.toISOString();
}

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDecimalString(value: { toFixed: (digits?: number) => string }): string {
  return value.toFixed(2);
}

function normalizeStatusCounts(
  values: readonly Readonly<{ status: string; _count: Readonly<{ _all: number }> }>[] ,
): readonly AdminStatusCount[] {
  return values
    .map((value) => ({
      status: value.status,
      count: value._count._all,
    }))
    .sort((left, right) => left.status.localeCompare(right.status));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadRoot(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const response = value.response;

  if (Array.isArray(response) && isRecord(response[0])) {
    return response[0];
  }

  return value;
}

function readStringFromRecord(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, MAX_DIAGNOSTIC_LENGTH);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).slice(0, MAX_DIAGNOSTIC_LENGTH);
    }
  }

  return null;
}

function extractSafePaymentDiagnostics(payload: unknown): AdminSafePaymentDiagnostics {
  const root = getPayloadRoot(payload);

  return {
    providerCode: readStringFromRecord(root, ["code", "responseCode", "response_code"]),
    providerMessage: readStringFromRecord(root, ["description", "message", "responseMessage"]),
    authorization: readStringFromRecord(root, ["auth", "authorization", "authorizationCode"]),
    providerOrder: readStringFromRecord(root, ["order", "orderNumber", "external_order_id", "externalOrderId"]),
    tilopayTransaction: readStringFromRecord(root, [
      "tilopay-transaction",
      "tilopayTransaction",
      "tpt",
      "orderId",
    ]),
    orderHashStatus: readStringFromRecord(root, [
      "orderHashStatus",
      "order_hash_status",
      "hashStatus",
      "phaseBoundary",
    ]),
  };
}

export async function getAdminReservationPaymentReview(): Promise<AdminReservationPaymentReview> {
  const [
    totalReservations,
    reservationStatusCounts,
    totalPayments,
    paymentStatusCounts,
    totalClientEvents,
    reservations,
    payments,
    clientEvents,
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.payment.count(),
    prisma.payment.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.paymentClientEvent.count(),
    prisma.reservation.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ITEM_LIMIT,
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        guestCountry: true,
        checkInDate: true,
        checkOutDate: true,
        guestCount: true,
        status: true,
        subtotal: true,
        total: true,
        currency: true,
        expiresAt: true,
        confirmedAt: true,
        createdAt: true,
        property: {
          select: {
            nameEs: true,
            slug: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            status: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ITEM_LIMIT,
      select: {
        id: true,
        provider: true,
        providerReference: true,
        providerTransactionId: true,
        status: true,
        amount: true,
        currency: true,
        paidAt: true,
        failedAt: true,
        rawPayload: true,
        createdAt: true,
        updatedAt: true,
        reservation: {
          select: {
            id: true,
            guestName: true,
            property: {
              select: {
                nameEs: true,
              },
            },
          },
        },
      },
    }),
    prisma.paymentClientEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ITEM_LIMIT,
      select: {
        id: true,
        paymentId: true,
        reservationId: true,
        eventType: true,
        environment: true,
        locale: true,
        paymentMethodName: true,
        paymentMethodType: true,
        detectedCardBrand: true,
        sdkMessage: true,
        preflightStatus: true,
        preflightExpiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalReservations,
      reservationStatuses: normalizeStatusCounts(reservationStatusCounts),
      totalPayments,
      paymentStatuses: normalizeStatusCounts(paymentStatusCounts),
      totalClientEvents,
    },
    reservations: reservations.map<AdminReservationSummary>((reservation) => ({
      id: reservation.id,
      propertyName: reservation.property.nameEs,
      propertySlug: reservation.property.slug,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      guestPhone: reservation.guestPhone,
      guestCountry: reservation.guestCountry,
      checkInDate: toDateOnlyString(reservation.checkInDate),
      checkOutDate: toDateOnlyString(reservation.checkOutDate),
      guestCount: reservation.guestCount,
      status: reservation.status,
      subtotal: toDecimalString(reservation.subtotal),
      total: toDecimalString(reservation.total),
      currency: reservation.currency,
      expiresAt: toIsoString(reservation.expiresAt),
      confirmedAt: toIsoString(reservation.confirmedAt),
      createdAt: toRequiredIsoString(reservation.createdAt),
      latestPaymentStatus: reservation.payments[0]?.status ?? null,
    })),
    payments: payments.map<AdminPaymentSummary>((payment) => ({
      id: payment.id,
      reservationId: payment.reservation.id,
      propertyName: payment.reservation.property.nameEs,
      guestName: payment.reservation.guestName,
      provider: payment.provider,
      providerReference: payment.providerReference,
      providerTransactionId: payment.providerTransactionId,
      status: payment.status,
      amount: toDecimalString(payment.amount),
      currency: payment.currency,
      paidAt: toIsoString(payment.paidAt),
      failedAt: toIsoString(payment.failedAt),
      createdAt: toRequiredIsoString(payment.createdAt),
      updatedAt: toRequiredIsoString(payment.updatedAt),
      diagnostics: extractSafePaymentDiagnostics(payment.rawPayload),
    })),
    clientEvents: clientEvents.map<AdminPaymentClientEventSummary>((event) => ({
      id: event.id,
      paymentId: event.paymentId,
      reservationId: event.reservationId,
      eventType: event.eventType,
      environment: event.environment,
      locale: event.locale,
      paymentMethodName: event.paymentMethodName,
      paymentMethodType: event.paymentMethodType,
      detectedCardBrand: event.detectedCardBrand,
      sdkMessage: event.sdkMessage,
      preflightStatus: event.preflightStatus,
      preflightExpiresAt: toIsoString(event.preflightExpiresAt),
      createdAt: toRequiredIsoString(event.createdAt),
    })),
  };
}
