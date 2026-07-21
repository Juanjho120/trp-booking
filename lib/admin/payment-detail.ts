import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AdminPaymentDetailData } from "@/types/admin-payment-detail";

import { extractAdminPaymentDiagnostics } from "./payment-diagnostics";

export async function getAdminPaymentDetail(
  paymentId: string,
): Promise<AdminPaymentDetailData | null> {
  const id = paymentId.trim();

  if (!id || id.length > 120) {
    return null;
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      providerReference: true,
      providerTransactionId: true,
      status: true,
      amount: true,
      currency: true,
      rawPayload: true,
      createdAt: true,
      reservation: {
        select: {
          id: true,
          guestName: true,
          guestEmail: true,
          checkInDate: true,
          checkOutDate: true,
          guestCount: true,
          status: true,
          total: true,
          currency: true,
          property: {
            select: {
              id: true,
              nameEs: true,
              nameEn: true,
            },
          },
        },
      },
      clientEvents: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          eventType: true,
          environment: true,
          sdkMessage: true,
          createdAt: true,
        },
      },
    },
  });

  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    providerReference: payment.providerReference,
    providerTransactionId: payment.providerTransactionId,
    status: payment.status,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    createdAt: payment.createdAt.toISOString(),
    diagnostics: extractAdminPaymentDiagnostics(payment.rawPayload),
    reservation: {
      id: payment.reservation.id,
      property: payment.reservation.property,
      guestName: payment.reservation.guestName,
      guestEmail: payment.reservation.guestEmail,
      checkInDate: dateOnlyFromDate(payment.reservation.checkInDate),
      checkOutDate: dateOnlyFromDate(payment.reservation.checkOutDate),
      guestCount: payment.reservation.guestCount,
      status: payment.reservation.status,
      total: payment.reservation.total.toFixed(2),
      currency: payment.reservation.currency,
    },
    clientEvents: payment.clientEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      environment: event.environment,
      sdkMessage: event.sdkMessage,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
