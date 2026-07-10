import type { PaymentAttemptErrorCode, PaymentAttemptStatus } from "@/types/payment-attempt";
import type { ReservationQuote, ReservationQuoteAmount } from "@/types/reservation-quote";

export type TilopaySdkSessionErrorCode =
  | PaymentAttemptErrorCode
  | "TILOPAY_SDK_TOKEN_UNAVAILABLE"
  | "TILOPAY_SDK_SESSION_UNEXPECTED_ERROR";

export type TilopaySdkPaymentMethod = Readonly<{
  id: string;
  name: string;
  type: string;
}>;

export type TilopaySdkCardOption = Readonly<{
  id: string;
  name: string;
  brand: string;
}>;

export type CreateTilopaySdkSessionInput = Readonly<{
  reservationId: string;
  locale: "es" | "en";
}>;

export type TilopaySdkInitConfig = Readonly<{
  token: string;
  currency: ReservationQuote["currency"];
  language: "es" | "en";
  amount: string;
  billToFirstName: string;
  billToLastName: string;
  billToAddress: string;
  billToAddress2: string;
  billToCity: string;
  billToState: string;
  billToZipPostCode: string;
  billToCountry: string;
  billToTelephone: string;
  billToEmail: string;
  orderNumber: string;
  capture: 1;
  redirect: string;
  subscription: 0;
  hashVersion: "V2";
  returnData: string;
}>;

export type TilopaySdkSession = Readonly<{
  paymentId: string;
  reservationId: string;
  provider: "TILOPAY";
  providerReference: string;
  paymentStatus: PaymentAttemptStatus;
  amount: ReservationQuoteAmount;
  currency: ReservationQuote["currency"];
  expiresAt: string;
  existingPaymentAttempt: boolean;
  environment: "sandbox" | "production";
  sdkScriptUrl: string;
  initConfig: TilopaySdkInitConfig;
  phaseBoundary: "TILOPAY_SDK_V2_CHECKOUT_FOUNDATION";
}>;

export type CreateTilopaySdkSessionApiSuccessResponse = Readonly<{
  tilopaySdkSession: TilopaySdkSession;
}>;

export type CreateTilopaySdkSessionApiErrorResponse = Readonly<{
  error: Readonly<{
    code: TilopaySdkSessionErrorCode;
    message: string;
  }>;
}>;

export type CreateTilopaySdkSessionApiResponse =
  | CreateTilopaySdkSessionApiSuccessResponse
  | CreateTilopaySdkSessionApiErrorResponse;
