export type TilopaySdkClientEventType =
  | "TILOPAY_SDK_START_PAYMENT_FAILED"
  | "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS";

export type TilopaySdkClientEventRequest = Readonly<{
  paymentId: string;
  reservationId: string;
  eventType: TilopaySdkClientEventType;
  environment?: "sandbox" | "production" | null;
  locale?: "es" | "en" | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
  paymentMethodType?: string | null;
  detectedCardBrand?: string | null;
  sdkMessage?: string | null;
  sdkPayload?: unknown;
  preflightStatus?: string | null;
  preflightExpiresAt?: string | null;
}>;
