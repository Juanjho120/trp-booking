import type {
  CancellationPolicyReasonCode,
  ReservationLifecycleRequestChannel,
  ReservationLifecycleRequestStatus,
} from "@prisma/client";

export const adminCancellationChannels = [
  "EMAIL",
  "PHONE",
  "WHATSAPP",
  "OTHER",
] as const satisfies readonly ReservationLifecycleRequestChannel[];

export type AdminCancellationChannel = (typeof adminCancellationChannels)[number];

export const adminCancellationDecisions = ["APPROVE", "REJECT"] as const;

export type AdminCancellationDecision =
  (typeof adminCancellationDecisions)[number];

export type AdminReservationCancellationErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_CANCELLATION_REQUEST"
  | "ADMIN_CANCELLATION_RESERVATION_NOT_FOUND"
  | "ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED"
  | "ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND"
  | "ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE"
  | "ADMIN_CANCELLATION_REQUEST_NOT_FOUND"
  | "ADMIN_CANCELLATION_REQUEST_NOT_PENDING"
  | "ADMIN_CANCELLATION_STALE"
  | "ADMIN_CANCELLATION_UNEXPECTED_ERROR";

export type AdminCancellationPolicySnapshot = Readonly<{
  version: "DIRECT_BOOKING_2026_07_23";
  timezone: "America/Guatemala";
  calculatedAt: string;
  checkInAt: string;
  hoursBeforeCheckIn: string;
  reasonCode: CancellationPolicyReasonCode;
  refundPercentage: number;
  refundAmount: string;
  currency: string;
}>;

export type AdminCancellationRequestAdmin = Readonly<{
  name: string | null;
  email: string;
}>;

export type AdminCancellationRequestSummary = Readonly<{
  id: string;
  reservationId: string;
  sourcePaymentId: string | null;
  status: ReservationLifecycleRequestStatus;
  channel: AdminCancellationChannel;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestNote: string | null;
  policy: AdminCancellationPolicySnapshot;
  createdByAdmin: AdminCancellationRequestAdmin;
  reviewedByAdmin: AdminCancellationRequestAdmin | null;
  decisionReasonCode: string | null;
  decisionNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  version: number;
  expectedReservationUpdatedAt: string;
  updatedAt: string;
}>;

export type CreateAdminCancellationRequestInput = Readonly<{
  reservationId: string;
  channel: AdminCancellationChannel;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestNote: string;
  expectedReservationUpdatedAt: string;
  requestId: string;
}>;

export type DecideAdminCancellationRequestInput = Readonly<{
  requestId: string;
  reservationId: string;
  decision: AdminCancellationDecision;
  decisionNote: string;
  expectedRequestVersion: number;
  expectedReservationUpdatedAt: string;
}>;

export type AdminCancellationDecisionResult = Readonly<{
  request: AdminCancellationRequestSummary;
  decision: AdminCancellationDecision;
  reservationStatus: string;
  cancelledAt: string | null;
  skippedArrivalNotifications: number;
  alreadyProcessed: boolean;
}>;
