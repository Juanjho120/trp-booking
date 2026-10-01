import {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  FelDocumentStatus,
  FelDocumentType,
  FelLineKind,
  FelLineSourceRole,
  FelLineSourceType,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeTimeOfDay } from "@/lib/email/time-of-day";
import { inferReservationPhoneCountry } from "@/lib/fel/receiver-contact-suggestions";
import type { AdminActor } from "@/types/admin";
import type {
  AdminFelDocumentDetail,
  AdminFelDraftPreview,
  AdminFelEligibleReservation,
  AdminFelErrorCode,
  AdminFelLinePreview,
  AdminFelReceiverInput,
  AdminFelReceiverSnapshot,
  AdminFelPageData,
  CreateAdminFelDraftInput,
  DiscardAdminFelDraftInput,
  PreviewAdminFelDraftInput,
  SaveAdminFelDraftChangesInput,
} from "@/types/admin-fel";
import { ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES } from "@/types/admin-fel";

import { resolveAdminActor } from "./admin-actor";

const ADMIN_FEL_PAGE_SIZE = 20;
const ADMIN_FEL_MAX_RESERVATIONS_PER_DRAFT = 20;
const ADMIN_FEL_TRANSACTION_MAX_ATTEMPTS = 3;
const ADMIN_FEL_TRANSACTION_RETRY_DELAY_MS = 75;
const ADMIN_FEL_TRANSACTION_MAX_WAIT_MS = 10_000;
const ADMIN_FEL_TRANSACTION_TIMEOUT_MS = 20_000;
const GUATEMALA_UTC_OFFSET_HOURS = 6;
const RECEIVER_NAME_MAX_LENGTH = 160;
const RECEIVER_IDENTIFIER_MAX_LENGTH = 80;
const RECEIVER_ADDRESS_MAX_LENGTH = 500;
const RECEIVER_EMAIL_MAX_LENGTH = 254;
const RECEIVER_COUNTRY_MAX_LENGTH = 100;
const GUEST_PHONE_MAX_LENGTH = 64;

const ADDITIONAL_CHARGE_FISCAL_LABELS: Record<
  AdditionalChargeCategory,
  string
> = {
  [AdditionalChargeCategory.CLEANING]: "Limpieza adicional",
  [AdditionalChargeCategory.DAMAGE]: "Daños",
  [AdditionalChargeCategory.TRANSPORT]: "Transporte",
  [AdditionalChargeCategory.LATE_CHECKOUT]: "Salida tardía",
  [AdditionalChargeCategory.EXTRA_SERVICE]: "Servicio adicional",
  [AdditionalChargeCategory.OTHER]: "Otro",
};

const COMMITTED_REFUND_STATUSES = [
  RefundStatus.PENDING,
  RefundStatus.PROCESSING,
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
] as readonly RefundStatus[];

const REFUNDED_PAYMENT_STATUSES = [
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
] as readonly PaymentStatus[];

const REFUNDED_CHARGE_STATUSES = [
  AdditionalChargeStatus.PARTIALLY_REFUNDED,
  AdditionalChargeStatus.REFUNDED,
] as readonly AdditionalChargeStatus[];

const UNRESOLVED_LIFECYCLE_STATUSES = [
  ReservationLifecycleRequestStatus.PENDING_REVIEW,
  ReservationLifecycleRequestStatus.APPROVED,
  ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT,
] as readonly ReservationLifecycleRequestStatus[];

type FelTransactionClient = Prisma.TransactionClient;

type MoneyString = `${number}.${number}`;

type DateOnlyParts = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

type FelDraftSourcePayment = Readonly<{
  id: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: string;
  currency: string;
  paidAt: string | null;
}>;

type FelDraftSourceLifecycleRequest = Readonly<{
  id: string;
  requestType: string;
  status: ReservationLifecycleRequestStatus;
  financialDifference: string | null;
  currency: string | null;
  completedAt: string | null;
}>;

export type AdminFelDraftSourceExtra = Readonly<{
  guestPaymentRequestItemId: string;
  additionalChargeId: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  createdAt: string;
  settlementPayment: FelDraftSourcePayment;
}>;

export type AdminFelDraftSourceReservation = Readonly<{
  id: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestCountry: string | null;
  propertyId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  checkoutAt: string;
  nights: number;
  guestCount: number;
  subtotal: string;
  cleaningFee: string;
  taxes: string;
  discounts: string;
  total: string;
  currency: string;
  pricingSnapshot: Prisma.JsonValue | null;
  updatedAt: string;
  settlementPayments: readonly FelDraftSourcePayment[];
  lifecycleEvidence: readonly FelDraftSourceLifecycleRequest[];
  extras: readonly AdminFelDraftSourceExtra[];
}>;

type FelAllocationPlan = Readonly<{
  reservationId?: string;
  guestPaymentRequestItemId?: string;
  amount: string;
  currency: string;
}>;

type FelSourcePlan = Readonly<{
  sourceType: FelLineSourceType;
  sourceId: string;
  sourceRole: FelLineSourceRole;
  sourceSnapshotJson: Prisma.InputJsonObject;
}>;

type FelLinePlan = Readonly<{
  lineNumber: number;
  kind: FelLineKind;
  description: string;
  amount: string;
  currency: string;
  allocations: readonly FelAllocationPlan[];
  sources: readonly FelSourcePlan[];
}>;

type FelDraftComposition = Readonly<{
  documentType: "SMALL_TAXPAYER_INVOICE";
  status: "DRAFT";
  commercialCurrency: string;
  receiver: AdminFelReceiverSnapshot;
  groupExtras: boolean;
  reservations: readonly AdminFelDraftSourceReservation[];
  lines: readonly FelLinePlan[];
  total: string;
}>;

const adminFelReservationSelect = {
  id: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  guestCountry: true,
  status: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  subtotal: true,
  cleaningFee: true,
  taxes: true,
  discounts: true,
  total: true,
  currency: true,
  pricingSnapshot: true,
  confirmedAt: true,
  updatedAt: true,
  property: {
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
      checkOutTime: true,
    },
  },
  payments: {
    select: {
      id: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      refunds: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  },
  lifecycleRequests: {
    select: {
      id: true,
      requestType: true,
      status: true,
      financialDifference: true,
      currency: true,
      completedAt: true,
    },
  },
  additionalCharges: {
    select: {
      id: true,
      status: true,
      refundAllocations: {
        select: {
          id: true,
          refund: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      paymentRequestItems: {
        select: {
          id: true,
          additionalChargeId: true,
          categorySnapshot: true,
          descriptionSnapshot: true,
          amountSnapshot: true,
          currencySnapshot: true,
          createdAt: true,
          felAllocation: {
            select: {
              id: true,
              felDocumentId: true,
            },
          },
          paymentRequest: {
            select: {
              id: true,
              status: true,
              payment: {
                select: {
                  id: true,
                  purpose: true,
                  status: true,
                  amount: true,
                  currency: true,
                  paidAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  felCommercialAllocations: {
    select: {
      id: true,
      felDocumentId: true,
    },
  },
} satisfies Prisma.ReservationSelect;

type AdminFelReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof adminFelReservationSelect;
}>;

const adminFelDocumentInclude = {
  createdByAdmin: {
    select: {
      email: true,
      name: true,
    },
  },
  reservations: {
    orderBy: [{ checkInDate: "asc" }, { checkOutDate: "asc" }, { reservationId: "asc" }],
  },
  lineItems: {
    orderBy: { lineNumber: "asc" },
    include: {
      sources: {
        orderBy: [{ sourceType: "asc" }, { sourceId: "asc" }, { sourceRole: "asc" }],
      },
      commercialAllocations: true,
    },
  },
} satisfies Prisma.FelDocumentInclude;

type AdminFelDocumentRecord = Prisma.FelDocumentGetPayload<{
  include: typeof adminFelDocumentInclude;
}>;

export class AdminFelError extends Error {
  readonly code: AdminFelErrorCode;

  constructor(code: AdminFelErrorCode) {
    super(code);
    this.name = "AdminFelError";
    this.code = code;
  }
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

function isAdminFelSerializationFailure(error: unknown): boolean {
  return isKnownPrismaError(error, "P2034");
}

function isAdminFelSourceConflict(error: unknown): boolean {
  return isKnownPrismaError(error, "P2002");
}

async function waitForAdminFelRetry(attempt: number): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, ADMIN_FEL_TRANSACTION_RETRY_DELAY_MS * attempt),
  );
}

export async function runAdminFelTransactionWithRetry<T>(
  operation: (transaction: FelTransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= ADMIN_FEL_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: ADMIN_FEL_TRANSACTION_MAX_WAIT_MS,
        timeout: ADMIN_FEL_TRANSACTION_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        !isAdminFelSerializationFailure(error) ||
        attempt === ADMIN_FEL_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await waitForAdminFelRetry(attempt);
    }
  }

  throw new AdminFelError("ADMIN_FEL_UNEXPECTED_ERROR");
}

function toDateOnlyString(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateOnlyParts(value: string | Date): DateOnlyParts {
  const dateOnly = typeof value === "string" ? value : toDateOnlyString(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);

  if (!match) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function dateOnlyToUtc(parts: DateOnlyParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function calculateNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = parseDateOnlyParts(checkInDate);
  const checkOut = parseDateOnlyParts(checkOutDate);
  const diffMs = dateOnlyToUtc(checkOut) - dateOnlyToUtc(checkIn);
  const nights = Math.round(diffMs / 86_400_000);

  return Math.max(0, nights);
}

export function calculateFelCheckoutAt(
  checkOutDate: Date | string,
  checkOutTime: string | null | undefined,
): Date | null {
  if (!checkOutTime) {
    return null;
  }

  const normalizedTime = normalizeTimeOfDay(checkOutTime);
  if (!normalizedTime) {
    return null;
  }

  const [hoursText, minutesText] = normalizedTime.split(":");
  const parts = parseDateOnlyParts(checkOutDate);

  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      Number(hoursText) + GUATEMALA_UTC_OFFSET_HOURS,
      Number(minutesText),
    ),
  );
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function decimalToMoney(value: Prisma.Decimal | number | string): MoneyString {
  const decimal = new Prisma.Decimal(value);
  return decimal.toFixed(2) as MoneyString;
}

function moneyToCents(value: string): number {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  const [whole, fraction = ""] = value.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const absoluteWhole = whole.replace("-", "");
  const cents = Number(absoluteWhole) * 100 + Number(fraction.padEnd(2, "0"));

  return sign * cents;
}

function centsToMoney(cents: number): MoneyString {
  return (cents / 100).toFixed(2) as MoneyString;
}

function sumMoney(values: readonly string[]): MoneyString {
  return centsToMoney(values.reduce((total, value) => total + moneyToCents(value), 0));
}

function normalizeCurrency(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || !/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function trimBounded(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  return trimmed;
}

function trimSuggestion(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function normalizeReceiverInput(
  input: AdminFelReceiverInput,
): AdminFelReceiverSnapshot {
  const receiverName = trimBounded(input.receiverName, RECEIVER_NAME_MAX_LENGTH);
  const receiverIdentifierType = input.receiverIdentifierType;

  if (!receiverName) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  if (!ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES.includes(receiverIdentifierType)) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  const receiverIdentifier = trimBounded(
    input.receiverIdentifier,
    RECEIVER_IDENTIFIER_MAX_LENGTH,
  );

  if (receiverIdentifierType !== "CONSUMIDOR_FINAL" && !receiverIdentifier) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  const receiverEmail = trimBounded(input.receiverEmail, RECEIVER_EMAIL_MAX_LENGTH);
  if (receiverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  return {
    receiverName,
    receiverIdentifierType,
    receiverIdentifier:
      receiverIdentifierType === "CONSUMIDOR_FINAL" ? null : receiverIdentifier,
    receiverAddress: trimBounded(input.receiverAddress, RECEIVER_ADDRESS_MAX_LENGTH),
    receiverEmail,
    receiverCountry: trimBounded(input.receiverCountry, RECEIVER_COUNTRY_MAX_LENGTH),
  };
}

function normalizeReservationIds(reservationIds: readonly string[]): string[] {
  const normalized = reservationIds.map((id) => id.trim()).filter(Boolean);
  const unique = new Set(normalized);

  if (
    normalized.length === 0 ||
    normalized.length > ADMIN_FEL_MAX_RESERVATIONS_PER_DRAFT ||
    unique.size !== normalized.length
  ) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  return normalized;
}

function normalizeOptionalDocumentId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function isFelCommercialSourceAvailable(
  allocations: readonly Readonly<{ felDocumentId?: string | null }>[],
  editingDocumentId?: string | null,
): boolean {
  if (allocations.length === 0) {
    return true;
  }

  const ownerDocumentId = normalizeOptionalDocumentId(editingDocumentId);

  return (
    ownerDocumentId !== null &&
    allocations.every(
      (allocation) => allocation.felDocumentId === ownerDocumentId,
    )
  );
}

function isUnresolvedLifecycleStatus(
  status: ReservationLifecycleRequestStatus,
): boolean {
  return UNRESOLVED_LIFECYCLE_STATUSES.includes(status);
}

export function hasUnresolvedFelLifecycleMutation(
  lifecycleRequests: readonly Readonly<{ status: ReservationLifecycleRequestStatus }>[],
): boolean {
  return lifecycleRequests.some((request) =>
    isUnresolvedLifecycleStatus(request.status),
  );
}

function hasCommittedRefundStatus(status: RefundStatus): boolean {
  return COMMITTED_REFUND_STATUSES.includes(status);
}

function hasFiscalReconciliationBlocker(record: AdminFelReservationRecord): boolean {
  if (
    record.status === ReservationStatus.CANCELLED ||
    record.status === ReservationStatus.PARTIALLY_REFUNDED ||
    record.status === ReservationStatus.REFUNDED
  ) {
    return true;
  }

  if (
    record.payments.some(
      (payment) =>
        REFUNDED_PAYMENT_STATUSES.includes(payment.status) ||
        payment.refunds.some((refund) => hasCommittedRefundStatus(refund.status)),
    )
  ) {
    return true;
  }

  return record.additionalCharges.some(
    (charge) =>
      REFUNDED_CHARGE_STATUSES.includes(charge.status) ||
      charge.refundAllocations.some((allocation) =>
        hasCommittedRefundStatus(allocation.refund.status),
      ),
  );
}

export function evaluateAdminFelReservationEligibility(
  record: Pick<
    AdminFelReservationRecord,
    | "status"
    | "confirmedAt"
    | "checkOutDate"
    | "currency"
    | "lifecycleRequests"
    | "felCommercialAllocations"
  > &
    Pick<AdminFelReservationRecord, "payments" | "additionalCharges"> & {
      property: Pick<AdminFelReservationRecord["property"], "checkOutTime">;
    },
  now: Date = new Date(),
  options: Readonly<{ editingDocumentId?: string | null }> = {},
):
  | Readonly<{ eligible: true; checkoutAt: Date; currency: string }>
  | Readonly<{ eligible: false; reason: AdminFelErrorCode }> {
  if (record.status !== ReservationStatus.CONFIRMED || !record.confirmedAt) {
    return { eligible: false, reason: "ADMIN_FEL_RESERVATION_NOT_ELIGIBLE" };
  }

  const currency = normalizeCurrency(record.currency);
  if (!currency) {
    return { eligible: false, reason: "ADMIN_FEL_CURRENCY_MISMATCH" };
  }

  const checkoutAt = calculateFelCheckoutAt(
    record.checkOutDate,
    record.property.checkOutTime,
  );

  if (!checkoutAt) {
    return { eligible: false, reason: "ADMIN_FEL_INVALID_CHECKOUT_TIME" };
  }

  if (checkoutAt.getTime() > now.getTime()) {
    return { eligible: false, reason: "ADMIN_FEL_CHECKOUT_NOT_REACHED" };
  }

  if (hasUnresolvedFelLifecycleMutation(record.lifecycleRequests)) {
    return { eligible: false, reason: "ADMIN_FEL_LIFECYCLE_UNRESOLVED" };
  }

  if (hasFiscalReconciliationBlocker(record as AdminFelReservationRecord)) {
    return {
      eligible: false,
      reason: "ADMIN_FEL_FISCAL_RECONCILIATION_REQUIRED",
    };
  }

  if (
    !isFelCommercialSourceAvailable(
      record.felCommercialAllocations,
      options.editingDocumentId,
    )
  ) {
    return { eligible: false, reason: "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED" };
  }

  return { eligible: true, checkoutAt, currency };
}

function isEligibleExtra(charge: AdminFelReservationRecord["additionalCharges"][number]) {
  if (charge.status !== AdditionalChargeStatus.PAID) {
    return false;
  }

  if (
    charge.refundAllocations.some((allocation) =>
      hasCommittedRefundStatus(allocation.refund.status),
    )
  ) {
    return false;
  }

  return true;
}

function toEligibleExtra(
  item: AdminFelReservationRecord["additionalCharges"][number]["paymentRequestItems"][number],
  editingDocumentId?: string | null,
): AdminFelDraftSourceExtra | null {
  const payment = item.paymentRequest.payment;
  const currency = normalizeCurrency(item.currencySnapshot);

  if (
    !currency ||
    !isFelCommercialSourceAvailable(
      item.felAllocation ? [item.felAllocation] : [],
      editingDocumentId,
    ) ||
    item.paymentRequest.status !== GuestPaymentRequestStatus.PAID ||
    !payment ||
    payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    payment.status !== PaymentStatus.APPROVED
  ) {
    return null;
  }

  return {
    guestPaymentRequestItemId: item.id,
    additionalChargeId: item.additionalChargeId,
    category: item.categorySnapshot,
    description: item.descriptionSnapshot,
    amount: decimalToMoney(item.amountSnapshot),
    currency,
    createdAt: item.createdAt.toISOString(),
    settlementPayment: {
      id: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      amount: decimalToMoney(payment.amount),
      currency: normalizeCurrency(payment.currency) ?? currency,
      paidAt: toIso(payment.paidAt),
    },
  };
}

function toDraftSourceReservation(
  record: AdminFelReservationRecord,
  checkoutAt: Date,
  editingDocumentId?: string | null,
): AdminFelDraftSourceReservation {
  const checkInDate = toDateOnlyString(record.checkInDate);
  const checkOutDate = toDateOnlyString(record.checkOutDate);
  const currency = normalizeCurrency(record.currency);

  if (!currency) {
    throw new AdminFelError("ADMIN_FEL_CURRENCY_MISMATCH");
  }

  const extras = record.additionalCharges
    .filter(isEligibleExtra)
    .flatMap((charge) =>
      charge.paymentRequestItems.map((item) =>
        toEligibleExtra(item, editingDocumentId),
      ),
    )
    .filter((extra): extra is AdminFelDraftSourceExtra => Boolean(extra))
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.guestPaymentRequestItemId.localeCompare(
          right.guestPaymentRequestItemId,
        ),
    );

  return {
    id: record.id,
    guestName: record.guestName,
    guestEmail: trimSuggestion(record.guestEmail, RECEIVER_EMAIL_MAX_LENGTH),
    guestPhone: trimSuggestion(record.guestPhone, GUEST_PHONE_MAX_LENGTH),
    guestCountry: inferReservationPhoneCountry(
      record.guestPhone,
      record.guestCountry,
    ),
    propertyId: record.property.id,
    propertyName: record.property.nameEs,
    checkInDate,
    checkOutDate,
    checkoutAt: checkoutAt.toISOString(),
    nights: calculateNights(checkInDate, checkOutDate),
    guestCount: record.guestCount,
    subtotal: decimalToMoney(record.subtotal),
    cleaningFee: decimalToMoney(record.cleaningFee),
    taxes: decimalToMoney(record.taxes),
    discounts: decimalToMoney(record.discounts),
    total: decimalToMoney(record.total),
    currency,
    pricingSnapshot: record.pricingSnapshot,
    updatedAt: record.updatedAt.toISOString(),
    settlementPayments: record.payments
      .filter(
        (payment) =>
          payment.status === PaymentStatus.APPROVED &&
          (payment.purpose === PaymentPurpose.INITIAL_RESERVATION ||
            payment.purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT),
      )
      .map((payment) => ({
        id: payment.id,
        purpose: payment.purpose,
        status: payment.status,
        amount: decimalToMoney(payment.amount),
        currency: normalizeCurrency(payment.currency) ?? currency,
        paidAt: toIso(payment.paidAt),
      })),
    lifecycleEvidence: record.lifecycleRequests
      .filter(
        (request) =>
          request.status === ReservationLifecycleRequestStatus.COMPLETED,
      )
      .map((request) => ({
        id: request.id,
        requestType: request.requestType,
        status: request.status,
        financialDifference: request.financialDifference
          ? decimalToMoney(request.financialDifference)
          : null,
        currency: normalizeCurrency(request.currency),
        completedAt: toIso(request.completedAt),
      })),
    extras,
  };
}

function monthNameEs(month: number): string {
  return [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ][month - 1];
}

function formatSpanishDateRange(checkInDate: string, checkOutDate: string): string {
  const checkIn = parseDateOnlyParts(checkInDate);
  const checkOut = parseDateOnlyParts(checkOutDate);

  if (checkIn.year === checkOut.year && checkIn.month === checkOut.month) {
    return `${checkIn.day} al ${checkOut.day} de ${monthNameEs(checkIn.month)}`;
  }

  if (checkIn.year === checkOut.year) {
    return `${checkIn.day} de ${monthNameEs(checkIn.month)} al ${checkOut.day} de ${monthNameEs(checkOut.month)} de ${checkOut.year}`;
  }

  return `${checkIn.day} de ${monthNameEs(checkIn.month)} de ${checkIn.year} al ${checkOut.day} de ${monthNameEs(checkOut.month)} de ${checkOut.year}`;
}

function lodgingDescription(reservation: AdminFelDraftSourceReservation): string {
  const nightsLabel =
    reservation.nights === 1 ? "1 noche" : `${reservation.nights} noches`;
  const propertyName = reservation.propertyName.trim();
  const propertySuffix = propertyName ? ` - ${propertyName}` : "";

  return `Reservación del ${formatSpanishDateRange(
    reservation.checkInDate,
    reservation.checkOutDate,
  )} (${nightsLabel})${propertySuffix}`;
}

function normalizeFiscalDescriptionText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-GT");
}

function additionalChargeCategoryFiscalLabel(category: string): string {
  if (category in ADDITIONAL_CHARGE_FISCAL_LABELS) {
    return ADDITIONAL_CHARGE_FISCAL_LABELS[
      category as AdditionalChargeCategory
    ];
  }

  return ADDITIONAL_CHARGE_FISCAL_LABELS[AdditionalChargeCategory.OTHER];
}

export function additionalChargeFiscalDescription(
  extra: Pick<AdminFelDraftSourceExtra, "category" | "description">,
): string {
  const label = additionalChargeCategoryFiscalLabel(extra.category);
  const description = extra.description.trim().replace(/\s+/g, " ");

  if (
    !description ||
    normalizeFiscalDescriptionText(description) ===
      normalizeFiscalDescriptionText(label)
  ) {
    return label;
  }

  return `${label} (${description})`;
}

function reservationAmountSource(
  reservation: AdminFelDraftSourceReservation,
): FelSourcePlan {
  return {
    sourceType: FelLineSourceType.RESERVATION,
    sourceId: reservation.id,
    sourceRole: FelLineSourceRole.AMOUNT_SOURCE,
    sourceSnapshotJson: {
      reservationId: reservation.id,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      total: reservation.total,
      currency: reservation.currency,
      updatedAt: reservation.updatedAt,
    },
  };
}

function reservationSettlementSources(
  reservation: AdminFelDraftSourceReservation,
): FelSourcePlan[] {
  return reservation.settlementPayments.map((payment) => ({
    sourceType: FelLineSourceType.PAYMENT,
    sourceId: payment.id,
    sourceRole: FelLineSourceRole.SETTLEMENT_EVIDENCE,
    sourceSnapshotJson: {
      paymentId: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
    },
  }));
}

function reservationLifecycleSources(
  reservation: AdminFelDraftSourceReservation,
): FelSourcePlan[] {
  return reservation.lifecycleEvidence.map((request) => ({
    sourceType: FelLineSourceType.RESERVATION_LIFECYCLE_REQUEST,
    sourceId: request.id,
    sourceRole: FelLineSourceRole.LIFECYCLE_EVIDENCE,
    sourceSnapshotJson: {
      requestId: request.id,
      requestType: request.requestType,
      status: request.status,
      financialDifference: request.financialDifference,
      currency: request.currency,
      completedAt: request.completedAt,
    },
  }));
}

function extraAmountSource(extra: AdminFelDraftSourceExtra): FelSourcePlan {
  return {
    sourceType: FelLineSourceType.GUEST_PAYMENT_REQUEST_ITEM,
    sourceId: extra.guestPaymentRequestItemId,
    sourceRole: FelLineSourceRole.AMOUNT_SOURCE,
    sourceSnapshotJson: {
      guestPaymentRequestItemId: extra.guestPaymentRequestItemId,
      additionalChargeId: extra.additionalChargeId,
      categorySnapshot: extra.category,
      descriptionSnapshot: extra.description,
      amountSnapshot: extra.amount,
      currencySnapshot: extra.currency,
      createdAt: extra.createdAt,
    },
  };
}

function extraSettlementSource(extra: AdminFelDraftSourceExtra): FelSourcePlan {
  return {
    sourceType: FelLineSourceType.PAYMENT,
    sourceId: extra.settlementPayment.id,
    sourceRole: FelLineSourceRole.SETTLEMENT_EVIDENCE,
    sourceSnapshotJson: {
      paymentId: extra.settlementPayment.id,
      purpose: extra.settlementPayment.purpose,
      status: extra.settlementPayment.status,
      amount: extra.settlementPayment.amount,
      currency: extra.settlementPayment.currency,
      paidAt: extra.settlementPayment.paidAt,
    },
  };
}

function sortDraftSourceReservations(
  reservations: readonly AdminFelDraftSourceReservation[],
): AdminFelDraftSourceReservation[] {
  return [...reservations].sort(
    (left, right) =>
      left.checkInDate.localeCompare(right.checkInDate) ||
      left.checkOutDate.localeCompare(right.checkOutDate) ||
      left.id.localeCompare(right.id),
  );
}

function validateLineArithmetic(line: FelLinePlan): void {
  const allocationTotal = sumMoney(
    line.allocations.map((allocation) => allocation.amount),
  );

  if (allocationTotal !== line.amount) {
    throw new AdminFelError("ADMIN_FEL_UNEXPECTED_ERROR");
  }
}

function toLinePreview(line: FelLinePlan): AdminFelLinePreview {
  return {
    lineNumber: line.lineNumber,
    kind: line.kind,
    description: line.description,
    amount: line.amount,
    currency: line.currency,
    allocationCount: line.allocations.length,
    sources: line.sources.map((source) => ({
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceRole: source.sourceRole,
    })),
  };
}

function buildFelDraftComposition(
  input: Readonly<{
    reservations: readonly AdminFelDraftSourceReservation[];
    receiver: AdminFelReceiverSnapshot;
    groupExtras: boolean;
  }>,
): FelDraftComposition {
  const reservations = sortDraftSourceReservations(input.reservations);
  const currencies = new Set(reservations.map((reservation) => reservation.currency));

  if (reservations.length === 0) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  if (currencies.size !== 1) {
    throw new AdminFelError("ADMIN_FEL_CURRENCY_MISMATCH");
  }

  const [commercialCurrency] = currencies;
  const lines: FelLinePlan[] = [];
  const extras = reservations.flatMap((reservation) =>
    reservation.extras.map((extra) => ({ reservationId: reservation.id, extra })),
  );
  const skippedCurrencyExtras = extras.filter(
    ({ extra }) => extra.currency !== commercialCurrency,
  );

  if (skippedCurrencyExtras.length > 0) {
    throw new AdminFelError("ADMIN_FEL_CURRENCY_MISMATCH");
  }

  reservations.forEach((reservation) => {
    if (reservation.currency !== commercialCurrency) {
      throw new AdminFelError("ADMIN_FEL_CURRENCY_MISMATCH");
    }

    lines.push({
      lineNumber: lines.length + 1,
      kind: FelLineKind.LODGING,
      description: lodgingDescription(reservation),
      amount: reservation.total,
      currency: reservation.currency,
      allocations: [
        {
          reservationId: reservation.id,
          amount: reservation.total,
          currency: reservation.currency,
        },
      ],
      sources: [
        reservationAmountSource(reservation),
        ...reservationSettlementSources(reservation),
        ...reservationLifecycleSources(reservation),
      ],
    });

    if (!input.groupExtras) {
      reservation.extras.forEach((extra) => {
        lines.push({
          lineNumber: lines.length + 1,
          kind: FelLineKind.ADDITIONAL_CHARGE,
          description: additionalChargeFiscalDescription(extra),
          amount: extra.amount,
          currency: extra.currency,
          allocations: [
            {
              guestPaymentRequestItemId: extra.guestPaymentRequestItemId,
              amount: extra.amount,
              currency: extra.currency,
            },
          ],
          sources: [extraAmountSource(extra), extraSettlementSource(extra)],
        });
      });
    }
  });

  if (input.groupExtras && extras.length > 0) {
    const allocations = extras.map(({ extra }) => ({
      guestPaymentRequestItemId: extra.guestPaymentRequestItemId,
      amount: extra.amount,
      currency: extra.currency,
    }));
    const amount = sumMoney(allocations.map((allocation) => allocation.amount));

    lines.push({
      lineNumber: lines.length + 1,
      kind: FelLineKind.GROUPED_ADDITIONAL_CHARGES,
      description: "Servicios y cargos adicionales",
      amount,
      currency: commercialCurrency,
      allocations,
      sources: extras.flatMap(({ extra }) => [
        extraAmountSource(extra),
        extraSettlementSource(extra),
      ]),
    });
  }

  lines.forEach(validateLineArithmetic);
  const total = sumMoney(lines.map((line) => line.amount));

  return {
    documentType: FelDocumentType.SMALL_TAXPAYER_INVOICE,
    status: FelDocumentStatus.DRAFT,
    commercialCurrency,
    receiver: input.receiver,
    groupExtras: input.groupExtras,
    reservations,
    lines,
    total,
  };
}

export function buildAdminFelDraftPreview(
  input: Readonly<{
    reservations: readonly AdminFelDraftSourceReservation[];
    receiver: AdminFelReceiverInput;
    groupExtras: boolean;
  }>,
): AdminFelDraftPreview {
  const composition = buildFelDraftComposition({
    reservations: input.reservations,
    receiver: normalizeReceiverInput(input.receiver),
    groupExtras: input.groupExtras,
  });

  return toDraftPreview(composition);
}

function toDraftPreview(composition: FelDraftComposition): AdminFelDraftPreview {
  return {
    documentType: composition.documentType,
    status: "DRAFT",
    commercialCurrency: composition.commercialCurrency,
    receiver: composition.receiver,
    groupExtras: composition.groupExtras,
    reservationIds: composition.reservations.map((reservation) => reservation.id),
    lines: composition.lines.map(toLinePreview),
    total: composition.total,
  };
}

function toEligibleReservation(
  source: AdminFelDraftSourceReservation,
): AdminFelEligibleReservation {
  return {
    id: source.id,
    guestName: source.guestName,
    guestEmail: source.guestEmail,
    guestPhone: source.guestPhone,
    guestCountry: source.guestCountry,
    property: {
      id: source.propertyId,
      nameEs: source.propertyName,
      nameEn: source.propertyName,
    },
    checkInDate: source.checkInDate,
    checkOutDate: source.checkOutDate,
    lodgingDescription: lodgingDescription(source),
    checkoutAt: source.checkoutAt,
    nights: source.nights,
    guestCount: source.guestCount,
    total: source.total,
    currency: source.currency,
    eligibleExtraCount: source.extras.length,
    eligibleExtraTotal: sumMoney(source.extras.map((extra) => extra.amount)),
    extras: source.extras.map((extra) => ({
      guestPaymentRequestItemId: extra.guestPaymentRequestItemId,
      additionalChargeId: extra.additionalChargeId,
      category: extra.category,
      description: extra.description,
      amount: extra.amount,
      currency: extra.currency,
      createdAt: extra.createdAt,
    })),
  };
}

async function loadReservationRecords(
  transaction: FelTransactionClient,
  reservationIds: readonly string[],
): Promise<AdminFelReservationRecord[]> {
  const records = await transaction.reservation.findMany({
    where: {
      id: {
        in: [...reservationIds],
      },
    },
    select: adminFelReservationSelect,
  });

  if (records.length !== reservationIds.length) {
    throw new AdminFelError("ADMIN_FEL_RESERVATION_NOT_ELIGIBLE");
  }

  return records;
}

function recordsToDraftSources(
  records: readonly AdminFelReservationRecord[],
  now: Date,
  editingDocumentId?: string | null,
): AdminFelDraftSourceReservation[] {
  return records.map((record) => {
    const eligibility = evaluateAdminFelReservationEligibility(record, now, {
      editingDocumentId,
    });

    if (!eligibility.eligible) {
      throw new AdminFelError(eligibility.reason);
    }

    return toDraftSourceReservation(record, eligibility.checkoutAt, editingDocumentId);
  });
}

function toDateForPrisma(dateOnly: string): Date {
  const parts = parseDateOnlyParts(dateOnly);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

async function persistFelDraftComponents(
  transaction: FelTransactionClient,
  documentId: string,
  composition: FelDraftComposition,
): Promise<void> {
  for (const reservation of composition.reservations) {
    await transaction.felDocumentReservation.create({
      data: {
        felDocumentId: documentId,
        reservationId: reservation.id,
        propertyId: reservation.propertyId,
        propertyNameSnapshot: reservation.propertyName,
        checkInDate: toDateForPrisma(reservation.checkInDate),
        checkOutDate: toDateForPrisma(reservation.checkOutDate),
        guestCount: reservation.guestCount,
        subtotalSnapshot: new Prisma.Decimal(reservation.subtotal),
        cleaningFeeSnapshot: new Prisma.Decimal(reservation.cleaningFee),
        taxesSnapshot: new Prisma.Decimal(reservation.taxes),
        discountsSnapshot: new Prisma.Decimal(reservation.discounts),
        totalSnapshot: new Prisma.Decimal(reservation.total),
        currencySnapshot: reservation.currency,
        pricingSnapshot:
          reservation.pricingSnapshot === null
            ? Prisma.JsonNull
            : reservation.pricingSnapshot,
        reservationUpdatedAtSnapshot: new Date(reservation.updatedAt),
      },
    });
  }

  for (const linePlan of composition.lines) {
    const line = await transaction.felLineItem.create({
      data: {
        felDocumentId: documentId,
        lineNumber: linePlan.lineNumber,
        kind: linePlan.kind,
        description: linePlan.description,
        quantity: new Prisma.Decimal("1.00"),
        unitPrice: new Prisma.Decimal(linePlan.amount),
        amount: new Prisma.Decimal(linePlan.amount),
        currency: linePlan.currency,
      },
      select: {
        id: true,
      },
    });

    await transaction.felCommercialSourceAllocation.createMany({
      data: linePlan.allocations.map((allocation) => ({
        felDocumentId: documentId,
        felLineItemId: line.id,
        reservationId: allocation.reservationId ?? null,
        guestPaymentRequestItemId: allocation.guestPaymentRequestItemId ?? null,
        amountSnapshot: new Prisma.Decimal(allocation.amount),
        currencySnapshot: allocation.currency,
      })),
    });

    await transaction.felLineSource.createMany({
      data: linePlan.sources.map((source) => ({
        felLineItemId: line.id,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        sourceRole: source.sourceRole,
        sourceSnapshotJson: source.sourceSnapshotJson,
      })),
    });
  }
}

async function deleteDraftComponents(
  transaction: FelTransactionClient,
  documentId: string,
): Promise<void> {
  await transaction.felLineSource.deleteMany({
    where: {
      felLineItem: {
        felDocumentId: documentId,
      },
    },
  });
  await transaction.felCommercialSourceAllocation.deleteMany({
    where: {
      felDocumentId: documentId,
    },
  });
  await transaction.felLineItem.deleteMany({
    where: {
      felDocumentId: documentId,
    },
  });
  await transaction.felDocumentReservation.deleteMany({
    where: {
      felDocumentId: documentId,
    },
  });
}

async function createFelAuditLog(
  transaction: FelTransactionClient,
  input: Readonly<{
    adminUserId: string;
    action: "FEL_DRAFT_CREATED" | "FEL_DRAFT_UPDATED" | "FEL_DRAFT_DISCARDED";
    documentId: string;
    metadata: Prisma.InputJsonObject;
  }>,
): Promise<void> {
  await transaction.adminAuditLog.create({
    data: {
      userId: input.adminUserId,
      action: input.action,
      entityType: "FelDocument",
      entityId: input.documentId,
      metadata: input.metadata,
    },
  });
}

function auditMetadataForComposition(
  composition: FelDraftComposition,
): Prisma.InputJsonObject {
  return {
    reservationIds: composition.reservations.map((reservation) => reservation.id),
    groupExtras: composition.groupExtras,
    lineCount: composition.lines.length,
    total: composition.total,
    commercialCurrency: composition.commercialCurrency,
  };
}

function toDocumentLinePreview(
  line: AdminFelDocumentRecord["lineItems"][number],
): AdminFelLinePreview {
  return {
    lineNumber: line.lineNumber,
    kind: line.kind,
    description: line.description,
    amount: decimalToMoney(line.amount),
    currency: line.currency,
    allocationCount: line.commercialAllocations.length,
    sources: line.sources.map((source) => ({
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceRole: source.sourceRole,
    })),
  };
}

function toAdminFelDocumentDetail(
  document: AdminFelDocumentRecord,
): AdminFelDocumentDetail {
  return {
    id: document.id,
    documentType: document.documentType,
    status: document.status,
    commercialCurrency: document.commercialCurrency,
    receiverName: document.receiverName,
    receiverIdentifierType: document.receiverIdentifierType,
    receiverIdentifier: document.receiverIdentifier,
    receiverAddress: document.receiverAddress,
    receiverEmail: document.receiverEmail,
    receiverCountry: document.receiverCountry,
    total: decimalToMoney(document.total),
    groupExtras: document.groupExtras,
    reservationCount: document.reservations.length,
    lineCount: document.lineItems.length,
    createdBy: {
      email: document.createdByAdmin.email,
      name: document.createdByAdmin.name,
    },
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    reservations: document.reservations.map((reservation) => ({
      reservationId: reservation.reservationId,
      propertyName: reservation.propertyNameSnapshot,
      checkInDate: toDateOnlyString(reservation.checkInDate),
      checkOutDate: toDateOnlyString(reservation.checkOutDate),
      guestCount: reservation.guestCount,
      total: decimalToMoney(reservation.totalSnapshot),
      currency: reservation.currencySnapshot,
    })),
    lines: document.lineItems.map(toDocumentLinePreview),
  };
}

async function findFelDocumentDetail(
  transaction: FelTransactionClient,
  documentId: string,
): Promise<AdminFelDocumentDetail> {
  const document = await transaction.felDocument.findUnique({
    where: { id: documentId },
    include: adminFelDocumentInclude,
  });

  if (!document) {
    throw new AdminFelError("ADMIN_FEL_DOCUMENT_NOT_FOUND");
  }

  return toAdminFelDocumentDetail(document);
}

function ensureDraftEditable(status: FelDocumentStatus): void {
  if (status !== FelDocumentStatus.DRAFT) {
    throw new AdminFelError("ADMIN_FEL_DRAFT_NOT_EDITABLE");
  }
}

export async function previewAdminFelDraft(
  input: PreviewAdminFelDraftInput,
): Promise<AdminFelDraftPreview> {
  const reservationIds = normalizeReservationIds(input.reservationIds);
  const receiver = normalizeReceiverInput(input);
  const editingDocumentId = normalizeOptionalDocumentId(input.editingDocumentId);

  return prisma.$transaction(
    async (transaction) => {
      if (editingDocumentId) {
        const document = await transaction.felDocument.findUnique({
          where: { id: editingDocumentId },
          select: {
            id: true,
            status: true,
          },
        });

        if (!document) {
          throw new AdminFelError("ADMIN_FEL_DOCUMENT_NOT_FOUND");
        }

        ensureDraftEditable(document.status);
      }

      const records = await loadReservationRecords(transaction, reservationIds);
      const composition = buildFelDraftComposition({
        reservations: recordsToDraftSources(
          records,
          new Date(),
          editingDocumentId,
        ),
        receiver,
        groupExtras: Boolean(input.groupExtras),
      });

      return toDraftPreview(composition);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: ADMIN_FEL_TRANSACTION_MAX_WAIT_MS,
      timeout: ADMIN_FEL_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export async function getAdminFelPage(
  input: Readonly<{ page?: number }> = {},
): Promise<AdminFelPageData> {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const skip = (page - 1) * ADMIN_FEL_PAGE_SIZE;
  const now = new Date();

  const [reservationRecords, documents, documentCount] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: {
          not: null,
        },
      },
      select: adminFelReservationSelect,
      orderBy: [{ checkOutDate: "desc" }, { id: "asc" }],
      take: 200,
    }),
    prisma.felDocument.findMany({
      include: adminFelDocumentInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take: ADMIN_FEL_PAGE_SIZE,
    }),
    prisma.felDocument.count(),
  ]);

  const eligibleReservations = reservationRecords.flatMap((record) => {
    const eligibility = evaluateAdminFelReservationEligibility(record, now);

    if (!eligibility.eligible) {
      return [];
    }

    return [toEligibleReservation(toDraftSourceReservation(record, eligibility.checkoutAt))];
  });

  return {
    generatedAt: now.toISOString(),
    eligibleReservations,
    documents: documents.map(toAdminFelDocumentDetail),
    pagination: {
      page,
      pageSize: ADMIN_FEL_PAGE_SIZE,
      totalItems: documentCount,
      totalPages: Math.max(1, Math.ceil(documentCount / ADMIN_FEL_PAGE_SIZE)),
    },
  };
}

export async function getAdminFelDraft(
  documentId: string,
): Promise<AdminFelDocumentDetail> {
  if (!documentId.trim()) {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }

  const document = await prisma.felDocument.findUnique({
    where: { id: documentId.trim() },
    include: adminFelDocumentInclude,
  });

  if (!document) {
    throw new AdminFelError("ADMIN_FEL_DOCUMENT_NOT_FOUND");
  }

  return toAdminFelDocumentDetail(document);
}

async function createAdminFelDraftInTransaction(
  transaction: FelTransactionClient,
  input: CreateAdminFelDraftInput,
  actor: AdminActor,
): Promise<AdminFelDocumentDetail> {
  const reservationIds = normalizeReservationIds(input.reservationIds);
  const receiver = normalizeReceiverInput(input);
  const adminUser = await resolveAdminActor(transaction, actor);
  const records = await loadReservationRecords(transaction, reservationIds);
  const composition = buildFelDraftComposition({
    reservations: recordsToDraftSources(records, new Date()),
    receiver,
    groupExtras: Boolean(input.groupExtras),
  });

  const document = await transaction.felDocument.create({
    data: {
      documentType: FelDocumentType.SMALL_TAXPAYER_INVOICE,
      status: FelDocumentStatus.DRAFT,
      commercialCurrency: composition.commercialCurrency,
      receiverName: composition.receiver.receiverName,
      receiverIdentifierType: composition.receiver.receiverIdentifierType,
      receiverIdentifier: composition.receiver.receiverIdentifier,
      receiverAddress: composition.receiver.receiverAddress,
      receiverEmail: composition.receiver.receiverEmail,
      receiverCountry: composition.receiver.receiverCountry,
      total: new Prisma.Decimal(composition.total),
      groupExtras: composition.groupExtras,
      createdByAdminId: adminUser.id,
    },
    select: { id: true },
  });

  await persistFelDraftComponents(transaction, document.id, composition);
  await createFelAuditLog(transaction, {
    adminUserId: adminUser.id,
    action: "FEL_DRAFT_CREATED",
    documentId: document.id,
    metadata: auditMetadataForComposition(composition),
  });

  return findFelDocumentDetail(transaction, document.id);
}

export async function createAdminFelDraft(
  input: CreateAdminFelDraftInput,
  actor: AdminActor,
): Promise<AdminFelDocumentDetail> {
  try {
    return await runAdminFelTransactionWithRetry((transaction) =>
      createAdminFelDraftInTransaction(transaction, input, actor),
    );
  } catch (error) {
    if (isAdminFelSourceConflict(error)) {
      throw new AdminFelError("ADMIN_FEL_SOURCE_ALREADY_ALLOCATED");
    }

    throw error;
  }
}

async function saveAdminFelDraftChangesInTransaction(
  transaction: FelTransactionClient,
  input: SaveAdminFelDraftChangesInput,
  actor: AdminActor,
): Promise<AdminFelDocumentDetail> {
  const documentId = input.documentId.trim();
  const reservationIds = normalizeReservationIds(input.reservationIds);
  const receiver = normalizeReceiverInput(input);
  const adminUser = await resolveAdminActor(transaction, actor);
  const document = await transaction.felDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!document) {
    throw new AdminFelError("ADMIN_FEL_DOCUMENT_NOT_FOUND");
  }

  ensureDraftEditable(document.status);
  await deleteDraftComponents(transaction, document.id);

  const records = await loadReservationRecords(transaction, reservationIds);
  const composition = buildFelDraftComposition({
    reservations: recordsToDraftSources(records, new Date()),
    receiver,
    groupExtras: input.groupExtras,
  });

  await transaction.felDocument.update({
    where: { id: document.id },
    data: {
      receiverName: composition.receiver.receiverName,
      receiverIdentifierType: composition.receiver.receiverIdentifierType,
      receiverIdentifier: composition.receiver.receiverIdentifier,
      receiverAddress: composition.receiver.receiverAddress,
      receiverEmail: composition.receiver.receiverEmail,
      receiverCountry: composition.receiver.receiverCountry,
      commercialCurrency: composition.commercialCurrency,
      total: new Prisma.Decimal(composition.total),
      groupExtras: composition.groupExtras,
    },
  });
  await persistFelDraftComponents(transaction, document.id, composition);
  await createFelAuditLog(transaction, {
    adminUserId: adminUser.id,
    action: "FEL_DRAFT_UPDATED",
    documentId: document.id,
    metadata: auditMetadataForComposition(composition),
  });

  return findFelDocumentDetail(transaction, document.id);
}

export async function saveAdminFelDraftChanges(
  input: SaveAdminFelDraftChangesInput,
  actor: AdminActor,
): Promise<AdminFelDocumentDetail> {
  try {
    return await runAdminFelTransactionWithRetry((transaction) =>
      saveAdminFelDraftChangesInTransaction(transaction, input, actor),
    );
  } catch (error) {
    if (isAdminFelSourceConflict(error)) {
      throw new AdminFelError("ADMIN_FEL_SOURCE_ALREADY_ALLOCATED");
    }

    throw error;
  }
}

export async function discardAdminFelDraft(
  input: DiscardAdminFelDraftInput,
  actor: AdminActor,
): Promise<Readonly<{ discardedDocumentId: string }>> {
  const documentId = input.documentId.trim();

  return runAdminFelTransactionWithRetry(async (transaction) => {
    const adminUser = await resolveAdminActor(transaction, actor);
    const document = await transaction.felDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        total: true,
        commercialCurrency: true,
        groupExtras: true,
        reservations: {
          select: {
            reservationId: true,
          },
        },
        lineItems: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!document) {
      throw new AdminFelError("ADMIN_FEL_DOCUMENT_NOT_FOUND");
    }

    ensureDraftEditable(document.status);
    await transaction.felDocument.delete({ where: { id: document.id } });
    await createFelAuditLog(transaction, {
      adminUserId: adminUser.id,
      action: "FEL_DRAFT_DISCARDED",
      documentId: document.id,
      metadata: {
        reservationIds: document.reservations.map(
          (reservation) => reservation.reservationId,
        ),
        groupExtras: document.groupExtras,
        lineCount: document.lineItems.length,
        total: decimalToMoney(document.total),
        commercialCurrency: document.commercialCurrency,
      },
    });

    return { discardedDocumentId: document.id };
  });
}
