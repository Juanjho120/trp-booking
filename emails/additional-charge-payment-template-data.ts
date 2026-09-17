import { z } from "zod";

import { siteConfig } from "@/config/site";
import { EmailTemplateDataError } from "@/emails/template-data";
import type { AdditionalChargePaymentRequiredEmailTemplateInput } from "@/types/additional-charge-email-template";
import { ADDITIONAL_CHARGE_CATEGORIES } from "@/types/additional-charge";
import type { TransactionalEmailLocale } from "@/types/email-provider";

const BUSINESS_TIME_ZONE = "America/Guatemala";
const localeTags = { es: "es-GT", en: "en-US" } as const;
const localeSchema = z.enum(["es", "en"]);
const amountSchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);
const dateTimeSchema = z.string().datetime({ offset: true });
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
  description: z.string().trim().min(1).max(1_000),
  amount: amountSchema,
  currency: currencySchema,
});

const inputSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: applicationUrlSchema,
  brandLogoUrl: assetUrlSchema,
  reservation: reservationSchema,
  paymentRequest: z.object({
    id: z.string().trim().min(1).max(128),
    totalAmount: amountSchema,
    currency: currencySchema,
    expiresAt: dateTimeSchema,
    paymentUrl: applicationUrlSchema,
    items: z.array(itemSchema).min(1).max(50),
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

export function buildAdditionalChargePaymentRequiredEmailView(
  input: AdditionalChargePaymentRequiredEmailTemplateInput,
) {
  const result = inputSchema.safeParse(input);
  if (!result.success) throw new EmailTemplateDataError();
  const parsed = result.data;

  if (
    parsed.locale !== parsed.reservation.preferredLocale ||
    parsed.reservation.currency !== parsed.paymentRequest.currency ||
    parsed.paymentRequest.items.some(
      (item) => item.currency !== parsed.paymentRequest.currency,
    )
  ) {
    throw new EmailTemplateDataError();
  }

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
    supportEmail:
      parsed.locale === "es"
        ? siteConfig.emails.reservationsEs
        : siteConfig.emails.reservationsEn,
    requestId: parsed.paymentRequest.id,
    totalAmount: formatMoney(
      parsed.paymentRequest.totalAmount,
      parsed.paymentRequest.currency,
      parsed.locale,
    ),
    expiresAt: formatDateTime(parsed.paymentRequest.expiresAt, parsed.locale),
    paymentUrl: parsed.paymentRequest.paymentUrl,
    items: parsed.paymentRequest.items.map((item) => ({
      category: item.category,
      description: item.description,
      amount: formatMoney(item.amount, item.currency, parsed.locale),
    })),
  } as const;
}
