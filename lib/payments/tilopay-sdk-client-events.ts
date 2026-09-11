import { randomUUID } from "crypto";

import { PaymentProvider, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  isLifecycleAdjustmentHandoffToken,
  LifecycleAdjustmentHandoffError,
  resolveLifecycleAdjustmentClientEventReservation,
} from "@/lib/payments/lifecycle-adjustment-handoff";
import {
  GuestPaymentRequestPaymentError,
  resolveGuestPaymentRequestClientEventReservation,
} from "@/lib/payments/guest-payment-request-payment";
import { isGuestPaymentRequestAccessToken } from "@/lib/payments/guest-payment-request-token";
import { finalizePaymentSubmissionAttemptFromSdkEvent } from "@/lib/payments/payment-submission-attempts";
import type {
  TilopaySdkClientEventRequest,
  TilopaySdkClientEventType,
} from "@/types/tilopay-sdk-client-event";

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_PAYLOAD_STRING_LENGTH = 500;
type StoredSdkPayload = Prisma.InputJsonObject;

export class TilopaySdkClientEventError extends Error {
  readonly code: "PAYMENT_NOT_FOUND" | "PAYMENT_CLIENT_EVENT_UNEXPECTED_ERROR";

  constructor(
    code: "PAYMENT_NOT_FOUND" | "PAYMENT_CLIENT_EVENT_UNEXPECTED_ERROR",
  ) {
    super(code);
    this.name = "TilopaySdkClientEventError";
    this.code = code;
  }
}

function normalizeOptionalString(
  value: string | null | undefined,
  maxLength = MAX_SHORT_TEXT_LENGTH,
  sensitiveValues: readonly string[] = [],
): string | null {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    containsSensitiveValue(normalizedValue, sensitiveValues)
  ) {
    return null;
  }

  return normalizedValue.slice(0, maxLength);
}

function normalizeOptionalDate(value: string | null | undefined): Date | null {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeEventType(
  value: TilopaySdkClientEventType,
): TilopaySdkClientEventType {
  return value;
}

function containsSensitiveValue(
  value: string,
  sensitiveValues: readonly string[],
): boolean {
  return sensitiveValues.some((sensitiveValue) => {
    const normalizedSensitiveValue = sensitiveValue.trim();

    return (
      normalizedSensitiveValue.length > 0 &&
      value.includes(normalizedSensitiveValue)
    );
  });
}

function sanitizeString(
  value: string,
  maxLength: number,
  sensitiveValues: readonly string[] = [],
): string | null {
  if (containsSensitiveValue(value, sensitiveValues)) {
    return null;
  }

  return value.slice(0, maxLength);
}

function sanitizePrimitive(
  value: unknown,
  sensitiveValues: readonly string[] = [],
): Prisma.InputJsonValue | null {
  if (typeof value === "string") {
    return sanitizeString(value, MAX_PAYLOAD_STRING_LENGTH, sensitiveValues);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function sanitizeSdkPayload(
  value: unknown,
  sensitiveValues: readonly string[] = [],
): StoredSdkPayload | null {
  if (!value) {
    return null;
  }

  if (value instanceof Error) {
    const errorPayload: Record<string, Prisma.InputJsonValue> = {};
    const name = sanitizeString(
      value.name,
      MAX_SHORT_TEXT_LENGTH,
      sensitiveValues,
    );
    const message = sanitizeString(
      value.message,
      MAX_MESSAGE_LENGTH,
      sensitiveValues,
    );

    if (name) {
      errorPayload.name = name;
    }

    if (message) {
      errorPayload.message = message;
    }

    return Object.keys(errorPayload).length > 0 ? errorPayload : null;
  }

  if (typeof value === "string") {
    const message = sanitizeString(
      value,
      MAX_MESSAGE_LENGTH,
      sensitiveValues,
    );

    return message ? { message } : null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, Prisma.InputJsonValue> = {};

  for (const [key, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const normalizedKey = key.trim();
    const lowerKey = normalizedKey.toLowerCase();

    if (
      !normalizedKey ||
      containsSensitiveValue(normalizedKey, sensitiveValues) ||
      lowerKey.includes("card") ||
      lowerKey.includes("cvv") ||
      lowerKey.includes("expiration") ||
      lowerKey.includes("expiry") ||
      lowerKey.includes("token") ||
      lowerKey.includes("number")
    ) {
      continue;
    }

    const sanitizedValue = sanitizePrimitive(rawValue, sensitiveValues);

    if (sanitizedValue !== null) {
      result[normalizedKey.slice(0, MAX_SHORT_TEXT_LENGTH)] = sanitizedValue;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function toJsonSql(value: StoredSdkPayload | null): Prisma.Sql {
  return value
    ? Prisma.sql`CAST(${JSON.stringify(value)} AS jsonb)`
    : Prisma.sql`NULL`;
}

async function resolveReservationId(
  input: TilopaySdkClientEventRequest,
): Promise<string> {
  if (isGuestPaymentRequestAccessToken(input.reservationId)) {
    try {
      return await resolveGuestPaymentRequestClientEventReservation(
        input.reservationId,
        input.paymentId,
      );
    } catch (error) {
      if (error instanceof GuestPaymentRequestPaymentError) {
        throw new TilopaySdkClientEventError("PAYMENT_NOT_FOUND");
      }

      throw error;
    }
  }

  if (!isLifecycleAdjustmentHandoffToken(input.reservationId)) {
    return input.reservationId;
  }

  try {
    return await resolveLifecycleAdjustmentClientEventReservation(
      input.reservationId,
      input.paymentId,
    );
  } catch (error) {
    if (error instanceof LifecycleAdjustmentHandoffError) {
      throw new TilopaySdkClientEventError("PAYMENT_NOT_FOUND");
    }

    throw error;
  }
}

export async function recordTilopaySdkClientEvent(
  input: TilopaySdkClientEventRequest,
): Promise<void> {
  const reservationId = await resolveReservationId(input);
  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      provider: PaymentProvider.TILOPAY,
      reservationId,
    },
    select: { id: true },
  });

  if (!payment) {
    throw new TilopaySdkClientEventError("PAYMENT_NOT_FOUND");
  }

  const sensitiveValues = isGuestPaymentRequestAccessToken(input.reservationId)
    ? [input.reservationId]
    : [];
  const sdkPayload = sanitizeSdkPayload(
    input.sdkPayload,
    sensitiveValues,
  );

  await prisma.$executeRaw`
    INSERT INTO "payment_client_events" (
      "id", "payment_id", "reservation_id", "provider", "event_type",
      "environment", "locale", "payment_method_id", "payment_method_name",
      "payment_method_type", "detected_card_brand", "sdk_message",
      "sdk_payload", "preflight_status", "preflight_expires_at"
    ) VALUES (
      ${randomUUID()}, ${input.paymentId}, ${reservationId},
      ${PaymentProvider.TILOPAY}::payment_provider,
      ${normalizeEventType(input.eventType)}::payment_client_event_type,
      ${normalizeOptionalString(input.environment, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.locale, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.paymentMethodId, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.paymentMethodName, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.paymentMethodType, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.detectedCardBrand, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalString(input.sdkMessage, MAX_MESSAGE_LENGTH, sensitiveValues)},
      ${toJsonSql(sdkPayload)},
      ${normalizeOptionalString(input.preflightStatus, MAX_SHORT_TEXT_LENGTH, sensitiveValues)},
      ${normalizeOptionalDate(input.preflightExpiresAt)}
    )
  `;

  try {
    await finalizePaymentSubmissionAttemptFromSdkEvent({
      paymentId: input.paymentId,
      eventType: input.eventType,
      sdkMessage: input.sdkMessage,
    });
  } catch {
    // The persisted SDK diagnostic remains authoritative if attempt-history
    // classification cannot be updated. Guest payment behavior is unchanged.
  }
}
