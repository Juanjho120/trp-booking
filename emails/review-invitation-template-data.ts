import { z } from "zod";

import { siteConfig } from "@/config/site";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type {
  ReviewInvitationEmailTemplateInput,
  ReviewInvitationEmailTemplateViewModel,
} from "@/types/review-invitation-email-template";

import { EmailTemplateDataError } from "./template-data";

const BUSINESS_TIME_ZONE = "America/Guatemala";
const localeTags = {
  es: "es-GT",
  en: "en-US",
} as const;

const localeSchema = z.enum(["es", "en"]);
const normalizedTextSchema = (maximumLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximumLength)
    .transform((value) => value.replace(/\s+/g, " "));
const absoluteApplicationUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, context) => {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      context.addIssue({
        code: "custom",
        message: "Must use HTTP or HTTPS.",
      });
    }

    if (url.username || url.password) {
      context.addIssue({
        code: "custom",
        message: "Must not include URL credentials.",
      });
    }
  });
const absoluteHttpsAssetUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, context) => {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      context.addIssue({
        code: "custom",
        message: "Must use HTTPS.",
      });
    }

    if (url.username || url.password) {
      context.addIssue({
        code: "custom",
        message: "Must not include URL credentials.",
      });
    }

    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      context.addIssue({
        code: "custom",
        message: "Must use a publicly reachable host.",
      });
    }
  });
const reviewUrlSchema = absoluteApplicationUrlSchema.superRefine(
  (value, context) => {
    const url = new URL(value);

    if (!/^\/resenas\/[a-f0-9]{64}$/.test(url.pathname)) {
      context.addIssue({
        code: "custom",
        message: "Must point to the private review invitation path.",
      });
    }

    if (url.search || url.hash) {
      context.addIssue({
        code: "custom",
        message: "Must not include query string or fragment.",
      });
    }
  },
);

const reviewInvitationTemplateSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: absoluteApplicationUrlSchema,
  brandLogoUrl: absoluteHttpsAssetUrlSchema,
  guestName: normalizedTextSchema(120),
  propertyNameEs: normalizedTextSchema(160),
  propertyNameEn: normalizedTextSchema(160),
  checkoutAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  reviewUrl: reviewUrlSchema,
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

function formatGuatemalaTimestamp(
  value: string,
  locale: TransactionalEmailLocale,
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function getSupportEmail(locale: TransactionalEmailLocale): string {
  return locale === "es"
    ? siteConfig.emails.reservationsEs
    : siteConfig.emails.reservationsEn;
}

export function buildReviewInvitationEmailTemplateViewModel(
  input: ReviewInvitationEmailTemplateInput,
): ReviewInvitationEmailTemplateViewModel {
  const parsedInput = reviewInvitationTemplateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new EmailTemplateDataError();
  }

  const { locale } = parsedInput.data;
  const baseUrl = normalizeBaseUrl(parsedInput.data.publicBaseUrl);

  return {
    locale,
    guestName: parsedInput.data.guestName,
    propertyName:
      locale === "es"
        ? parsedInput.data.propertyNameEs
        : parsedInput.data.propertyNameEn,
    checkoutAt: formatGuatemalaTimestamp(parsedInput.data.checkoutAt, locale),
    expiresAt: formatGuatemalaTimestamp(parsedInput.data.expiresAt, locale),
    reviewUrl: parsedInput.data.reviewUrl,
    logoUrl: parsedInput.data.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
    supportEmail: getSupportEmail(locale),
  };
}
