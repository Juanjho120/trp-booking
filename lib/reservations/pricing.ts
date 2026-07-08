import {
  assertDateOnlyString,
  assertValidAvailabilityDateRange,
  dateOnlyToUtcDate,
} from "@/lib/availability/rules";
import { getPublicAccommodationById } from "@/lib/properties";
import type { AvailabilityDateRange } from "@/types/availability";
import type {
  ReservationQuote,
  ReservationQuoteAmount,
  ReservationQuoteCurrency,
  ReservationQuoteErrorCode,
  ReservationQuoteInput,
} from "@/types/reservation-quote";

const USD_CURRENCY: ReservationQuoteCurrency = "USD";
const ZERO_USD_CENTS = 0;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class ReservationQuoteError extends Error {
  readonly code: ReservationQuoteErrorCode;

  constructor(code: ReservationQuoteErrorCode) {
    super(code);
    this.name = "ReservationQuoteError";
    this.code = code;
  }
}

function assertReservationQuoteDateRange(input: ReservationQuoteInput): AvailabilityDateRange {
  try {
    assertDateOnlyString(input.checkInDate, "checkInDate");
    assertDateOnlyString(input.checkOutDate, "checkOutDate");

    const range: AvailabilityDateRange = {
      startDate: input.checkInDate,
      endDate: input.checkOutDate,
    };

    assertValidAvailabilityDateRange(range);

    return range;
  } catch {
    throw new ReservationQuoteError("INVALID_DATE_RANGE");
  }
}

function countNights(range: AvailabilityDateRange): number {
  const checkIn = dateOnlyToUtcDate(range.startDate);
  const checkOut = dateOnlyToUtcDate(range.endDate);
  const nights = (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY;

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new ReservationQuoteError("INVALID_DATE_RANGE");
  }

  return nights;
}

function usdToCents(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  const cents = Math.round(amountUsd * 100);

  if (!Number.isSafeInteger(cents)) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  return cents;
}

function toReservationQuoteAmount(amountCents: number): ReservationQuoteAmount {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  return {
    currency: USD_CURRENCY,
    amountCents,
    amount: (amountCents / 100).toFixed(2),
  };
}

function assertGuestCount(input: ReservationQuoteInput, maxGuests: number): void {
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    throw new ReservationQuoteError("INVALID_GUEST_COUNT");
  }

  if (input.guestCount > maxGuests) {
    throw new ReservationQuoteError("INVALID_GUEST_COUNT");
  }
}

export async function calculateReservationQuote(
  input: ReservationQuoteInput,
): Promise<ReservationQuote> {
  const accommodation = await getPublicAccommodationById(input.accommodationId);

  if (!accommodation) {
    throw new ReservationQuoteError("INVALID_ACCOMMODATION");
  }

  assertGuestCount(input, accommodation.maxGuests);

  const range = assertReservationQuoteDateRange(input);
  const nights = countNights(range);
  const nightlyRateCents = usdToCents(accommodation.baseNightlyPriceUsd);
  const subtotalCents = nightlyRateCents * nights;
  const cleaningFeeCents = ZERO_USD_CENTS;
  const taxesCents = ZERO_USD_CENTS;
  const discountsCents = ZERO_USD_CENTS;
  const totalCents = subtotalCents + cleaningFeeCents + taxesCents - discountsCents;

  if (totalCents < 0) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  return {
    accommodationId: accommodation.id,
    accommodationName: accommodation.name,
    accommodationSlug: accommodation.slug,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    guestCount: input.guestCount,
    maxGuests: accommodation.maxGuests,
    nights,
    nightlyRate: toReservationQuoteAmount(nightlyRateCents),
    subtotal: toReservationQuoteAmount(subtotalCents),
    cleaningFee: toReservationQuoteAmount(cleaningFeeCents),
    taxes: toReservationQuoteAmount(taxesCents),
    discounts: toReservationQuoteAmount(discountsCents),
    total: toReservationQuoteAmount(totalCents),
    currency: USD_CURRENCY,
    paymentRequired: true,
    quoteKind: "NON_BINDING",
  };
}
