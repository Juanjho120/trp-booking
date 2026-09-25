import { z } from "zod";

import {
  buildAbsoluteAdminNotificationTargetUrl,
  resolveAdminNotificationTarget,
} from "@/lib/admin-notifications";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type {
  AdminReviewSubmittedEmailTemplateInput,
  AdminReviewSubmittedEmailTemplateViewModel,
} from "@/types/admin-review-submitted-email-template";

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
const normalizedMultilineSchema = (
  minimumLength: number,
  maximumLength: number,
) =>
  z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(minimumLength).max(maximumLength));
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

const adminReviewSubmittedTemplateSchema = z.object({
  locale: localeSchema,
  publicBaseUrl: absoluteApplicationUrlSchema,
  brandLogoUrl: absoluteHttpsAssetUrlSchema,
  review: z.object({
    propertyNameEs: normalizedTextSchema(160),
    propertyNameEn: normalizedTextSchema(160),
    guestDisplayName: normalizedTextSchema(120),
    rating: z.number().int().min(1).max(5),
    comment: normalizedMultilineSchema(1, 2_000),
    submittedAt: z.string().datetime({ offset: true }),
  }),
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

export function buildAdminReviewSubmittedEmailTemplateViewModel(
  input: AdminReviewSubmittedEmailTemplateInput,
): AdminReviewSubmittedEmailTemplateViewModel {
  const parsedInput = adminReviewSubmittedTemplateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new EmailTemplateDataError();
  }

  const { locale, review } = parsedInput.data;
  const baseUrl = normalizeBaseUrl(parsedInput.data.publicBaseUrl);

  return {
    locale,
    propertyName:
      locale === "es" ? review.propertyNameEs : review.propertyNameEn,
    guestDisplayName: review.guestDisplayName,
    rating: `${review.rating} / 5`,
    comment: review.comment,
    submittedAt: formatGuatemalaTimestamp(review.submittedAt, locale),
    adminReviewsUrl: buildAbsoluteAdminNotificationTargetUrl(
      resolveAdminNotificationTarget({ kind: "reviews" }).targetPath,
      baseUrl,
    ),
    logoUrl: parsedInput.data.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
  };
}
