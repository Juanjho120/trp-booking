import { PaymentStatus, ReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  ConfirmedReservationAfterPayment,
  ReservationConfirmationErrorCode,
} from "@/types/reservation-confirmation";

export class ReservationConfirmationError extends Error {
  readonly code: ReservationConfirmationErrorCode;
  readonly paymentId?: string;
  readonly reservationId?: string;

  constructor(
    code: ReservationConfirmationErrorCode,
    options: Readonly<{
      paymentId?: string;
      reservationId?: string;
    }> = {},
  ) {
    super(code);
    this.name = "ReservationConfirmationError";
    this.code = code;
    this.paymentId = options.paymentId;
    this.reservationId = options.reservationId;
  }
}

function canConfirmReservation(status: ReservationStatus): boolean {
  return status === ReservationStatus.PENDING_PAYMENT || status === ReservationStatus.EXPIRED;
}

export async function confirmReservationAfterApprovedPayment(
  paymentId: string,
): Promise<ConfirmedReservationAfterPayment> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: {
        id: true,
        status: true,
        paidAt: true,
        reservation: {
          select: {
            id: true,
            status: true,
            confirmedAt: true,
          },
        },
      },
    });

    if (!payment) {
      throw new ReservationConfirmationError("PAYMENT_NOT_FOUND", {
        paymentId,
      });
    }

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new ReservationConfirmationError("PAYMENT_NOT_APPROVED", {
        paymentId: payment.id,
        reservationId: payment.reservation.id,
      });
    }

    if (payment.reservation.status === ReservationStatus.CONFIRMED && payment.reservation.confirmedAt) {
      return {
        paymentId: payment.id,
        reservationId: payment.reservation.id,
        reservationStatus: "CONFIRMED",
        confirmedAt: payment.reservation.confirmedAt.toISOString(),
        alreadyConfirmed: true,
        phaseBoundary: "RESERVATION_CONFIRMED_AFTER_VALIDATED_PAYMENT",
      };
    }

    if (!canConfirmReservation(payment.reservation.status)) {
      throw new ReservationConfirmationError("RESERVATION_NOT_CONFIRMABLE", {
        paymentId: payment.id,
        reservationId: payment.reservation.id,
      });
    }

    const confirmedAt = payment.paidAt ?? new Date();
    const reservation = await tx.reservation.update({
      where: {
        id: payment.reservation.id,
      },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt,
        expiresAt: null,
      },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
      },
    });

    if (!reservation.confirmedAt) {
      throw new ReservationConfirmationError("RESERVATION_CONFIRMATION_UNEXPECTED_ERROR", {
        paymentId: payment.id,
        reservationId: reservation.id,
      });
    }

    return {
      paymentId: payment.id,
      reservationId: reservation.id,
      reservationStatus: reservation.status,
      confirmedAt: reservation.confirmedAt.toISOString(),
      alreadyConfirmed: false,
      phaseBoundary: "RESERVATION_CONFIRMED_AFTER_VALIDATED_PAYMENT",
    };
  });
}
