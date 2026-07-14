import { randomUUID } from "crypto";

import { PaymentProvider, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
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

  constructor(code: "PAYMENT_NOT_FOUND" | "PAYMENT_CLIENT_EVENT_UNEXPECTED_ERROR") {
    super(code);
    this.name = "TilopaySdkClientEventError";
    this.code = code;
  }
}

function normalizeOptionalString(
  value: string | null | undefined,
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string | null {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
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

function normalizeEventType(value: TilopaySdkClientEventType): TilopaySdkClientEventType {
  return value;
}

function sanitizePrimitive(value: unknown): Prisma.InputJsonValue | null {
  if (typeof value === "string") {
    return value.slice(0, MAX_PAYLOAD_STRING_LENGTH);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function sanitizeSdkPayload(value: unknown): StoredSdkPayload | null {
  if (!value) {
    return null;
  }

  if (value instanceof Error) {
    return {
      name: value.name.slice(0, MAX_SHORT_TEXT_LENGTH),
      message: value.message.slice(0, MAX_MESSAGE_LENGTH),
    };
  }

  if (typeof value === "string") {
    return {
      message: value.slice(0, MAX_MESSAGE_LENGTH),
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, Prisma.InputJsonValue> = {};

  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.trim();
    const lowerKey = normalizedKey.toLowerCase();

    if (!normalizedKey || lowerKey.includes("card")) {
      continue;
    }

    if (
      lowerKey.includes("cvv") ||
      lowerKey.includes("expiration") ||
      lowerKey.includes("expiry") ||
      lowerKey.includes("number")
    ) {
      continue;
    }

    const sanitizedValue = sanitizePrimitive(rawValue);

    if (sanitizedValue !== null) {
      result[normalizedKey.slice(0, MAX_SHORT_TEXT_LENGTH)] = sanitizedValue;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function toJsonSql(value: StoredSdkPayload | null): Prisma.Sql {
  if (!value) {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`CAST(${JSON.stringify(value)} AS jsonb)`;
}

export async function recordTilopaySdkClientEvent(
  input: TilopaySdkClientEventRequest,
): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      provider: PaymentProvider.TILOPAY,
      reservationId: input.reservationId,
    },
    select: {
      id: true,
    },
  });

  if (!payment) {
    throw new TilopaySdkClientEventError("PAYMENT_NOT_FOUND");
  }

  const sdkPayload = sanitizeSdkPayload(input.sdkPayload);

  await prisma.$executeRaw`
    INSERT INTO "payment_client_events" (
      "id",
      "payment_id",
      "reservation_id",
      "provider",
      "event_type",
      "environment",
      "locale",
      "payment_method_id",
      "payment_method_name",
      "payment_method_type",
      "detected_card_brand",
      "sdk_message",
      "sdk_payload",
      "preflight_status",
      "preflight_expires_at"
    )
    VALUES (
      ${randomUUID()},
      ${input.paymentId},
      ${input.reservationId},
      ${PaymentProvider.TILOPAY}::payment_provider,
      ${normalizeEventType(input.eventType)}::payment_client_event_type,
      ${normalizeOptionalString(input.environment)},
      ${normalizeOptionalString(input.locale)},
      ${normalizeOptionalString(input.paymentMethodId)},
      ${normalizeOptionalString(input.paymentMethodName)},
      ${normalizeOptionalString(input.paymentMethodType)},
      ${normalizeOptionalString(input.detectedCardBrand)},
      ${normalizeOptionalString(input.sdkMessage, MAX_MESSAGE_LENGTH)},
      ${toJsonSql(sdkPayload)},
      ${normalizeOptionalString(input.preflightStatus)},
      ${normalizeOptionalDate(input.preflightExpiresAt)}
    )
  `;
}
