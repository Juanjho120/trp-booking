import { z } from "zod";

import { siteConfig } from "@/config/site";
import { EmailTemplateDataError } from "@/emails/template-data";
import type {
  AdditionalChargeAdminPaymentApprovedEmailTemplateInput,
  AdditionalChargeAdminPaymentRequiredEmailTemplateInput,
  AdditionalChargeAdminRefundProcessedEmailTemplateInput,
  AdditionalChargePaymentApprovedEmailTemplateInput,
  AdditionalChargePaymentRequiredEmailTemplateInput,
  AdditionalChargeRefundProcessedEmailTemplateInput,
} from "@/types/additional-charge-email-template";
import {
  ADDITIONAL_CHARGE_CATEGORIES,
  type AdditionalChargeCategory,
} from "@/types/additional-charge";
import type { TransactionalEmailLocale } from "@/types/email-provider";

const BUSINESS_TIME_ZONE = "America/Guatemala";
const localeTags = { es: "es-GT", en: "en-US" } as const;
const localeSchema = z.enum(["es", "en"]);
const amountSchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);
const dateTimeSchema = z.string().datetime({ offset: true });
const safeTextSchema = z.string().trim().min(1).max(1_000);
const optionalSafeTextSchema = z.string().trim().min(1).max(240).nullable();
const statusSchema = z.string().trim().min(1).max(80);
const applicationUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, context) => {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      context.addIssue({
        code: "custom",
        message: "Invalid application URL.",
      });
    }
  });
const assetUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, context) => {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      context.addIssue({
        code: "custom",
        message: "Invalid public asset URL.",
      });
    }
  });

const reservationSchema = z.object({
  id: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  guestName: z.string().trim().min(1).max(120),
  guestEmail: z
    .string()
    .trim()
    .email()
    .max(160)
    .transform((value) => value.toLowerCase()),
  preferredLocale: localeSchema,
  propertyNameEs: z.string().trim().min(1).max(160),
  propertyNameEn: z.string().trim().min(1).max(160),
  currency: currencySchema,
});

const itemSchema = z.object({
  category: z.enum(ADDITIONAL_CHARGE_CATEGORIES),
  description: safeTextSchema,
  amount: amountSchema,
  currency: currencySchema,
  status: statusSchema.nullish(),
});

const refundAllocationSchema = z.object({
  additionalChargeId: z.string().trim().min(1).max(128).nullish(),
  category: z.enum(ADDITIONAL_CHARGE_CATEGORIES),
  description: safeTextSchema,
  originalAmount: amountSchema,
  allocatedAmount: amountSchema,
  cumulativeRefundedAmount: amountSchema.nullish(),
  remainingAmount: amountSchema.nullish(),
  currency: currencySchema,
  resultingStatus: statusSchema.nullish(),
});

const baseInputSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: applicationUrlSchema,
  brandLogoUrl: assetUrlSchema,
  reservation: reservationSchema,
});

const paymentRequiredInputSchema = baseInputSchema.extend({
  paymentRequest: z.object({
    id: z.string().trim().min(1).max(128),
    totalAmount: amountSchema,
    currency: currencySchema,
    expiresAt: dateTimeSchema,
    paymentUrl: applicationUrlSchema,
    items: z.array(itemSchema).min(1).max(50),
  }),
});

const adminPaymentRequiredInputSchema = baseInputSchema.extend({
  paymentRequest: z.object({
    id: z.string().trim().min(1).max(128),
    totalAmount: amountSchema,
    currency: currencySchema,
    createdAt: dateTimeSchema,
    expiresAt: dateTimeSchema,
    status: statusSchema,
    createdByAdminName: optionalSafeTextSchema,
    createdByAdminEmail: optionalSafeTextSchema,
    intendedGuestRecipient: z.string().trim().email().max(160),
    items: z.array(itemSchema).min(1).max(50),
  }),
});

const paymentApprovedInputSchema = baseInputSchema.extend({
  payment: z.object({
    paidAt: dateTimeSchema,
    totalAmount: amountSchema,
    currency: currencySchema,
    items: z.array(itemSchema).min(1).max(50),
  }),
});

const adminPaymentApprovedInputSchema = baseInputSchema.extend({
  paymentRequest: z.object({
    id: z.string().trim().min(1).max(128),
    status: statusSchema,
  }),
  payment: z.object({
    id: z.string().trim().min(1).max(128),
    providerReference: optionalSafeTextSchema,
    paidAt: dateTimeSchema,
    status: statusSchema,
    totalAmount: amountSchema,
    currency: currencySchema,
    items: z.array(itemSchema).min(1).max(50),
  }),
});

const refundProcessedInputSchema = baseInputSchema.extend({
  refund: z.object({
    id: z.string().trim().min(1).max(128),
    totalAmount: amountSchema,
    currency: currencySchema,
    approvedAt: dateTimeSchema,
    allocations: z.array(refundAllocationSchema).min(1).max(50),
  }),
});

const adminRefundProcessedInputSchema = baseInputSchema.extend({
  guestPaymentRequestId: z.string().trim().min(1).max(128),
  refund: z.object({
    id: z.string().trim().min(1).max(128),
    paymentId: z.string().trim().min(1).max(128),
    paymentStatus: statusSchema,
    processingMode: statusSchema,
    providerRefundId: optionalSafeTextSchema,
    reason: optionalSafeTextSchema,
    requestedByAdminName: optionalSafeTextSchema,
    requestedByAdminEmail: optionalSafeTextSchema,
    totalAmount: amountSchema,
    currency: currencySchema,
    approvedAt: dateTimeSchema,
    allocations: z.array(refundAllocationSchema).min(1).max(50),
  }),
});

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.toString();
}

function formatDateTime(
  value: string,
  locale: TransactionalEmailLocale,
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function formatMoney(
  value: string,
  currency: string,
  locale: TransactionalEmailLocale,
): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function buildBaseView(parsed: z.infer<typeof baseInputSchema>) {
  const baseUrl = normalizeBaseUrl(parsed.publicBaseUrl);

  return {
    locale: parsed.locale,
    reservationId: parsed.reservation.id,
    guestName: parsed.reservation.guestName,
    guestEmail: parsed.reservation.guestEmail,
    propertyName:
      parsed.locale === "es"
        ? parsed.reservation.propertyNameEs
        : parsed.reservation.propertyNameEn,
    logoUrl: parsed.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
    adminReservationUrl: new URL(
      `/admin/reservations/${parsed.reservation.id}`,
      baseUrl,
    ).toString(),
    supportEmail:
      parsed.locale === "es"
        ? siteConfig.emails.reservationsEs
        : siteConfig.emails.reservationsEn,
  } as const;
}

function assertBaseIntegrity(parsed: z.infer<typeof baseInputSchema>): void {
  if (
    parsed.locale !== parsed.reservation.preferredLocale ||
    parsed.reservation.currency !== "USD"
  ) {
    throw new EmailTemplateDataError();
  }
}

function formatItems(
  items: readonly z.infer<typeof itemSchema>[],
  currency: string,
  locale: TransactionalEmailLocale,
) {
  if (items.some((item) => item.currency !== currency)) {
    throw new EmailTemplateDataError();
  }

  return items.map((item) => ({
    category: item.category as AdditionalChargeCategory,
    description: item.description,
    amount: formatMoney(item.amount, item.currency, locale),
    status: item.status ?? null,
  }));
}

function formatRefundAllocations(
  allocations: readonly z.infer<typeof refundAllocationSchema>[],
  currency: string,
  locale: TransactionalEmailLocale,
) {
  if (allocations.some((allocation) => allocation.currency !== currency)) {
    throw new EmailTemplateDataError();
  }

  return allocations.map((allocation) => ({
    additionalChargeId: allocation.additionalChargeId ?? null,
    category: allocation.category as AdditionalChargeCategory,
    description: allocation.description,
    originalAmount: formatMoney(allocation.originalAmount, currency, locale),
    allocatedAmount: formatMoney(allocation.allocatedAmount, currency, locale),
    cumulativeRefundedAmount: allocation.cumulativeRefundedAmount
      ? formatMoney(allocation.cumulativeRefundedAmount, currency, locale)
      : null,
    remainingAmount: allocation.remainingAmount
      ? formatMoney(allocation.remainingAmount, currency, locale)
      : null,
    resultingStatus: allocation.resultingStatus ?? null,
  }));
}

export function buildAdditionalChargePaymentRequiredEmailView(
  input: AdditionalChargePaymentRequiredEmailTemplateInput,
) {
  const result = paymentRequiredInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  if (
    parsed.reservation.currency !== parsed.paymentRequest.currency ||
    parsed.paymentRequest.items.some(
      (item) => item.currency !== parsed.paymentRequest.currency,
    )
  ) {
    throw new EmailTemplateDataError();
  }

  return {
    ...buildBaseView(parsed),
    requestId: parsed.paymentRequest.id,
    totalAmount: formatMoney(
      parsed.paymentRequest.totalAmount,
      parsed.paymentRequest.currency,
      parsed.locale,
    ),
    expiresAt: formatDateTime(parsed.paymentRequest.expiresAt, parsed.locale),
    paymentUrl: parsed.paymentRequest.paymentUrl,
    items: formatItems(
      parsed.paymentRequest.items,
      parsed.paymentRequest.currency,
      parsed.locale,
    ),
  } as const;
}

export function buildAdditionalChargeAdminPaymentRequiredEmailView(
  input: AdditionalChargeAdminPaymentRequiredEmailTemplateInput,
) {
  const result = adminPaymentRequiredInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  return {
    ...buildBaseView(parsed),
    requestId: parsed.paymentRequest.id,
    requestStatus: parsed.paymentRequest.status,
    createdAt: formatDateTime(parsed.paymentRequest.createdAt, parsed.locale),
    expiresAt: formatDateTime(parsed.paymentRequest.expiresAt, parsed.locale),
    totalAmount: formatMoney(
      parsed.paymentRequest.totalAmount,
      parsed.paymentRequest.currency,
      parsed.locale,
    ),
    intendedGuestRecipient: parsed.paymentRequest.intendedGuestRecipient,
    createdByAdmin:
      parsed.paymentRequest.createdByAdminName ??
      parsed.paymentRequest.createdByAdminEmail,
    items: formatItems(
      parsed.paymentRequest.items,
      parsed.paymentRequest.currency,
      parsed.locale,
    ),
  } as const;
}

export function buildAdditionalChargePaymentApprovedEmailView(
  input: AdditionalChargePaymentApprovedEmailTemplateInput,
) {
  const result = paymentApprovedInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  return {
    ...buildBaseView(parsed),
    paidAt: formatDateTime(parsed.payment.paidAt, parsed.locale),
    totalAmount: formatMoney(
      parsed.payment.totalAmount,
      parsed.payment.currency,
      parsed.locale,
    ),
    items: formatItems(parsed.payment.items, parsed.payment.currency, parsed.locale),
  } as const;
}

export function buildAdditionalChargeAdminPaymentApprovedEmailView(
  input: AdditionalChargeAdminPaymentApprovedEmailTemplateInput,
) {
  const result = adminPaymentApprovedInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  return {
    ...buildBaseView(parsed),
    requestId: parsed.paymentRequest.id,
    requestStatus: parsed.paymentRequest.status,
    paymentId: parsed.payment.id,
    providerReference: parsed.payment.providerReference,
    paymentStatus: parsed.payment.status,
    paidAt: formatDateTime(parsed.payment.paidAt, parsed.locale),
    totalAmount: formatMoney(
      parsed.payment.totalAmount,
      parsed.payment.currency,
      parsed.locale,
    ),
    items: formatItems(parsed.payment.items, parsed.payment.currency, parsed.locale),
  } as const;
}

export function buildAdditionalChargeRefundProcessedEmailView(
  input: AdditionalChargeRefundProcessedEmailTemplateInput,
) {
  const result = refundProcessedInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  return {
    ...buildBaseView(parsed),
    refundId: parsed.refund.id,
    approvedAt: formatDateTime(parsed.refund.approvedAt, parsed.locale),
    totalAmount: formatMoney(
      parsed.refund.totalAmount,
      parsed.refund.currency,
      parsed.locale,
    ),
    allocations: formatRefundAllocations(
      parsed.refund.allocations,
      parsed.refund.currency,
      parsed.locale,
    ),
  } as const;
}

export function buildAdditionalChargeAdminRefundProcessedEmailView(
  input: AdditionalChargeAdminRefundProcessedEmailTemplateInput,
) {
  const result = adminRefundProcessedInputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  assertBaseIntegrity(parsed);

  return {
    ...buildBaseView(parsed),
    guestPaymentRequestId: parsed.guestPaymentRequestId,
    refundId: parsed.refund.id,
    paymentId: parsed.refund.paymentId,
    paymentStatus: parsed.refund.paymentStatus,
    processingMode: parsed.refund.processingMode,
    providerRefundId: parsed.refund.providerRefundId,
    reason: parsed.refund.reason,
    requestedByAdmin:
      parsed.refund.requestedByAdminName ?? parsed.refund.requestedByAdminEmail,
    approvedAt: formatDateTime(parsed.refund.approvedAt, parsed.locale),
    totalAmount: formatMoney(
      parsed.refund.totalAmount,
      parsed.refund.currency,
      parsed.locale,
    ),
    allocations: formatRefundAllocations(
      parsed.refund.allocations,
      parsed.refund.currency,
      parsed.locale,
    ),
  } as const;
}
