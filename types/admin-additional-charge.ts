import type {
  EmailNotificationOrigin,
  EmailNotificationStatus,
} from "@prisma/client";
import type {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
} from "@/types/additional-charge";
import type {
  AdminRefundDiagnostics,
  AdminRefundProcessingMode,
} from "@/types/admin-refund";

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
  | "ADMIN_GUEST_PAYMENT_REQUEST_NOT_PAYABLE"
  | "ADMIN_GUEST_PAYMENT_REQUEST_LINK_UNAVAILABLE"
  | "ADMIN_GUEST_PAYMENT_REQUEST_STALE"
  | "ADMIN_ADDITIONAL_CHARGE_REFUND_NOT_ELIGIBLE"
  | "ADMIN_ADDITIONAL_CHARGE_REFUND_ALLOCATION_INVALID"
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
  paidPaymentRequestId: string | null;
  paymentId: string | null;
  paymentUpdatedAt: string | null;
  providerReference: string | null;
  capturedAmount: string;
  committedRefundAmount: string;
  refundedAmount: string;
  remainingRefundableAmount: string;
  canRefund: boolean;
  refundAllocations: readonly AdminAdditionalChargeRefundAllocationSummary[];
  canEdit: boolean;
  canCancel: boolean;
  canRequest: boolean;
}>;

export type AdminAdditionalChargeRefundAllocationSummary = Readonly<{
  id: string;
  refundId: string;
  paymentId: string;
  allocatedAmount: string;
  refundAmount: string;
  currency: "USD";
  authorizationType: string;
  status: string;
  processingMode: AdminRefundProcessingMode | string;
  providerRefundId: string | null;
  reason: string | null;
  clientRequestId: string | null;
  refundOperationKey: string | null;
  processingStartedAt: string | null;
  approvedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  diagnostics: AdminRefundDiagnostics | null;
  requestedByAdmin: AdminAdditionalChargeActorSummary | null;
  createdAt: string;
  updatedAt: string;
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

export type AdminGuestPaymentRequestEmailNotificationSummary = Readonly<{
  id: string;
  type: "ADDITIONAL_CHARGE_PAYMENT_REQUIRED";
  recipient: string;
  locale: "es" | "en";
  origin: EmailNotificationOrigin;
  parentNotificationId: string | null;
  hasManualResends: boolean;
  requestedAt: string | null;
  requestedByAdmin: AdminAdditionalChargeActorSummary | null;
  status: EmailNotificationStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  canResend: boolean;
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
  emailNotifications: readonly AdminGuestPaymentRequestEmailNotificationSummary[];
  canCancel: boolean;
  canCopyLink: boolean;
}>;

export type AdminAdditionalChargeManagement = Readonly<{
  reservationId: string;
  reservationStatus: string;
  reservationConfirmedAt: string | null;
  currency: "USD";
  canCreateCharge: boolean;
  refundApiExecutionEnabled: boolean;
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

export type CreateAdminAdditionalChargeRefundAllocationInput = Readonly<{
  additionalChargeId: string;
  amount: string;
  expectedChargeUpdatedAt: string;
}>;

export type CreateAdminAdditionalChargeRefundInput = Readonly<{
  reservationId: string;
  paymentId: string;
  amount: string;
  reason: string;
  processingMode: AdminRefundProcessingMode;
  requestId: string;
  expectedPaymentUpdatedAt: string;
  allocations: readonly CreateAdminAdditionalChargeRefundAllocationInput[];
}>;
