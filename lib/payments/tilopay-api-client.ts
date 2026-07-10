import { getTilopayEnv } from "@/lib/env/server";

const TILOPAY_API_BASE_URL = "https://app.tilopay.com/api/v1";

type JsonRecord = Record<string, unknown>;

export class TilopayApiClientError extends Error {
  constructor(message = "TILOPAY_API_CLIENT_ERROR") {
    super(message);
    this.name = "TilopayApiClientError";
  }
}

export type TilopayConsultResult = Readonly<{
  responseCode: string | null;
  description: string | null;
  auth: string | null;
  orderNumber: string | null;
  transactionId: string | null;
  amount: string | null;
  currency: string | null;
  email: string | null;
  rawPayload: JsonRecord;
}>;

type TilopayApiToken = Readonly<{
  accessToken: string;
  tokenType: string;
}>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(payload: JsonRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function getAmount(payload: JsonRecord): string | null {
  const value = getString(payload, ["amount", "total", "transactionAmount"]);

  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue.toFixed(2);
}

async function requestTilopayApiToken(): Promise<TilopayApiToken> {
  const env = getTilopayEnv();
  const response = await fetch(`${TILOPAY_API_BASE_URL}/login`, {
    body: JSON.stringify({
      apiuser: env.TILOPAY_API_USER,
      password: env.TILOPAY_API_PASSWORD,
    }),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new TilopayApiClientError("TILOPAY_LOGIN_UNAVAILABLE");
  }

  const payload = (await response.json()) as unknown;

  if (!isJsonRecord(payload) || typeof payload.access_token !== "string") {
    throw new TilopayApiClientError("TILOPAY_LOGIN_INVALID_RESPONSE");
  }

  const accessToken = payload.access_token.trim();

  if (!accessToken) {
    throw new TilopayApiClientError("TILOPAY_LOGIN_EMPTY_TOKEN");
  }

  return {
    accessToken,
    tokenType: typeof payload.token_type === "string" && payload.token_type.trim()
      ? payload.token_type.trim()
      : "bearer",
  };
}

export async function consultTilopayTransaction(orderNumber: string): Promise<TilopayConsultResult> {
  const env = getTilopayEnv();
  const token = await requestTilopayApiToken();
  const response = await fetch(`${TILOPAY_API_BASE_URL}/consult`, {
    body: JSON.stringify({
      key: env.TILOPAY_API_KEY,
      orderNumber,
      merchantId: "",
    }),
    headers: {
      accept: "application/json",
      authorization: `${token.tokenType} ${token.accessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new TilopayApiClientError("TILOPAY_CONSULT_UNAVAILABLE");
  }

  const payload = (await response.json()) as unknown;

  if (!isJsonRecord(payload)) {
    throw new TilopayApiClientError("TILOPAY_CONSULT_INVALID_RESPONSE");
  }

  return {
    responseCode: getString(payload, ["responseCode", "code", "statusCode"]),
    description: getString(payload, ["description", "message", "responseMessage"]),
    auth: getString(payload, ["auth", "authorization", "authorizationCode"]),
    orderNumber: getString(payload, ["external_order_id", "orderNumber", "order"]),
    transactionId: getString(payload, ["orderId", "tpt", "transactionId", "tilopay-transaction"]),
    amount: getAmount(payload),
    currency: getString(payload, ["currency"]),
    email: getString(payload, ["email", "billToEmail", "customerEmail"]),
    rawPayload: payload,
  };
}
