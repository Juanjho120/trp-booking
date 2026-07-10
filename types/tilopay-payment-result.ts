import type { ReservationConfirmationStatus } from "@/types/reservation-confirmation";

export type TilopayPaymentResultStatus = "APPROVED" | "REJECTED" | "FAILED";

export type TilopayPaymentResultErrorCode =
  | "INVALID_TILOPAY_REDIRECT_REQUEST"
  | "TILOPAY_PAYMENT_NOT_FOUND"
  | "TILOPAY_ORDER_HASH_INVALID"
  | "TILOPAY_CONSULT_UNAVAILABLE"
  | "TILOPAY_CONSULT_MISMATCH"
  | "TILOPAY_PAYMENT_RESULT_UNEXPECTED_ERROR"
  | "RESERVATION_CONFIRMATION_FAILED";

export type TilopayRedirectTarget = "success" | "cancel" | "error";

export type TilopayRedirectParams = Readonly<{
  responseCode: string | null;
  description: string | null;
  auth: string | null;
  orderNumber: string | null;
  transactionId: string | null;
  orderHash: string | null;
  returnData: string | null;
  amount: string | null;
  currency: string | null;
  email: string | null;
  formUpdate: string | null;
}>;

export type TilopayReturnData = Readonly<{
  paymentId?: string;
  reservationId?: string;
  orderNumber?: string;
  locale?: "es" | "en";
}>;

export type ProcessedTilopayPaymentResult = Readonly<{
  paymentId: string;
  reservationId: string;
  providerReference: string;
  providerTransactionId: string | null;
  paymentStatus: TilopayPaymentResultStatus;
  reservationStatus: ReservationConfirmationStatus;
  reservationConfirmed: boolean;
  redirectTarget: TilopayRedirectTarget;
  phaseBoundary:
    | "PAYMENT_VALIDATED_RESERVATION_CONFIRMED"
    | "PAYMENT_VALIDATED_RESERVATION_NOT_CONFIRMED";
}>;
