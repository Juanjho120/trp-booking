import type { AdminPaymentSubmissionAttemptHistory } from "@/types/admin-payment-submission-attempt";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";

export type AdminReservationDetailShell = Pick<
  AdminReservationDetailData,
  "id" | "status"
>;

export type AdminReservationOverviewTab = Pick<
  AdminReservationDetailData,
  | "id"
  | "property"
  | "guestName"
  | "guestEmail"
  | "guestPhone"
  | "guestCountry"
  | "arrivalTimeEstimate"
  | "checkInDate"
  | "checkOutDate"
  | "guestCount"
  | "status"
  | "expiresAt"
  | "createdAt"
  | "pricingBreakdown"
>;

export type AdminReservationFinancialTab = Pick<
  AdminReservationDetailData,
  | "id"
  | "status"
  | "subtotal"
  | "cleaningFee"
  | "taxes"
  | "discounts"
  | "total"
  | "currency"
  | "payments"
  | "refunds"
  | "financialSummary"
>;

export type AdminReservationEmailsTab = Pick<
  AdminReservationDetailData,
  "id" | "status" | "guestEmail" | "emailNotifications"
>;

export type AdminReservationLifecycleTab = Pick<
  AdminReservationDetailData,
  | "id"
  | "guestName"
  | "guestEmail"
  | "guestPhone"
  | "status"
  | "updatedAt"
  | "cancellationRequests"
>;

export type AdminReservationRefundsTab = Pick<
  AdminReservationDetailData,
  | "id"
  | "status"
  | "updatedAt"
  | "currency"
  | "total"
  | "payments"
  | "refunds"
  | "cancellationRequests"
  | "dateMutationRequests"
  | "financialSummary"
  | "refundApiExecutionEnabled"
>;

export type AdminReservationChangesTab = Pick<
  AdminReservationDetailData,
  | "id"
  | "guestName"
  | "guestEmail"
  | "guestPhone"
  | "checkInDate"
  | "checkOutDate"
  | "status"
  | "updatedAt"
  | "cancellationRequests"
  | "dateMutationRequests"
>;

export type AdminReservationHistoryTab = Pick<
  AdminReservationDetailData,
  "operationalHistory"
>;

export type AdminReservationPaymentAttemptsTab =
  AdminPaymentSubmissionAttemptHistory;

export type AdminReservationDetailServerTab =
  | "reservation"
  | "financial"
  | "payment-attempts"
  | "emails"
  | "lifecycle"
  | "refunds"
  | "changes"
  | "history";

export type AdminReservationDetailTabPayload =
  | Readonly<{
      tab: "reservation";
      data: AdminReservationOverviewTab;
    }>
  | Readonly<{
      tab: "financial";
      data: AdminReservationFinancialTab;
    }>
  | Readonly<{
      tab: "payment-attempts";
      data: AdminReservationPaymentAttemptsTab;
    }>
  | Readonly<{
      tab: "emails";
      data: AdminReservationEmailsTab;
    }>
  | Readonly<{
      tab: "lifecycle";
      data: AdminReservationLifecycleTab;
    }>
  | Readonly<{
      tab: "refunds";
      data: AdminReservationRefundsTab;
    }>
  | Readonly<{
      tab: "changes";
      data: AdminReservationChangesTab;
    }>
  | Readonly<{
      tab: "history";
      data: AdminReservationHistoryTab;
    }>;
