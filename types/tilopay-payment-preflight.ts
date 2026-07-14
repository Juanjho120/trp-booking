import type { PaymentAttemptErrorCode } from "@/types/payment-attempt";

export type TilopayPaymentPreflightErrorCode = PaymentAttemptErrorCode;

export type TilopayPaymentPreflight = Readonly<{
  paymentId: string;
  reservationId: string;
  status: "READY_FOR_PAYMENT";
  expiresAt: string;
  phaseBoundary: "TILOPAY_PREFLIGHT_READY";
}>;

export type TilopayPaymentPreflightApiSuccessResponse = Readonly<{
  tilopayPaymentPreflight: TilopayPaymentPreflight;
}>;

export type TilopayPaymentPreflightApiErrorResponse = Readonly<{
  error: Readonly<{
    code: TilopayPaymentPreflightErrorCode;
    message: string;
  }>;
}>;

export type TilopayPaymentPreflightApiResponse =
  | TilopayPaymentPreflightApiSuccessResponse
  | TilopayPaymentPreflightApiErrorResponse;
