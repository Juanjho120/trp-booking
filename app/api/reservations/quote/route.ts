import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateReservationQuote, ReservationQuoteError } from "@/lib/reservations";
import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";
import type { AccommodationId } from "@/types/accommodation";
import { isDateOnlyString } from "@/lib/availability/rules";
import { defaultLocale, locales, type Locale } from "@/types/locale";
import type { DateOnlyString } from "@/types/availability";
import type {
  ReservationQuote,
  ReservationQuoteErrorCode,
} from "@/types/reservation-quote";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const accommodationIdSchema = z.enum([
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
]);

const quoteRequestSchema = z.object({
  accommodationId: accommodationIdSchema,
  checkInDate: z.string().refine(isDateOnlyString),
  checkOutDate: z.string().refine(isDateOnlyString),
  guestCount: z.coerce.number().int().min(1),
});

type ReservationQuoteSuccessResponse = Readonly<{
  quote: ReservationQuote;
}>;

type ReservationQuoteErrorResponse = Readonly<{
  error: Readonly<{
    code: ReservationQuoteErrorCode;
    message: string;
  }>;
}>;

function parseLocale(value: string | null): Locale {
  if (locales.includes(value as Locale)) {
    return value as Locale;
  }

  return defaultLocale;
}

function getReservationQuoteErrorMessage(
  code: ReservationQuoteErrorCode,
  locale: Locale,
): string {
  const messages = locale === "en" ? enMessages : esMessages;

  switch (code) {
    case "INVALID_ACCOMMODATION":
      return messages.errors.reservation.invalidAccommodation;
    case "INVALID_DATE_RANGE":
      return messages.errors.reservation.invalidDateRange;
    case "INVALID_GUEST_COUNT":
      return messages.errors.reservation.invalidGuestCount;
    case "INVALID_QUOTE_REQUEST":
    default:
      return messages.errors.reservation.invalidQuoteRequest;
  }
}

function getErrorCode(error: unknown): ReservationQuoteErrorCode {
  if (error instanceof ReservationQuoteError) {
    return error.code;
  }

  return "INVALID_QUOTE_REQUEST";
}

export async function GET(
  request: Request,
): Promise<NextResponse<ReservationQuoteSuccessResponse | ReservationQuoteErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const locale = parseLocale(searchParams.get("locale"));

  try {
    const parsedRequest = quoteRequestSchema.parse({
      accommodationId: searchParams.get("accommodationId"),
      checkInDate: searchParams.get("checkInDate"),
      checkOutDate: searchParams.get("checkOutDate"),
      guestCount: searchParams.get("guestCount"),
    });

    const quote = calculateReservationQuote({
      accommodationId: parsedRequest.accommodationId as AccommodationId,
      checkInDate: parsedRequest.checkInDate as DateOnlyString,
      checkOutDate: parsedRequest.checkOutDate as DateOnlyString,
      guestCount: parsedRequest.guestCount,
    });

    return NextResponse.json({
      quote,
    });
  } catch (error) {
    const code = getErrorCode(error);

    return NextResponse.json(
      {
        error: {
          code,
          message: getReservationQuoteErrorMessage(code, locale),
        },
      },
      {
        status: 400,
      },
    );
  }
}
