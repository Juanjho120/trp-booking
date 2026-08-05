import { NextResponse } from "next/server";
import { z } from "zod";

import { isDateOnlyString } from "@/lib/availability/rules";
import {
  createPendingReservationHold,
  PendingReservationHoldError,
  releasePendingReservationHold,
} from "@/lib/reservations/pending-holds";
import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";
import type {
  PendingHoldErrorCode,
  ReleasePendingHoldErrorCode,
} from "@/types/reservation-pending-hold";

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

const releasePendingHoldRequestSchema = z
  .object({
    reservationId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    expectedUpdatedAt: z.iso.datetime(),
    locale: localeSchema,
  })
  .strict();

function getPendingHoldErrorMessage(
  code: PendingHoldErrorCode,
  locale: "es" | "en",
): string {
  const messages = locale === "en" ? enMessages : esMessages;

  return messages.errors.reservation.pendingHold[code];
}

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
    {
      status,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

function resolveErrorStatus(code: PendingHoldErrorCode): number {
  switch (code) {
    case "UNAVAILABLE_DATES":
    case "PENDING_HOLD_CONFLICT":
      return 409;
    case "PENDING_HOLD_UNEXPECTED_ERROR":
      return 500;
    case "INVALID_PENDING_HOLD_REQUEST":
    case "INVALID_ACCOMMODATION":
    case "INVALID_DATE_RANGE":
    case "INVALID_GUEST_COUNT":
    default:
      return 400;
  }
}

type PublicPendingReservationHoldErrorCode = Extract<
  PendingHoldErrorCode,
  PendingReservationHoldError["code"]
>;

function isPublicPendingHoldErrorCode(
  code: PendingReservationHoldError["code"],
): code is PublicPendingReservationHoldErrorCode {
  return (
    code === "INVALID_PENDING_HOLD_REQUEST" ||
    code === "INVALID_ACCOMMODATION" ||
    code === "INVALID_DATE_RANGE" ||
    code === "INVALID_GUEST_COUNT" ||
    code === "UNAVAILABLE_DATES" ||
    code === "PENDING_HOLD_CONFLICT"
  );
}

function getReleasePendingHoldErrorMessage(
  code: ReleasePendingHoldErrorCode,
  locale: "es" | "en",
): string {
  const messages = locale === "en" ? enMessages : esMessages;

  return messages.errors.reservation.pendingHoldRelease[code];
}

function toReleaseErrorResponse(
  code: ReleasePendingHoldErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: getReleasePendingHoldErrorMessage(code, locale),
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

function mapReleaseError(
  code: PendingReservationHoldError["code"],
): Readonly<{
  code: ReleasePendingHoldErrorCode;
  status: number;
}> {
  switch (code) {
    case "PENDING_HOLD_NOT_FOUND":
      return {
        code: "PENDING_HOLD_NOT_FOUND",
        status: 404,
      };

    case "PENDING_HOLD_NOT_MODIFIABLE":
      return {
        code: "PENDING_HOLD_NOT_EDITABLE",
        status: 409,
      };

    case "PENDING_HOLD_PAYMENT_STARTED":
      return {
        code: "PENDING_HOLD_EDIT_LOCKED_BY_PAYMENT",
        status: 409,
      };

    case "PENDING_HOLD_STALE":
      return {
        code: "PENDING_HOLD_RELEASE_STALE",
        status: 409,
      };

    default:
      return {
        code: "PENDING_HOLD_RELEASE_UNEXPECTED_ERROR",
        status: 500,
      };
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const locale = localeSchema.parse(
    typeof body === "object" && body !== null && "locale" in body
      ? body.locale
      : "es",
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

    return NextResponse.json(
      { pendingHold },
      {
        status: 201,
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof PendingReservationHoldError &&
      isPublicPendingHoldErrorCode(error.code)
    ) {
      return toErrorResponse(error.code, locale, resolveErrorStatus(error.code));
    }

    return toErrorResponse("PENDING_HOLD_UNEXPECTED_ERROR", locale, 500);
  }
}

export async function DELETE(request: Request) {
  const body = await readJson(request);
  const locale = localeSchema.parse(
    typeof body === "object" && body !== null && "locale" in body
      ? body.locale
      : "es",
  );
  const parsedRequest = releasePendingHoldRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toReleaseErrorResponse(
      "INVALID_PENDING_HOLD_RELEASE_REQUEST",
      locale,
      400,
    );
  }

  try {
    const releasedHold = await releasePendingReservationHold({
      reservationId: parsedRequest.data.reservationId,
      expectedUpdatedAt: parsedRequest.data.expectedUpdatedAt,
    });

    return NextResponse.json(
      { releasedHold },
      {
        status: 200,
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof PendingReservationHoldError) {
      const mappedError = mapReleaseError(error.code);
      return toReleaseErrorResponse(
        mappedError.code,
        locale,
        mappedError.status,
      );
    }

    return toReleaseErrorResponse(
      "PENDING_HOLD_RELEASE_UNEXPECTED_ERROR",
      locale,
      500,
    );
  }
}
