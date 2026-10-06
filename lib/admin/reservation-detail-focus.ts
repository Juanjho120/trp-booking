import type { AdminNotificationType } from "@prisma/client";

export type AdminReservationDetailFocusKind =
  | "refund"
  | "additionalChargePaymentRequest"
  | "lifecycleAdjustment";

export type AdminReservationDetailTab =
  | "reservation"
  | "financial"
  | "emails"
  | "lifecycle"
  | "additionalCharges"
  | "refunds"
  | "changes"
  | "history";

export type AdminReservationDetailFocus = Readonly<{
  kind: AdminReservationDetailFocusKind;
  focusId: string;
}>;

const ADMIN_RESERVATION_DETAIL_FOCUS_ID_MAX_LENGTH = 160;
const ADMIN_RESERVATION_DETAIL_FOCUS_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const ADMIN_RESERVATION_ID_MAX_LENGTH = 128;

const notificationFocusPrefixes = {
  ADDITIONAL_CHARGE_PAID: "admin-notification/additional-charge-paid/",
  LIFECYCLE_ADJUSTMENT_PAID: "admin-notification/lifecycle-adjustment-paid/",
  REFUND_PROCESSED: "admin-notification/refund-processed/",
} as const;

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeReservationPathId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed && trimmed.length <= ADMIN_RESERVATION_ID_MAX_LENGTH
    ? trimmed
    : null;
}

export function normalizeAdminReservationDetailFocusId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > ADMIN_RESERVATION_DETAIL_FOCUS_ID_MAX_LENGTH ||
    !ADMIN_RESERVATION_DETAIL_FOCUS_ID_PATTERN.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

export function normalizeAdminReservationDetailFocusKind(
  value: unknown,
): AdminReservationDetailFocusKind | null {
  if (
    value === "refund" ||
    value === "additionalChargePaymentRequest" ||
    value === "lifecycleAdjustment"
  ) {
    return value;
  }

  return null;
}

export function parseAdminReservationDetailFocusQuery(
  input: Readonly<{
    focus?: unknown;
    focusId?: unknown;
  }>,
): AdminReservationDetailFocus | null {
  const kind = normalizeAdminReservationDetailFocusKind(
    firstQueryValue(input.focus),
  );
  const focusId = normalizeAdminReservationDetailFocusId(
    firstQueryValue(input.focusId),
  );

  return kind && focusId ? { kind, focusId } : null;
}

export function buildAdminReservationFocusedTargetPath(
  input: Readonly<{
    reservationId: string;
    focus: AdminReservationDetailFocus | null;
  }>,
): string | null {
  const reservationId = normalizeReservationPathId(input.reservationId);

  if (!reservationId) {
    return null;
  }

  const basePath = `/admin/reservations/${encodeURIComponent(reservationId)}`;

  if (!input.focus) {
    return basePath;
  }

  const focusId = normalizeAdminReservationDetailFocusId(input.focus.focusId);
  const kind = normalizeAdminReservationDetailFocusKind(input.focus.kind);

  if (!kind || !focusId) {
    return basePath;
  }

  const params = new URLSearchParams({
    focus: kind,
    focusId,
  });

  return `${basePath}?${params.toString()}`;
}

export function resolveAdminNotificationReservationFocus(
  input: Readonly<{
    type: AdminNotificationType | string;
    deduplicationKey: string | null;
  }>,
): AdminReservationDetailFocus | null {
  const deduplicationKey = input.deduplicationKey?.trim() ?? "";

  if (input.type === "ADDITIONAL_CHARGE_PAID") {
    const focusId = deduplicationKey.slice(
      notificationFocusPrefixes.ADDITIONAL_CHARGE_PAID.length,
    );

    return deduplicationKey.startsWith(
      notificationFocusPrefixes.ADDITIONAL_CHARGE_PAID,
    ) && normalizeAdminReservationDetailFocusId(focusId)
      ? {
          kind: "additionalChargePaymentRequest",
          focusId,
        }
      : null;
  }

  if (input.type === "LIFECYCLE_ADJUSTMENT_PAID") {
    const focusId = deduplicationKey.slice(
      notificationFocusPrefixes.LIFECYCLE_ADJUSTMENT_PAID.length,
    );

    return deduplicationKey.startsWith(
      notificationFocusPrefixes.LIFECYCLE_ADJUSTMENT_PAID,
    ) && normalizeAdminReservationDetailFocusId(focusId)
      ? {
          kind: "lifecycleAdjustment",
          focusId,
        }
      : null;
  }

  if (input.type === "REFUND_PROCESSED") {
    const focusId = deduplicationKey.slice(
      notificationFocusPrefixes.REFUND_PROCESSED.length,
    );

    return deduplicationKey.startsWith(
      notificationFocusPrefixes.REFUND_PROCESSED,
    ) && normalizeAdminReservationDetailFocusId(focusId)
      ? {
          kind: "refund",
          focusId,
        }
      : null;
  }

  return null;
}

export function resolveAdminReservationDetailInitialTab(
  input: Readonly<{
    focus: AdminReservationDetailFocus | null;
    refunds: readonly Readonly<{
      id: string;
      authorizationType: string;
    }>[];
  }>,
): AdminReservationDetailTab {
  if (!input.focus) {
    return "reservation";
  }

  if (input.focus.kind === "additionalChargePaymentRequest") {
    return "additionalCharges";
  }

  if (input.focus.kind === "lifecycleAdjustment") {
    return "changes";
  }

  const focusedRefund = input.refunds.find(
    (refund) => refund.id === input.focus?.focusId,
  );

  if (!focusedRefund) {
    return "reservation";
  }

  return focusedRefund.authorizationType === "ADDITIONAL_CHARGE"
    ? "additionalCharges"
    : "refunds";
}
