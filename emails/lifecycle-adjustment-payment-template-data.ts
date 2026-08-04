import { z } from "zod";

import { siteConfig } from "@/config/site";
import { EmailTemplateDataError } from "@/emails/template-data";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type {
  AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
  LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
} from "@/types/lifecycle-email-template";

const BUSINESS_TIME_ZONE = "America/Guatemala";
const localeTags = { es: "es-GT", en: "en-US" } as const;
const localeSchema = z.enum(["es", "en"]);
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTimeSchema = z.string().datetime({ offset: true });
const amountSchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);
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
const baseSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: applicationUrlSchema,
  brandLogoUrl: assetUrlSchema,
  reservation: reservationSchema,
});
const paymentRequiredSchema = baseSchema.extend({
  paymentRequest: z.object({
    requestType: z.enum(["DATE_CHANGE", "STAY_EXTENSION"]),
    originalCheckInDate: dateOnlySchema,
    originalCheckOutDate: dateOnlySchema,
    requestedCheckInDate: dateOnlySchema,
    requestedCheckOutDate: dateOnlySchema,
    amount: amountSchema,
    holdExpiresAt: dateTimeSchema,
    paymentUrl: applicationUrlSchema,
  }),
});
const adminDeliverySchema = baseSchema.extend({
  delivery: z.object({
    requestType: z.enum(["DATE_CHANGE", "STAY_EXTENSION"]),
    outcome: z.enum(["SENT", "FAILED"]),
    intendedGuestRecipient: z
      .string()
      .trim()
      .email()
      .max(160)
      .transform((value) => value.toLowerCase()),
    sourceNotificationId: z.string().trim().min(1).max(128),
    attemptCount: z.number().int().min(1).max(100),
    observedAt: dateTimeSchema,
    errorCode: z.string().trim().max(120).nullable().optional(),
  }),
});

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
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

function buildBaseView(input: z.infer<typeof baseSchema>) {
  const baseUrl = normalizeBaseUrl(input.publicBaseUrl);
  return {
    locale: input.locale,
    reservationId: input.reservation.id,
    guestName: input.reservation.guestName,
    guestEmail: input.reservation.guestEmail,
    guestPreferredLocale: input.reservation.preferredLocale,
    propertyName:
      input.locale === "es"
        ? input.reservation.propertyNameEs
        : input.reservation.propertyNameEn,
    logoUrl: input.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
    adminReservationUrl: new URL(
      `/admin/reservations/${encodeURIComponent(input.reservation.id)}`,
      baseUrl,
    ).toString(),
    supportEmail:
      input.locale === "es"
        ? siteConfig.emails.reservationsEs
        : siteConfig.emails.reservationsEn,
  } as const;
}

export function buildLifecycleAdjustmentPaymentRequiredEmailView(
  input: LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
) {
  const result = paymentRequiredSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;
  if (parsed.locale !== parsed.reservation.preferredLocale) {
    throw new EmailTemplateDataError();
  }

  return {
    ...buildBaseView(parsed),
    requestType: parsed.paymentRequest.requestType,
    originalCheckInDate: formatDate(
      parsed.paymentRequest.originalCheckInDate,
      parsed.locale,
    ),
    originalCheckOutDate: formatDate(
      parsed.paymentRequest.originalCheckOutDate,
      parsed.locale,
    ),
    requestedCheckInDate: formatDate(
      parsed.paymentRequest.requestedCheckInDate,
      parsed.locale,
    ),
    requestedCheckOutDate: formatDate(
      parsed.paymentRequest.requestedCheckOutDate,
      parsed.locale,
    ),
    amount: formatMoney(
      parsed.paymentRequest.amount,
      parsed.reservation.currency,
      parsed.locale,
    ),
    holdExpiresAt: formatDateTime(
      parsed.paymentRequest.holdExpiresAt,
      parsed.locale,
    ),
    paymentUrl: parsed.paymentRequest.paymentUrl,
  } as const;
}

export function buildAdminLifecycleAdjustmentPaymentDeliveryStatusEmailView(
  input: AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
) {
  const result = adminDeliverySchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;

  return {
    ...buildBaseView(parsed),
    requestType: parsed.delivery.requestType,
    outcome: parsed.delivery.outcome,
    intendedGuestRecipient: parsed.delivery.intendedGuestRecipient,
    sourceNotificationId: parsed.delivery.sourceNotificationId,
    attemptCount: parsed.delivery.attemptCount,
    observedAt: formatDateTime(parsed.delivery.observedAt, parsed.locale),
    errorCode: parsed.delivery.errorCode ?? null,
  } as const;
}
