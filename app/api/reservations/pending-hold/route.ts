import { NextResponse } from "next/server";
import { z } from "zod";

import { isDateOnlyString } from "@/lib/availability/rules";
import {
  createPendingReservationHold,
  PendingReservationHoldError,
} from "@/lib/reservations/pending-holds";
import {
  getPendingHoldErrorMessage,
  type PendingHoldErrorCode,
} from "@/features/reservations/reservation-pending-hold-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accommodationIdSchema = z.enum([
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
]);

const localeSchema = z.enum(["es", "en"]).catch("es");

const pendingHoldRequestSchema = z.object({
  accommodationId: accommodationIdSchema,
  checkInDate: z.string().refine(isDateOnlyString),
  checkOutDate: z.string().refine(isDateOnlyString),
  guestCount: z.coerce.number().int().min(1),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(160),
  guestCountry: z.string().trim().length(2),
  countryDialCode: z.string().trim().regex(/^\+[1-9]\d{0,4}$/),
  guestPhoneLocal: z.string().trim().min(4).max(40),
  arrivalTimeEstimate: z.string().trim().regex(/^([01]\d|2[0-2]):(00|30)$/),
  locale: localeSchema,
});

function toErrorResponse(
  code: PendingHoldErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: getPendingHoldErrorMessage(code, locale),
      },
    },
    { status },
  );
}

function resolveErrorStatus(code: PendingHoldErrorCode): number {
  switch (code) {
    case "UNAVAILABLE_DATES":
    case "PENDING_HOLD_CONFLICT":
      return 409;
    case "INVALID_PENDING_HOLD_REQUEST":
    case "INVALID_ACCOMMODATION":
    case "INVALID_DATE_RANGE":
    case "INVALID_GUEST_COUNT":
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return toErrorResponse("INVALID_PENDING_HOLD_REQUEST", "es", 400);
  }

  const locale = localeSchema.parse(
    typeof body === "object" && body !== null && "locale" in body ? body.locale : "es",
  );
  const parsedRequest = pendingHoldRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_PENDING_HOLD_REQUEST", locale, 400);
  }

  if (parsedRequest.data.arrivalTimeEstimate === "22:30") {
    return toErrorResponse("INVALID_PENDING_HOLD_REQUEST", locale, 400);
  }

  try {
    const pendingHold = await createPendingReservationHold({
      ...parsedRequest.data,
      guestCountry: parsedRequest.data.guestCountry.toUpperCase(),
      guestEmail: parsedRequest.data.guestEmail.toLowerCase(),
    });

    return NextResponse.json({ pendingHold }, { status: 201 });
  } catch (error) {
    if (error instanceof PendingReservationHoldError) {
      return toErrorResponse(error.code, locale, resolveErrorStatus(error.code));
    }

    return toErrorResponse("PENDING_HOLD_UNEXPECTED_ERROR", locale, 500);
  }
}
