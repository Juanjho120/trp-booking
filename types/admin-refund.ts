export const adminRefundProcessingModes = [
  "TILOPAY_API",
  "TILOPAY_PORTAL_FALLBACK",
] as const;

export type AdminRefundProcessingMode =
  (typeof adminRefundProcessingModes)[number];

export const adminRefundReconciliationOutcomes = [
  "APPROVED",
  "FAILED",
] as const;

export type AdminRefundReconciliationOutcome =
  (typeof adminRefundReconciliationOutcomes)[number];

export const adminRefundReconciliationSources = [
  "TILOPAY_CONSULT",
  "TILOPAY_PORTAL",
] as const;

export type AdminRefundReconciliationSource =
  (typeof adminRefundReconciliationSources)[number];

export type AdminRefundErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_REFUND_REQUEST"
  | "ADMIN_REFUND_LIFECYCLE_REQUEST_NOT_FOUND"
  | "ADMIN_REFUND_NOT_FOUND"
  | "ADMIN_REFUND_REQUEST_NOT_COMPLETED"
  | "ADMIN_REFUND_RESERVATION_NOT_CANCELLED"
  | "ADMIN_REFUND_PAYMENT_NOT_FOUND"
  | "ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE"
  | "ADMIN_REFUND_POLICY_NOT_ELIGIBLE"
  | "ADMIN_REFUND_AMOUNT_EXCEEDS_POLICY"
  | "ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT"
  | "ADMIN_REFUND_STALE"
  | "ADMIN_REFUND_NOT_PENDING"
  | "ADMIN_REFUND_NOT_PROCESSING"
  | "ADMIN_REFUND_API_EXECUTION_NOT_ALLOWED"
  | "ADMIN_REFUND_API_SANDBOX_ONLY"
  | "ADMIN_REFUND_RECONCILIATION_CONFLICT"
  | "ADMIN_REFUND_PROVIDER_UNAVAILABLE"
  | "ADMIN_REFUND_UNEXPECTED_ERROR";

export type AdminRefundAdminSummary = Readonly<{
  name: string | null;
  email: string;
}>;

export type AdminRefundDiagnostics = Readonly<{
  source: string;
  observedAt: string | null;
  httpStatus: number | null;
  responseCode: string | null;
  description: string | null;
  providerReference: string | null;
  orderNumber: string | null;
  amount: string | null;
  currency: string | null;
  resultClassification: string | null;
  responseShape: Readonly<Record<string, unknown>> | null;
}>;

export type AdminRefundSummary = Readonly<{
  id: string;
  paymentId: string;
  lifecycleRequestId: string | null;
  requestedByAdmin: AdminRefundAdminSummary | null;
  clientRequestId: string | null;
  amount: string;
  currency: string;
  reason: string | null;
  status: string;
  processingMode: AdminRefundProcessingMode | string;
  providerRefundId: string | null;
  processingStartedAt: string | null;
  approvedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  diagnostics: AdminRefundDiagnostics | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminRefundAuthorizationResult = Readonly<{
  refund: AdminRefundSummary;
  alreadyProcessed: boolean;
}>;

export type AdminRefundExecutionResult = Readonly<{
  refund: AdminRefundSummary;
  providerRequestSent: boolean;
  requiresReconciliation: boolean;
  alreadyProcessed: boolean;
}>;

export type AdminRefundConsultResult = Readonly<{
  refund: AdminRefundSummary;
  requiresReconciliation: boolean;
}>;

export type AdminRefundReconciliationResult = Readonly<{
  refund: AdminRefundSummary;
  paymentStatus: string;
  cumulativeApprovedAmount: string;
  alreadyProcessed: boolean;
}>;

export type CreateAdminRefundInput = Readonly<{
  lifecycleRequestId: string;
  amount: string;
  reason: string;
  processingMode: AdminRefundProcessingMode;
  requestId: string;
  expectedRequestVersion: number;
  expectedRequestUpdatedAt: string;
  expectedPaymentUpdatedAt: string;
}>;

export type ExecuteAdminRefundInput = Readonly<{
  refundId: string;
  requestId: string;
  expectedRefundUpdatedAt: string;
  expectedPaymentUpdatedAt: string;
}>;

export type ConsultAdminRefundInput = Readonly<{
  refundId: string;
  requestId: string;
  expectedRefundUpdatedAt: string;
}>;

export type ReconcileAdminRefundInput = Readonly<{
  refundId: string;
  outcome: AdminRefundReconciliationOutcome;
  source: AdminRefundReconciliationSource;
  finalProcessingMode: AdminRefundProcessingMode;
  providerRefundId: string | null;
  note: string;
  requestId: string;
  expectedRefundUpdatedAt: string;
  expectedPaymentUpdatedAt: string;
}>;
