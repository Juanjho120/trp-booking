import { z } from "zod";

import { siteConfig } from "@/config/site";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type {
  ArrivalInstructionsEmailTemplateInput,
  ArrivalInstructionsEmailTemplateViewModel,
  ReservationEmailTemplateInput,
  ReservationEmailTemplateViewModel,
} from "@/types/email-template";

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
const reservationIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  })
  .transform(
    (value): `${number}-${number}-${number}` =>
      value as `${number}-${number}-${number}`,
  );
const arrivalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const amountSchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/);
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

const optionalNormalizedTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}, z.string().max(160).nullable());

const normalizedMultilineSchema = (minimumLength: number, maximumLength: number) =>
  z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(minimumLength).max(maximumLength));

const optionalHttpsUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}, z.string().url().superRefine((value, context) => {
  const url = new URL(value);

  if (url.protocol !== "https:" || url.username || url.password) {
    context.addIssue({
      code: "custom",
      message: "Must use HTTPS without URL credentials.",
    });
  }
}).nullable());

const reservationTemplateSchema = z
  .object({
    locale: localeSchema,
    publicBaseUrl: absoluteApplicationUrlSchema,
    brandLogoUrl: absoluteHttpsAssetUrlSchema,
    reservation: z.object({
      id: reservationIdSchema,
      guestName: normalizedTextSchema(120),
      guestEmail: z
        .string()
        .trim()
        .email()
        .max(160)
        .transform((value) => value.toLowerCase()),
      guestPhone: optionalNormalizedTextSchema,
      guestCountry: optionalNormalizedTextSchema,
      preferredLocale: localeSchema,
      propertyNameEs: normalizedTextSchema(160),
      propertyNameEn: normalizedTextSchema(160),
      checkInDate: dateOnlySchema,
      checkOutDate: dateOnlySchema,
      guestCount: z.number().int().min(1).max(100),
      arrivalTimeEstimate: z.preprocess(
        (value) =>
          typeof value === "string" && value.trim() ? value.trim() : null,
        arrivalTimeSchema.nullable(),
      ),
      total: amountSchema,
      currency: currencySchema,
      confirmedAt: z.string().datetime({ offset: true }),
    }),
  })
  .superRefine((input, context) => {
    if (input.reservation.checkOutDate <= input.reservation.checkInDate) {
      context.addIssue({
        code: "custom",
        path: ["reservation", "checkOutDate"],
        message: "Check-out must be after check-in.",
      });
    }
  });

const arrivalInstructionsTemplateSchema = reservationTemplateSchema.safeExtend({
  arrival: z.object({
    checkInTime: arrivalTimeSchema,
    exactAddress: normalizedMultilineSchema(5, 500),
    mapUrl: optionalHttpsUrlSchema,
    instructions: normalizedMultilineSchema(20, 5_000),
  }),
});

export class EmailTemplateDataError extends Error {
  readonly code = "EMAIL_TEMPLATE_INVALID_DATA" as const;

  constructor() {
    super("Transactional email template data is invalid.");
    this.name = "EmailTemplateDataError";
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";

  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function formatDateOnly(
  value: string,
  locale: TransactionalEmailLocale,
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(parseDateOnly(value));
}

function calculateNights(checkInDate: string, checkOutDate: string): number {
  const milliseconds =
    parseDateOnly(checkOutDate).getTime() -
    parseDateOnly(checkInDate).getTime();

  return Math.round(milliseconds / 86_400_000);
}

function formatArrivalTime(
  value: string | null,
  locale: TransactionalEmailLocale,
): string | null {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  const time = new Date(Date.UTC(2000, 0, 1, hours, minutes));

  return new Intl.DateTimeFormat(localeTags[locale], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(time);
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

function formatConfirmedAt(
  value: string,
  locale: TransactionalEmailLocale,
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function formatGuestCountry(
  value: string | null,
  locale: TransactionalEmailLocale,
): string | null {
  if (!value || !/^[A-Za-z]{2}$/.test(value)) {
    return value;
  }

  try {
    return (
      new Intl.DisplayNames([localeTags[locale]], {
        type: "region",
      }).of(value.toUpperCase()) ?? value.toUpperCase()
    );
  } catch {
    return value.toUpperCase();
  }
}

function getSupportEmail(locale: TransactionalEmailLocale): string {
  return locale === "es"
    ? siteConfig.emails.reservationsEs
    : siteConfig.emails.reservationsEn;
}

export function buildReservationEmailTemplateViewModel(
  input: ReservationEmailTemplateInput,
): ReservationEmailTemplateViewModel {
  const parsedInput = reservationTemplateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new EmailTemplateDataError();
  }

  const { locale, reservation } = parsedInput.data;
  const baseUrl = normalizeBaseUrl(parsedInput.data.publicBaseUrl);

  return {
    locale,
    localeTag: localeTags[locale],
    reservationId: reservation.id,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    guestCountry: formatGuestCountry(reservation.guestCountry, locale),
    guestPreferredLocale: reservation.preferredLocale,
    propertyName:
      locale === "es" ? reservation.propertyNameEs : reservation.propertyNameEn,
    checkInDate: formatDateOnly(reservation.checkInDate, locale),
    checkOutDate: formatDateOnly(reservation.checkOutDate, locale),
    nights: calculateNights(reservation.checkInDate, reservation.checkOutDate),
    guestCount: reservation.guestCount,
    arrivalTimeEstimate: formatArrivalTime(
      reservation.arrivalTimeEstimate,
      locale,
    ),
    total: formatMoney(reservation.total, reservation.currency, locale),
    confirmedAt: formatConfirmedAt(reservation.confirmedAt, locale),
    logoUrl: parsedInput.data.brandLogoUrl,
    publicHomeUrl: new URL("/", baseUrl).toString(),
    adminReservationUrl: new URL(
      `/admin/reservations/${encodeURIComponent(reservation.id)}`,
      baseUrl,
    ).toString(),
    supportEmail: getSupportEmail(locale),
  };
}

export function buildArrivalInstructionsEmailTemplateViewModel(
  input: ArrivalInstructionsEmailTemplateInput,
): ArrivalInstructionsEmailTemplateViewModel {
  const parsedInput = arrivalInstructionsTemplateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new EmailTemplateDataError();
  }

  const reservationViewModel = buildReservationEmailTemplateViewModel(
    parsedInput.data,
  );
  const checkInTime = formatArrivalTime(
    parsedInput.data.arrival.checkInTime,
    parsedInput.data.locale,
  );

  if (!checkInTime) {
    throw new EmailTemplateDataError();
  }

  return {
    ...reservationViewModel,
    checkInTime,
    exactAddress: parsedInput.data.arrival.exactAddress,
    mapUrl: parsedInput.data.arrival.mapUrl,
    instructions: parsedInput.data.arrival.instructions,
  };
}

