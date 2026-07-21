import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";

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
      createdAt: true,
      property: {
        select: {
          id: true,
          nameEs: true,
          nameEn: true,
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
    },
  });

  if (!reservation) {
    return null;
  }

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
    createdAt: reservation.createdAt.toISOString(),
    payments: reservation.payments.map((payment) => ({
      id: payment.id,
      providerReference: payment.providerReference,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}
