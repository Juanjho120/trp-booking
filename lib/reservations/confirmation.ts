import {
  PaymentPurpose,
  PaymentStatus,
  ReservationStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  createReservationConfirmationNotificationIntents,
  deliverReservationConfirmationNotificationsBestEffort,
} from "@/lib/email/reservation-confirmation-notifications";
import { ensureArrivalInstructionsNotificationIntent } from "@/lib/email/arrival-instructions";
import {
  completePaidDateMutation,
  ReservationDateMutationCompletionError,
} from "@/lib/reservations/date-mutation-completion";
import {
  compensateApprovedLifecycleAdjustmentPayment,
  isCompensatableDateMutationCompletionError,
} from "@/lib/reservations/lifecycle-adjustment-refunds";
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

function assertReservationCanBeConfirmed(input: Readonly<{
  paymentId: string;
  reservationId: string;
  status: ReservationStatus;
  expiresAt: Date | null;
  now: Date;
}>): void {
  if (input.status !== ReservationStatus.PENDING_PAYMENT) {
    throw new ReservationConfirmationError("RESERVATION_NOT_CONFIRMABLE", {
      paymentId: input.paymentId,
      reservationId: input.reservationId,
    });
  }

  if (!input.expiresAt || input.expiresAt <= input.now) {
    throw new ReservationConfirmationError(
      "RESERVATION_EXPIRED_BEFORE_CONFIRMATION",
      {
        paymentId: input.paymentId,
        reservationId: input.reservationId,
      },
    );
  }
}

type ConfirmedReservationForNotifications = Readonly<{
  id: string;
  guestEmail: string;
  preferredLocale: string;
}>;

type ConfirmationTransactionResult = Readonly<{
  confirmation: ConfirmedReservationAfterPayment;
  notificationIds: readonly string[];
}>;

async function createNotificationIntents(
  tx: Prisma.TransactionClient,
  reservation: ConfirmedReservationForNotifications,
  now: Date,
): Promise<readonly string[]> {
  const intents = await createReservationConfirmationNotificationIntents(tx, {
    id: reservation.id,
    guestEmail: reservation.guestEmail,
    preferredLocale: reservation.preferredLocale,
  });
  const notificationIds = intents.map((intent) => intent.id);
  const arrivalIntent = await ensureArrivalInstructionsNotificationIntent(
    tx,
    reservation.id,
    { now },
  );

  if (arrivalIntent.notificationId) {
    notificationIds.push(arrivalIntent.notificationId);
  }

  return notificationIds;
}

export async function confirmReservationAfterApprovedPayment(
  paymentId: string,
): Promise<ConfirmedReservationAfterPayment> {
  const paymentBoundary = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      purpose: true,
      status: true,
      reservationId: true,
    },
  });

  if (!paymentBoundary) {
    throw new ReservationConfirmationError("PAYMENT_NOT_FOUND", {
      paymentId,
    });
  }

  if (paymentBoundary.status !== PaymentStatus.APPROVED) {
    throw new ReservationConfirmationError("PAYMENT_NOT_APPROVED", {
      paymentId: paymentBoundary.id,
      reservationId: paymentBoundary.reservationId,
    });
  }

  if (paymentBoundary.purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT) {
    try {
      const completion = await completePaidDateMutation(paymentBoundary.id);

      return {
        paymentId: paymentBoundary.id,
        reservationId: completion.reservationId,
        reservationStatus: "CONFIRMED",
        confirmedAt: completion.confirmedAt,
        alreadyConfirmed: true,
        phaseBoundary:
          "LIFECYCLE_DATE_MUTATION_COMPLETED_AFTER_APPROVED_PAYMENT",
      };
    } catch (error) {
      if (error instanceof ReservationDateMutationCompletionError) {
        if (isCompensatableDateMutationCompletionError(error.code)) {
          try {
            await compensateApprovedLifecycleAdjustmentPayment(
              paymentBoundary.id,
              error.code,
            );
          } catch {
            // The provider-approved payment remains auditable. A later admin
            // recovery can retry compensation without duplicating a Refund.
          }
        }

        throw new ReservationConfirmationError(
          "RESERVATION_CONFIRMATION_UNEXPECTED_ERROR",
          {
            paymentId: paymentBoundary.id,
            reservationId: paymentBoundary.reservationId,
          },
        );
      }

      throw error;
    }
  }

  const transactionResult: ConfirmationTransactionResult =
    await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<ConfirmationTransactionResult> => {
      const now = new Date();
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          purpose: true,
          lifecycleRequestId: true,
          status: true,
          paidAt: true,
          reservation: {
            select: {
              id: true,
              status: true,
              confirmedAt: true,
              expiresAt: true,
              guestEmail: true,
              preferredLocale: true,
            },
          },
          lifecycleRequest: {
            select: {
              id: true,
              reservationId: true,
              status: true,
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

      if (payment.purpose !== PaymentPurpose.INITIAL_RESERVATION) {
        throw new ReservationConfirmationError(
          "RESERVATION_CONFIRMATION_UNEXPECTED_ERROR",
          {
            paymentId: payment.id,
            reservationId: payment.reservation.id,
          },
        );
      }

      if (
        payment.reservation.status === ReservationStatus.CONFIRMED &&
        payment.reservation.confirmedAt
      ) {
        const notificationIds = await createNotificationIntents(
          tx,
          {
            id: payment.reservation.id,
            guestEmail: payment.reservation.guestEmail,
            preferredLocale: payment.reservation.preferredLocale,
          },
          now,
        );

        return {
          confirmation: {
            paymentId: payment.id,
            reservationId: payment.reservation.id,
            reservationStatus: "CONFIRMED",
            confirmedAt: payment.reservation.confirmedAt.toISOString(),
            alreadyConfirmed: true,
            phaseBoundary: "RESERVATION_CONFIRMED_AFTER_VALIDATED_PAYMENT",
          },
          notificationIds,
        };
      }

      assertReservationCanBeConfirmed({
        paymentId: payment.id,
        reservationId: payment.reservation.id,
        status: payment.reservation.status,
        expiresAt: payment.reservation.expiresAt,
        now,
      });

      const confirmedAt = payment.paidAt ?? now;
      const reservation = await tx.reservation.update({
        where: { id: payment.reservation.id },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt,
          expiresAt: null,
        },
        select: {
          id: true,
          status: true,
          confirmedAt: true,
          guestEmail: true,
          preferredLocale: true,
        },
      });

      if (!reservation.confirmedAt) {
        throw new ReservationConfirmationError(
          "RESERVATION_CONFIRMATION_UNEXPECTED_ERROR",
          {
            paymentId: payment.id,
            reservationId: reservation.id,
          },
        );
      }

      const notificationIds = await createNotificationIntents(
        tx,
        {
          id: reservation.id,
          guestEmail: reservation.guestEmail,
          preferredLocale: reservation.preferredLocale,
        },
        now,
      );

      return {
        confirmation: {
          paymentId: payment.id,
          reservationId: reservation.id,
          reservationStatus: reservation.status,
          confirmedAt: reservation.confirmedAt.toISOString(),
          alreadyConfirmed: false,
          phaseBoundary: "RESERVATION_CONFIRMED_AFTER_VALIDATED_PAYMENT",
        },
        notificationIds,
      };
    });

  if (transactionResult.notificationIds.length > 0) {
    try {
      await deliverReservationConfirmationNotificationsBestEffort(
        transactionResult.notificationIds,
      );
    } catch {
      // Reservation confirmation is committed and must remain successful.
    }
  }

  return transactionResult.confirmation;
}
