export const TRP_ADDITIONAL_CHARGE_CURRENCY = "USD" as const;
export const GUEST_PAYMENT_REQUEST_EXPIRY_HOURS = 168 as const;

export const ADDITIONAL_CHARGE_CATEGORIES = [
  "CLEANING",
  "DAMAGE",
  "TRANSPORT",
  "LATE_CHECKOUT",
  "EXTRA_SERVICE",
  "OTHER",
] as const;

export const ADDITIONAL_CHARGE_STATUSES = [
  "PENDING",
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "CANCELLED",
] as const;

export const GUEST_PAYMENT_REQUEST_STATUSES = [
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
] as const;

export type AdditionalChargeCategory =
  (typeof ADDITIONAL_CHARGE_CATEGORIES)[number];
export type AdditionalChargeStatus =
  (typeof ADDITIONAL_CHARGE_STATUSES)[number];
export type GuestPaymentRequestStatus =
  (typeof GUEST_PAYMENT_REQUEST_STATUSES)[number];

export type GuestPaymentRequestItemSnapshot = Readonly<{
  additionalChargeId: string;
  category: AdditionalChargeCategory;
  description: string;
  amountCents: number;
  currency: typeof TRP_ADDITIONAL_CHARGE_CURRENCY;
}>;

export type GuestPaymentRequestSnapshot = Readonly<{
  reservationId: string;
  totalAmountCents: number;
  currency: typeof TRP_ADDITIONAL_CHARGE_CURRENCY;
  expiresAt: string;
  items: readonly GuestPaymentRequestItemSnapshot[];
}>;
