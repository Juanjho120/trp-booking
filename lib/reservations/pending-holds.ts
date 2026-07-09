import { Prisma, ReservationStatus } from "@prisma/client";

import { checkAccommodationAvailability } from "@/lib/availability/service";
import { prisma } from "@/lib/db/prisma";
import { calculateReservationQuote, ReservationQuoteError } from "@/lib/reservations/pricing";
import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { ReservationQuote } from "@/types/reservation-quote";
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

function toDateOnlyDate(date: DateOnlyString): Date {
  return new Date(`${date}T00:00:00.000Z`);
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

      const quoteWithSlug = quote as ReservationQuote & { accommodationSlug?: string; slug?: string };

      return {
        reservationId: reservation.id,
        status: "PENDING_PAYMENT",
        expiresAt: reservation.expiresAt.toISOString(),
        accommodationId: input.accommodationId,
        accommodationSlug: quoteWithSlug.accommodationSlug ?? quoteWithSlug.slug ?? input.accommodationId,
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
