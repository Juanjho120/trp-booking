import type { AdminPaymentDiagnostics } from "@/types/admin-payments";

const MAX_DIAGNOSTIC_LENGTH = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadRoot(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const response = value.response;

  if (Array.isArray(response) && isRecord(response[0])) {
    return response[0];
  }

  return value;
}

function readString(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, MAX_DIAGNOSTIC_LENGTH);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).slice(0, MAX_DIAGNOSTIC_LENGTH);
    }
  }

  return null;
}

export function extractAdminPaymentDiagnostics(
  payload: unknown,
): AdminPaymentDiagnostics {
  const root = getPayloadRoot(payload);

  return {
    providerCode: readString(root, ["code", "responseCode", "response_code"]),
    providerMessage: readString(root, [
      "description",
      "message",
      "responseMessage",
    ]),
    authorization: readString(root, [
      "auth",
      "authorization",
      "authorizationCode",
    ]),
    providerOrder: readString(root, [
      "order",
      "orderNumber",
      "external_order_id",
      "externalOrderId",
    ]),
    tilopayTransaction: readString(root, [
      "tilopay-transaction",
      "tilopayTransaction",
      "tpt",
      "orderId",
    ]),
    orderHashStatus: readString(root, [
      "orderHashStatus",
      "order_hash_status",
      "hashStatus",
      "phaseBoundary",
    ]),
  };
}
