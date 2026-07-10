import { Prisma, ReservationStatus } from "@prisma/client";

import { checkAccommodationAvailability } from "@/lib/availability/service";
import { prisma } from "@/lib/db/prisma";
import { calculateReservationQuote, ReservationQuoteError } from "@/lib/reservations/pricing";
import type { AccommodationId, LocalizedText } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type {
  ReservationQuote,
  ReservationQuoteAmount,
  ReservationQuoteCurrency,
} from "@/types/reservation-quote";
import type {
  CreatePendingReservationHoldInput,
  PendingReservationHold,
} from "@/types/reservation-pending-hold";

export const PENDING_RESERVATION_HOLD_DURATION_MINUTES = 15;

export type PendingReservationHoldErrorCode =
  | "INVALID_PENDING_HOLD_REQUEST"
  | "INVALID_ACCOMMODATION"
  | "INVALID_DATE_RANGE"
  | "INVALID_GUEST_COUNT"
  | "UNAVAILABLE_DATES"
  | "PENDING_HOLD_CONFLICT";

export class PendingReservationHoldError extends Error {
  readonly code: PendingReservationHoldErrorCode;

  constructor(code: PendingReservationHoldErrorCode) {
    super(code);
    this.name = "PendingReservationHoldError";
    this.code = code;
  }
}

const reusablePendingReservationSelect = {
  id: true,
  propertyId: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  status: true,
  subtotal: true,
  cleaningFee: true,
  taxes: true,
  discounts: true,
  total: true,
  currency: true,
  expiresAt: true,
} satisfies Prisma.ReservationSelect;

type ReusablePendingReservation = Prisma.ReservationGetPayload<{
  select: typeof reusablePendingReservationSelect;
}>;

type PendingHoldTransactionClient = Prisma.TransactionClient;

function toDateOnlyDate(date: DateOnlyString): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateOnlyString(date: Date): DateOnlyString {
  return date.toISOString().slice(0, 10) as DateOnlyString;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCountry(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDialCode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function normalizePhoneLocal(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildGuestPhone(countryDialCode: string, guestPhoneLocal: string): string {
  return `${countryDialCode} ${guestPhoneLocal}`.trim();
}

function buildExpiresAt(now: Date): Date {
  return new Date(now.getTime() + PENDING_RESERVATION_HOLD_DURATION_MINUTES * 60 * 1000);
}

function isValidArrivalTime(value: string): boolean {
  if (!/^([01]\d|2[0-2]):(00|30)$/.test(value)) {
    return false;
  }

  return value !== "22:30";
}

function assertGuestDetails(input: CreatePendingReservationHoldInput): void {
  if (normalizeText(input.guestName).length < 2) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  if (normalizeEmail(input.guestEmail).length < 5) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  if (!/^[A-Z]{2}$/i.test(input.guestCountry.trim())) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  if (!/^\+[1-9]\d{0,4}$/.test(normalizeDialCode(input.countryDialCode))) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  if (normalizePhoneLocal(input.guestPhoneLocal).length < 4) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  if (!isValidArrivalTime(input.arrivalTimeEstimate.trim())) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }
}

function mapQuoteError(error: ReservationQuoteError): PendingReservationHoldError {
  switch (error.code) {
    case "INVALID_ACCOMMODATION":
      return new PendingReservationHoldError("INVALID_ACCOMMODATION");
    case "INVALID_DATE_RANGE":
      return new PendingReservationHoldError("INVALID_DATE_RANGE");
    case "INVALID_GUEST_COUNT":
      return new PendingReservationHoldError("INVALID_GUEST_COUNT");
    case "INVALID_QUOTE_REQUEST":
    default:
      return new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }
}

function isSerializableTransactionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function toQuoteCurrency(value: string): ReservationQuoteCurrency {
  return value === "USD" ? "USD" : "USD";
}

function toReservationQuoteAmount(
  value: Readonly<{ toString: () => string }>,
  currency: string,
): ReservationQuoteAmount {
  const normalizedCurrency = toQuoteCurrency(currency);
  const numericValue = Number(value.toString());

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  return {
    currency: normalizedCurrency,
    amountCents: Math.round(numericValue * 100),
    amount: numericValue.toFixed(2),
  };
}

function getLocalizedValue(value: string | LocalizedText, locale: "es" | "en"): string {
  return typeof value === "string" ? value : value[locale];
}

function withStoredReservationAmounts(
  quote: ReservationQuote,
  reservation: ReusablePendingReservation,
): ReservationQuote {
  return {
    ...quote,
    checkInDate: toDateOnlyString(reservation.checkInDate),
    checkOutDate: toDateOnlyString(reservation.checkOutDate),
    guestCount: reservation.guestCount,
    subtotal: toReservationQuoteAmount(reservation.subtotal, reservation.currency),
    cleaningFee: toReservationQuoteAmount(reservation.cleaningFee, reservation.currency),
    taxes: toReservationQuoteAmount(reservation.taxes, reservation.currency),
    discounts: toReservationQuoteAmount(reservation.discounts, reservation.currency),
    total: toReservationQuoteAmount(reservation.total, reservation.currency),
    currency: toQuoteCurrency(reservation.currency),
  };
}

async function buildPendingReservationHoldFromReservation(
  reservation: ReusablePendingReservation,
): Promise<PendingReservationHold> {
  if (!reservation.expiresAt || reservation.status !== ReservationStatus.PENDING_PAYMENT) {
    throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
  }

  const accommodationId = reservation.propertyId as AccommodationId;
  const quote = await calculateReservationQuote({
    accommodationId,
    checkInDate: toDateOnlyString(reservation.checkInDate),
    checkOutDate: toDateOnlyString(reservation.checkOutDate),
    guestCount: reservation.guestCount,
  });
  const quoteWithStoredAmounts = withStoredReservationAmounts(quote, reservation);

  return {
    reservationId: reservation.id,
    status: "PENDING_PAYMENT",
    expiresAt: reservation.expiresAt.toISOString(),
    accommodationId,
    accommodationSlug: getLocalizedValue(quote.accommodationSlug, "en"),
    checkInDate: quoteWithStoredAmounts.checkInDate,
    checkOutDate: quoteWithStoredAmounts.checkOutDate,
    guestCount: reservation.guestCount,
    total: quoteWithStoredAmounts.total,
    currency: quoteWithStoredAmounts.currency,
    quote: quoteWithStoredAmounts,
  };
}

async function expireMatchingStalePendingReservationHolds(
  tx: PendingHoldTransactionClient,
  input: CreatePendingReservationHoldInput,
  now: Date,
): Promise<void> {
  await tx.reservation.updateMany({
    where: {
      propertyId: input.accommodationId,
      guestEmail: normalizeEmail(input.guestEmail),
      checkInDate: toDateOnlyDate(input.checkInDate),
      checkOutDate: toDateOnlyDate(input.checkOutDate),
      status: ReservationStatus.PENDING_PAYMENT,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: ReservationStatus.EXPIRED,
    },
  });
}

async function findReusableActivePendingReservationHold(
  tx: PendingHoldTransactionClient,
  input: CreatePendingReservationHoldInput,
  now: Date,
): Promise<PendingReservationHold | null> {
  const reservation = await tx.reservation.findFirst({
    where: {
      propertyId: input.accommodationId,
      guestEmail: normalizeEmail(input.guestEmail),
      checkInDate: toDateOnlyDate(input.checkInDate),
      checkOutDate: toDateOnlyDate(input.checkOutDate),
      status: ReservationStatus.PENDING_PAYMENT,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: reusablePendingReservationSelect,
  });

  if (!reservation) {
    return null;
  }

  return buildPendingReservationHoldFromReservation(reservation);
}

async function createPendingReservationHoldAttempt(
  input: CreatePendingReservationHoldInput,
): Promise<PendingReservationHold> {
  assertGuestDetails(input);

  return prisma.$transaction(
    async (tx) => {
      let quote;

      try {
        quote = await calculateReservationQuote({
          accommodationId: input.accommodationId,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guestCount: input.guestCount,
        });
      } catch (error) {
        if (error instanceof ReservationQuoteError) {
          throw mapQuoteError(error);
        }

        throw error;
      }

      const now = new Date();

      await expireMatchingStalePendingReservationHolds(tx, input, now);

      const reusablePendingHold = await findReusableActivePendingReservationHold(tx, input, now);

      if (reusablePendingHold) {
        return reusablePendingHold;
      }

      const availability = await checkAccommodationAvailability(
        {
          accommodationId: input.accommodationId,
          startDate: input.checkInDate,
          endDate: input.checkOutDate,
        },
        {
          prismaClient: tx,
          now,
        },
      );

      if (!availability.available) {
        throw new PendingReservationHoldError("UNAVAILABLE_DATES");
      }

      const expiresAt = buildExpiresAt(now);
      const guestName = normalizeText(input.guestName);
      const guestEmail = normalizeEmail(input.guestEmail);
      const guestCountry = normalizeCountry(input.guestCountry);
      const countryDialCode = normalizeDialCode(input.countryDialCode);
      const guestPhoneLocal = normalizePhoneLocal(input.guestPhoneLocal);
      const guestPhone = buildGuestPhone(countryDialCode, guestPhoneLocal);

      const reservation = await tx.reservation.create({
        data: {
          propertyId: input.accommodationId as AccommodationId,
          guestName,
          guestEmail,
          guestPhone,
          guestCountry,
          checkInDate: toDateOnlyDate(input.checkInDate),
          checkOutDate: toDateOnlyDate(input.checkOutDate),
          arrivalTimeEstimate: input.arrivalTimeEstimate.trim(),
          guestCount: input.guestCount,
          status: ReservationStatus.PENDING_PAYMENT,
          subtotal: quote.subtotal.amount.toString(),
          cleaningFee: quote.cleaningFee.amount.toString(),
          taxes: quote.taxes.amount.toString(),
          discounts: quote.discounts.amount.toString(),
          total: quote.total.amount.toString(),
          currency: quote.currency,
          expiresAt,
          guests: {
            create: {
              name: guestName,
              email: guestEmail,
              phone: guestPhone,
            },
          },
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!reservation.expiresAt) {
        throw new PendingReservationHoldError("INVALID_PENDING_HOLD_REQUEST");
      }

      return {
        reservationId: reservation.id,
        status: "PENDING_PAYMENT",
        expiresAt: reservation.expiresAt.toISOString(),
        accommodationId: input.accommodationId,
        accommodationSlug: getLocalizedValue(quote.accommodationSlug, "en"),
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        guestCount: input.guestCount,
        total: quote.total,
        currency: quote.currency,
        quote,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createPendingReservationHold(
  input: CreatePendingReservationHoldInput,
): Promise<PendingReservationHold> {
  try {
    return await createPendingReservationHoldAttempt(input);
  } catch (firstError) {
    if (!isSerializableTransactionConflict(firstError)) {
      throw firstError;
    }
  }

  try {
    return await createPendingReservationHoldAttempt(input);
  } catch (secondError) {
    if (isSerializableTransactionConflict(secondError)) {
      throw new PendingReservationHoldError("PENDING_HOLD_CONFLICT");
    }

    throw secondError;
  }
}
