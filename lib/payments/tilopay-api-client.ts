import { getTilopayEnv } from "@/lib/env/server";

const TILOPAY_API_BASE_URL = "https://app.tilopay.com/api/v1";
const DEFAULT_MODIFICATION_TIMEOUT_MS = 20_000;
const SAFE_DESCRIPTION_MAX_LENGTH = 240;
const SAFE_REFERENCE_MAX_LENGTH = 180;

type JsonRecord = Record<string, unknown>;
export type TilopayModificationType = "2" | "3";
export type TilopayObservationAuthorizationMode = "valid" | "invalid" | "missing";
export type TilopayObservationKeyMode = "valid" | "invalid" | "missing";

export class TilopayApiClientError extends Error {
  readonly code: string;
  readonly requestMayHaveReachedProvider: boolean;

  constructor(
    code = "TILOPAY_API_CLIENT_ERROR",
    options: Readonly<{ requestMayHaveReachedProvider?: boolean }> = {},
  ) {
    super(code);
    this.name = "TilopayApiClientError";
    this.code = code;
    this.requestMayHaveReachedProvider =
      options.requestMayHaveReachedProvider ?? false;
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

export type TilopayModificationObservation = Readonly<{
  httpStatus: number;
  ok: boolean;
  responseCode: string | null;
  description: string | null;
  providerReference: string | null;
  responseShape: Readonly<Record<string, unknown>>;
  observedAt: string;
}>;

export type ObserveTilopayModificationInput = Readonly<{
  orderNumber?: string;
  type?: string;
  amount?: string;
}>;

export type ObserveTilopayModificationOptions = Readonly<{
  authorizationMode?: TilopayObservationAuthorizationMode;
  keyMode?: TilopayObservationKeyMode;
  timeoutMs?: number;
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

function getConsultRecord(payload: JsonRecord): JsonRecord {
  const response = payload.response;

  if (Array.isArray(response) && response.length > 0 && isJsonRecord(response[0])) {
    return response[0];
  }

  return payload;
}

function getModificationRecord(payload: unknown): JsonRecord | null {
  if (!isJsonRecord(payload)) {
    return null;
  }

  const response = payload.response;

  if (isJsonRecord(response)) {
    return response;
  }

  if (Array.isArray(response) && response.length > 0 && isJsonRecord(response[0])) {
    return response[0];
  }

  return payload;
}

function trimSafe(value: string | null, maximumLength: number): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function describeResponseShape(value: unknown, depth = 0): unknown {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      item:
        value.length > 0 && depth < 2
          ? describeResponseShape(value[0], depth + 1)
          : null,
    };
  }

  if (isJsonRecord(value)) {
    if (depth >= 2) {
      return {
        type: "object",
        keys: Object.keys(value).sort(),
      };
    }

    return {
      type: "object",
      fields: Object.fromEntries(
        Object.entries(value)
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([key, fieldValue]) => [
            key,
            describeResponseShape(fieldValue, depth + 1),
          ]),
      ),
    };
  }

  return typeof value;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      nonJsonResponse: true,
      length: text.length,
    };
  }
}

async function requestTilopayApiToken(): Promise<TilopayApiToken> {
  const env = getTilopayEnv();
  let response: Response;

  try {
    response = await fetch(`${TILOPAY_API_BASE_URL}/login`, {
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
  } catch {
    throw new TilopayApiClientError("TILOPAY_LOGIN_NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new TilopayApiClientError("TILOPAY_LOGIN_UNAVAILABLE");
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new TilopayApiClientError("TILOPAY_LOGIN_INVALID_RESPONSE");
  }

  if (!isJsonRecord(payload) || typeof payload.access_token !== "string") {
    throw new TilopayApiClientError("TILOPAY_LOGIN_INVALID_RESPONSE");
  }

  const accessToken = payload.access_token.trim();

  if (!accessToken) {
    throw new TilopayApiClientError("TILOPAY_LOGIN_EMPTY_TOKEN");
  }

  return {
    accessToken,
    tokenType:
      typeof payload.token_type === "string" && payload.token_type.trim()
        ? payload.token_type.trim()
        : "bearer",
  };
}

export async function consultTilopayTransaction(
  orderNumber: string,
): Promise<TilopayConsultResult> {
  const env = getTilopayEnv();
  const token = await requestTilopayApiToken();
  let response: Response;

  try {
    response = await fetch(`${TILOPAY_API_BASE_URL}/consult`, {
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
  } catch {
    throw new TilopayApiClientError("TILOPAY_CONSULT_NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new TilopayApiClientError("TILOPAY_CONSULT_UNAVAILABLE");
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new TilopayApiClientError("TILOPAY_CONSULT_INVALID_RESPONSE");
  }

  if (!isJsonRecord(payload)) {
    throw new TilopayApiClientError("TILOPAY_CONSULT_INVALID_RESPONSE");
  }

  const consultRecord = getConsultRecord(payload);

  return {
    responseCode: getString(consultRecord, [
      "responseCode",
      "code",
      "statusCode",
    ]),
    description: getString(consultRecord, [
      "description",
      "message",
      "responseMessage",
      "response",
    ]),
    auth: getString(consultRecord, [
      "auth",
      "authorization",
      "authorizationCode",
    ]),
    orderNumber: getString(consultRecord, [
      "external_order_id",
      "orderNumber",
      "order",
    ]),
    transactionId: getString(consultRecord, [
      "orderId",
      "tpt",
      "id_tilopay",
      "transactionId",
      "tilopay-transaction",
    ]),
    amount: getAmount(consultRecord),
    currency: getString(consultRecord, ["currency"]),
    email: getString(consultRecord, [
      "email",
      "billToEmail",
      "customerEmail",
    ]),
    rawPayload: payload,
  };
}

export async function observeTilopayModificationSandbox(
  input: ObserveTilopayModificationInput,
  options: ObserveTilopayModificationOptions = {},
): Promise<TilopayModificationObservation> {
  const env = getTilopayEnv();

  if (env.TILOPAY_ENVIRONMENT !== "sandbox") {
    throw new TilopayApiClientError("TILOPAY_MODIFICATION_SANDBOX_ONLY");
  }

  const authorizationMode = options.authorizationMode ?? "valid";
  const keyMode = options.keyMode ?? "valid";
  const timeoutMs = options.timeoutMs ?? DEFAULT_MODIFICATION_TIMEOUT_MS;
  const token =
    authorizationMode === "valid" ? await requestTilopayApiToken() : null;
  const body: JsonRecord = {};

  if (input.orderNumber !== undefined) {
    body.orderNumber = input.orderNumber;
  }

  if (input.type !== undefined) {
    body.type = input.type;
  }

  if (input.amount !== undefined) {
    body.amount = input.amount;
  }

  if (keyMode === "valid") {
    body.key = env.TILOPAY_API_KEY;
  } else if (keyMode === "invalid") {
    body.key = "invalid-sandbox-key";
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };

  if (authorizationMode === "valid" && token) {
    headers.authorization = `${token.tokenType} ${token.accessToken}`;
  } else if (authorizationMode === "invalid") {
    headers.authorization = "Bearer invalid-sandbox-token";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${TILOPAY_API_BASE_URL}/processModification`, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
      signal: controller.signal,
    });
    const payload = await parseResponsePayload(response);
    const record = getModificationRecord(payload);

    return {
      httpStatus: response.status,
      ok: response.ok,
      responseCode: record
        ? trimSafe(
            getString(record, [
              "responseCode",
              "ReasonCode",
              "code",
              "statusCode",
              "status",
            ]),
            100,
          )
        : null,
      description: record
        ? trimSafe(
            getString(record, [
              "description",
              "ReasonCodeDescription",
              "message",
              "responseMessage",
              "detail",
              "error",
            ]),
            SAFE_DESCRIPTION_MAX_LENGTH,
          )
        : null,
      providerReference: record
        ? trimSafe(
            getString(record, [
              "refundId",
              "reversalId",
              "transactionId",
              "orderId",
              "tpt",
              "id_tilopay",
              "auth",
              "authorization",
            ]),
            SAFE_REFERENCE_MAX_LENGTH,
          )
        : null,
      responseShape: {
        body: describeResponseShape(payload),
      },
      observedAt: new Date().toISOString(),
    };
  } catch (error) {
    const code =
      error instanceof DOMException && error.name === "AbortError"
        ? "TILOPAY_MODIFICATION_TIMEOUT"
        : "TILOPAY_MODIFICATION_NETWORK_ERROR";

    throw new TilopayApiClientError(code, {
      requestMayHaveReachedProvider: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function processTilopayModification(input: Readonly<{
  orderNumber: string;
  type: TilopayModificationType;
  amount: string;
}>): Promise<TilopayModificationObservation> {
  return observeTilopayModificationSandbox(input, {
    authorizationMode: "valid",
    keyMode: "valid",
  });
}

export function describeTilopayConsultObservation(
  consult: TilopayConsultResult,
): Readonly<Record<string, unknown>> {
  return {
    source: "tilopay_consult",
    observedAt: new Date().toISOString(),
    responseCode: trimSafe(consult.responseCode, 100),
    description: trimSafe(consult.description, SAFE_DESCRIPTION_MAX_LENGTH),
    providerReference: trimSafe(
      consult.transactionId ?? consult.auth,
      SAFE_REFERENCE_MAX_LENGTH,
    ),
    orderNumber: trimSafe(consult.orderNumber, SAFE_REFERENCE_MAX_LENGTH),
    amount: consult.amount,
    currency: trimSafe(consult.currency, 10),
    responseShape: describeResponseShape(consult.rawPayload),
    resultClassification: "RECONCILIATION_REQUIRED",
  };
}
