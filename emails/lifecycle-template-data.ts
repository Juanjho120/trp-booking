import { z } from "zod";

import { siteConfig } from "@/config/site";
import { EmailTemplateDataError } from "@/emails/template-data";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type {
  RefundProcessedEmailTemplateInput,
  ReservationCancelledEmailTemplateInput,
  ReservationDatesUpdatedEmailTemplateInput,
  StayExtensionConfirmedEmailTemplateInput,
} from "@/types/lifecycle-email-template";

const BUSINESS_TIME_ZONE = "America/Guatemala";
const localeTags = { es: "es-GT", en: "en-US" } as const;

const normalizedText = (max: number) =>
  z.string().trim().min(1).max(max).transform((value: string) => value.replace(/\s+/g, " "));
const optionalText = (max: number) =>
  z.preprocess(
    (value: unknown) =>
      typeof value === "string" && value.trim()
        ? value.trim().replace(/\s+/g, " ")
        : null,
    z.string().max(max).nullable(),
  );
const localeSchema = z.enum(["es", "en"]);
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });
const amountSchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const signedAmountSchema = z.string().regex(/^-?\d{1,8}(?:\.\d{1,2})?$/);
const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);
const dateTimeSchema = z.string().datetime({ offset: true });
const applicationUrlSchema = z.string().trim().url().superRefine((value: string, context: z.RefinementCtx) => {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    context.addIssue({ code: "custom", message: "Invalid application URL." });
  }
});
const assetUrlSchema = z.string().trim().url().superRefine((value: string, context: z.RefinementCtx) => {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    context.addIssue({ code: "custom", message: "Invalid public asset URL." });
  }
});
const reservationSchema = z.object({
  id: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  guestName: normalizedText(120),
  guestEmail: z.string().trim().email().max(160).transform((value: string) => value.toLowerCase()),
  preferredLocale: localeSchema,
  propertyNameEs: normalizedText(160),
  propertyNameEn: normalizedText(160),
  currency: currencySchema,
});
const baseSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: applicationUrlSchema,
  brandLogoUrl: assetUrlSchema,
  reservation: reservationSchema,
});
const adminContextSchema = z.object({
  channel: z.enum(["EMAIL", "PHONE", "WHATSAPP", "OTHER"]),
  requestNote: optionalText(2_000),
  createdByAdminName: optionalText(160),
  reviewedByAdminName: optionalText(160),
  decisionNote: optionalText(2_000),
});

const cancellationSchema = baseSchema.extend({
  cancellation: z.object({
    checkInDate: dateOnlySchema,
    checkOutDate: dateOnlySchema,
    cancelledAt: dateTimeSchema,
    policyReasonCode: z.enum([
      "AT_LEAST_168_HOURS",
      "BETWEEN_72_AND_168_HOURS",
      "LESS_THAN_72_HOURS",
      "NOT_APPLICABLE",
    ]),
    refundPercentage: z.number().int().min(0).max(100),
    refundAmount: amountSchema,
    refundExpected: z.boolean(),
  }),
  admin: adminContextSchema.optional(),
});
const dateChangeSchema = baseSchema.extend({
  dateChange: z.object({
    originalCheckInDate: dateOnlySchema,
    originalCheckOutDate: dateOnlySchema,
    requestedCheckInDate: dateOnlySchema,
    requestedCheckOutDate: dateOnlySchema,
    originalTotal: amountSchema,
    requestedTotal: amountSchema,
    financialDifference: signedAmountSchema,
    completedAt: dateTimeSchema,
    adjustmentPaymentStatus: z
      .enum(["PENDING", "APPROVED", "REJECTED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
      .nullable()
      .optional(),
    refundStatus: z.enum(["PENDING", "PROCESSING", "APPROVED", "FAILED", "MANUAL"]).nullable().optional(),
    refundAmount: amountSchema.nullable().optional(),
  }),
  admin: adminContextSchema.optional(),
});
const extensionSchema = baseSchema.extend({
  extension: z.object({
    checkInDate: dateOnlySchema,
    originalCheckOutDate: dateOnlySchema,
    requestedCheckOutDate: dateOnlySchema,
    addedNights: z.number().int().min(1).max(365),
    originalTotal: amountSchema,
    additionalAmount: amountSchema,
    requestedTotal: amountSchema,
    completedAt: dateTimeSchema,
    adjustmentPaymentStatus: z
      .enum(["PENDING", "APPROVED", "REJECTED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
      .nullable()
      .optional(),
    holdStatus: z.enum(["ACTIVE", "RELEASED", "EXPIRED"]).nullable().optional(),
  }),
  admin: adminContextSchema.optional(),
});
const refundSchema = baseSchema.extend({
  refund: z.object({
    amount: amountSchema,
    approvedAt: dateTimeSchema,
    authorizationType: z.enum(["STANDARD_POLICY", "EXTRAORDINARY", "LIFECYCLE_ADJUSTMENT"]),
    processingMode: z.enum(["TILOPAY_API", "TILOPAY_PORTAL_FALLBACK", "LEGACY_UNSPECIFIED"]),
    paymentStatus: z.enum(["REFUNDED", "PARTIALLY_REFUNDED"]),
    providerRefundId: optionalText(160),
    reason: optionalText(500),
    operation: z
      .object({
        key: normalizedText(240),
        movementCount: z.number().int().min(2).max(100),
        approvedMovementCount: z.number().int().min(0).max(100),
        requestedAmount: amountSchema,
      })
      .nullable()
      .optional(),
  }),
  admin: z
    .object({
      requestedByAdminName: optionalText(160),
      reconciledByAdminName: optionalText(160),
    })
    .optional(),
});

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return url.toString();
}

function formatDate(value: string, locale: TransactionalEmailLocale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatDateTime(value: string, locale: TransactionalEmailLocale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function formatMoney(value: string, currency: string, locale: TransactionalEmailLocale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function buildBaseView(input: z.infer<typeof baseSchema>) {
  const baseUrl = normalizeBaseUrl(input.publicBaseUrl);
  const { locale, reservation } = input;
  return {
    locale,
    reservationId: reservation.id,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPreferredLocale: reservation.preferredLocale,
    propertyName: locale === "es" ? reservation.propertyNameEs : reservation.propertyNameEn,
    logoUrl: input.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
    adminReservationUrl: new URL(
      `/admin/reservations/${encodeURIComponent(reservation.id)}`,
      baseUrl,
    ).toString(),
    supportEmail:
      locale === "es" ? siteConfig.emails.reservationsEs : siteConfig.emails.reservationsEn,
  };
}

export function buildReservationCancelledEmailView(input: ReservationCancelledEmailTemplateInput) {
  const parsedInput = cancellationSchema.safeParse(input);
  if (!parsedInput.success) throw new EmailTemplateDataError();
  const parsed = parsedInput.data as ReservationCancelledEmailTemplateInput;
  return {
    ...buildBaseView(parsed),
    checkInDate: formatDate(parsed.cancellation.checkInDate, parsed.locale),
    checkOutDate: formatDate(parsed.cancellation.checkOutDate, parsed.locale),
    cancelledAt: formatDateTime(parsed.cancellation.cancelledAt, parsed.locale),
    policyReasonCode: parsed.cancellation.policyReasonCode,
    refundPercentage: parsed.cancellation.refundPercentage,
    refundAmount: formatMoney(parsed.cancellation.refundAmount, parsed.reservation.currency, parsed.locale),
    refundExpected: parsed.cancellation.refundExpected,
    admin: parsed.admin,
  };
}

export function buildReservationDatesUpdatedEmailView(input: ReservationDatesUpdatedEmailTemplateInput) {
  const parsedInput = dateChangeSchema.safeParse(input);
  if (!parsedInput.success) throw new EmailTemplateDataError();
  const parsed = parsedInput.data as ReservationDatesUpdatedEmailTemplateInput;
  const difference = Number(parsed.dateChange.financialDifference);
  const financialBranch =
    difference > 0 ? "POSITIVE" : difference < 0 ? "NEGATIVE" : "ZERO";
  return {
    ...buildBaseView(parsed),
    financialBranch,
    originalCheckInDate: formatDate(parsed.dateChange.originalCheckInDate, parsed.locale),
    originalCheckOutDate: formatDate(parsed.dateChange.originalCheckOutDate, parsed.locale),
    requestedCheckInDate: formatDate(parsed.dateChange.requestedCheckInDate, parsed.locale),
    requestedCheckOutDate: formatDate(parsed.dateChange.requestedCheckOutDate, parsed.locale),
    originalTotal: formatMoney(parsed.dateChange.originalTotal, parsed.reservation.currency, parsed.locale),
    requestedTotal: formatMoney(parsed.dateChange.requestedTotal, parsed.reservation.currency, parsed.locale),
    financialDifference: formatMoney(
      parsed.dateChange.financialDifference,
      parsed.reservation.currency,
      parsed.locale,
    ),
    completedAt: formatDateTime(parsed.dateChange.completedAt, parsed.locale),
    adjustmentPaymentStatus: parsed.dateChange.adjustmentPaymentStatus ?? null,
    refundStatus: parsed.dateChange.refundStatus ?? null,
    refundAmount: parsed.dateChange.refundAmount
      ? formatMoney(parsed.dateChange.refundAmount, parsed.reservation.currency, parsed.locale)
      : null,
    admin: parsed.admin,
  };
}

export function buildStayExtensionConfirmedEmailView(input: StayExtensionConfirmedEmailTemplateInput) {
  const parsedInput = extensionSchema.safeParse(input);
  if (!parsedInput.success) throw new EmailTemplateDataError();
  const parsed = parsedInput.data as StayExtensionConfirmedEmailTemplateInput;
  return {
    ...buildBaseView(parsed),
    checkInDate: formatDate(parsed.extension.checkInDate, parsed.locale),
    originalCheckOutDate: formatDate(parsed.extension.originalCheckOutDate, parsed.locale),
    requestedCheckOutDate: formatDate(parsed.extension.requestedCheckOutDate, parsed.locale),
    addedNights: parsed.extension.addedNights,
    originalTotal: formatMoney(parsed.extension.originalTotal, parsed.reservation.currency, parsed.locale),
    additionalAmount: formatMoney(parsed.extension.additionalAmount, parsed.reservation.currency, parsed.locale),
    requestedTotal: formatMoney(parsed.extension.requestedTotal, parsed.reservation.currency, parsed.locale),
    completedAt: formatDateTime(parsed.extension.completedAt, parsed.locale),
    adjustmentPaymentStatus: parsed.extension.adjustmentPaymentStatus ?? null,
    holdStatus: parsed.extension.holdStatus ?? null,
    admin: parsed.admin,
  };
}

export function buildRefundProcessedEmailView(input: RefundProcessedEmailTemplateInput) {
  const parsedInput = refundSchema.safeParse(input);
  if (!parsedInput.success) throw new EmailTemplateDataError();
  const parsed = parsedInput.data as RefundProcessedEmailTemplateInput;
  return {
    ...buildBaseView(parsed),
    amount: formatMoney(parsed.refund.amount, parsed.reservation.currency, parsed.locale),
    approvedAt: formatDateTime(parsed.refund.approvedAt, parsed.locale),
    authorizationType: parsed.refund.authorizationType,
    processingMode: parsed.refund.processingMode,
    paymentStatus: parsed.refund.paymentStatus,
    providerRefundId: parsed.refund.providerRefundId,
    reason: parsed.refund.reason,
    operation: parsed.refund.operation
      ? {
          ...parsed.refund.operation,
          requestedAmount: formatMoney(
            parsed.refund.operation.requestedAmount,
            parsed.reservation.currency,
            parsed.locale,
          ),
        }
      : null,
    admin: parsed.admin,
  };
}
