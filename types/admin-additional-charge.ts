import type {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
} from "@/types/additional-charge";

export type AdminAdditionalChargeErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_ADDITIONAL_CHARGE_ORIGIN_INVALID"
  | "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST"
  | "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_FOUND"
  | "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_ELIGIBLE"
  | "ADMIN_ADDITIONAL_CHARGE_NOT_FOUND"
  | "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE"
  | "ADMIN_ADDITIONAL_CHARGE_ACTIVE_REQUEST"
  | "ADMIN_ADDITIONAL_CHARGE_STALE"
  | "ADMIN_GUEST_PAYMENT_REQUEST_CHARGES_REQUIRED"
  | "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE"
  | "ADMIN_GUEST_PAYMENT_REQUEST_ACTIVE_CONFLICT"
  | "ADMIN_GUEST_PAYMENT_REQUEST_IDEMPOTENCY_CONFLICT"
  | "ADMIN_GUEST_PAYMENT_REQUEST_NOT_FOUND"
  | "ADMIN_GUEST_PAYMENT_REQUEST_NOT_CANCELLABLE"
  | "ADMIN_GUEST_PAYMENT_REQUEST_STALE"
  | "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR";

export type AdminAdditionalChargeActorSummary = Readonly<{
  name: string | null;
  email: string;
}>;

export type AdminAdditionalChargeSummary = Readonly<{
  id: string;
  reservationId: string;
  category: AdditionalChargeCategory;
  description: string;
  internalNote: string | null;
  amount: string;
  currency: "USD";
  status: AdditionalChargeStatus;
  createdByAdmin: AdminAdditionalChargeActorSummary;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  everRequested: boolean;
  activePaymentRequestId: string | null;
  canEdit: boolean;
  canCancel: boolean;
  canRequest: boolean;
}>;

export type AdminGuestPaymentRequestItemSummary = Readonly<{
  id: string;
  additionalChargeId: string;
  category: AdditionalChargeCategory;
  description: string;
  amount: string;
  currency: "USD";
  createdAt: string;
}>;

export type AdminGuestPaymentRequestSummary = Readonly<{
  id: string;
  reservationId: string;
  status: GuestPaymentRequestStatus;
  totalAmount: string;
  currency: "USD";
  expiresAt: string;
  createdByAdmin: AdminAdditionalChargeActorSummary;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: readonly AdminGuestPaymentRequestItemSummary[];
  canCancel: boolean;
}>;

export type AdminAdditionalChargeManagement = Readonly<{
  reservationId: string;
  reservationStatus: string;
  reservationConfirmedAt: string | null;
  currency: "USD";
  canCreateCharge: boolean;
  charges: readonly AdminAdditionalChargeSummary[];
  paymentRequests: readonly AdminGuestPaymentRequestSummary[];
}>;

export type CreateAdminAdditionalChargeInput = Readonly<{
  reservationId: string;
  category: AdditionalChargeCategory;
  description: string;
  internalNote?: string | null;
  amount: string;
}>;

export type UpdateAdminAdditionalChargeInput = Readonly<{
  chargeId: string;
  category: AdditionalChargeCategory;
  description: string;
  internalNote?: string | null;
  amount: string;
  expectedUpdatedAt: string;
}>;

export type CancelAdminAdditionalChargeInput = Readonly<{
  chargeId: string;
  expectedUpdatedAt: string;
}>;

export type CreateAdminGuestPaymentRequestChargeInput = Readonly<{
  chargeId: string;
  expectedUpdatedAt: string;
}>;

export type CreateAdminGuestPaymentRequestInput = Readonly<{
  reservationId: string;
  clientRequestId: string;
  charges: readonly CreateAdminGuestPaymentRequestChargeInput[];
}>;

export type CancelAdminGuestPaymentRequestInput = Readonly<{
  requestId: string;
  expectedUpdatedAt: string;
}>;
