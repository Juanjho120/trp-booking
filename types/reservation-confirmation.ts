export type ReservationConfirmationErrorCode =
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_NOT_APPROVED"
  | "RESERVATION_NOT_CONFIRMABLE"
  | "RESERVATION_CONFIRMATION_UNEXPECTED_ERROR";

export type ReservationConfirmationStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "EXPIRED"
  | "BLOCKED";

export type ConfirmedReservationAfterPayment = Readonly<{
  paymentId: string;
  reservationId: string;
  reservationStatus: ReservationConfirmationStatus;
  confirmedAt: string;
  alreadyConfirmed: boolean;
  phaseBoundary: "RESERVATION_CONFIRMED_AFTER_VALIDATED_PAYMENT";
}>;
