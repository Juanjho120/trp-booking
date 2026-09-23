import { createHash, timingSafeEqual } from "node:crypto";

import type { TrpEnvironment } from "@/lib/env/server";

export const D360_MESSAGES_ENDPOINT = "https://waba-v2.360dialog.io/messages";
export const D360_WEBHOOK_PATH = "/api/360dialog/whatsapp/webhook";

const DEFAULT_PROBE_BODY =
  "TRP Booking 360dialog Coexistence onboarding probe.";
const PROBE_BODY_MAX_LENGTH = 320;
const WHATSAPP_E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const TRP_ENVIRONMENTS = new Set(["local", "test", "production"]);
const BASIC_AUTH_SCHEME = "basic ";
const JSON_CONTENT_TYPE = "application/json";
const SAFE_DIAGNOSTIC_DEPTH_LIMIT = 6;
const FETCH_TRANSPORT_ERROR_PATTERN =
  /(?:fetch failed|failed to fetch|network|socket|terminated|timed?\s*out|timeout|econnreset|econnrefused|etimedout|enotfound|eai_again|undici|aborted)/i;

export type D360ProviderErrorCode =
  | "D360_PROVIDER_CONFIGURATION_ERROR"
  | "D360_PROVIDER_INVALID_REQUEST"
  | "D360_PROVIDER_UNAUTHORIZED"
  | "D360_PROVIDER_RATE_LIMITED"
  | "D360_PROVIDER_TEMPORARY_FAILURE"
  | "D360_PROVIDER_REJECTED"
  | "D360_PROVIDER_UNEXPECTED_ERROR"
  | "D360_PROVIDER_PROBE_NOT_ALLOWED";

const SAFE_PROVIDER_ERROR_MESSAGES: Readonly<
  Record<D360ProviderErrorCode, string>
> = {
  D360_PROVIDER_CONFIGURATION_ERROR:
    "360dialog provider configuration is incomplete or invalid.",
  D360_PROVIDER_INVALID_REQUEST: "The 360dialog provider request is invalid.",
  D360_PROVIDER_UNAUTHORIZED:
    "The 360dialog provider credentials were rejected.",
  D360_PROVIDER_RATE_LIMITED: "The 360dialog provider rate limit was reached.",
  D360_PROVIDER_TEMPORARY_FAILURE:
    "The 360dialog provider is temporarily unavailable.",
  D360_PROVIDER_REJECTED: "The 360dialog provider rejected the request.",
  D360_PROVIDER_UNEXPECTED_ERROR:
    "The 360dialog provider returned an unexpected response.",
  D360_PROVIDER_PROBE_NOT_ALLOWED:
    "The 360dialog onboarding provider probe is not allowed in this environment.",
};

export class D360ProviderError extends Error {
  readonly code: D360ProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: D360ProviderErrorCode, retryable = false) {
    super(SAFE_PROVIDER_ERROR_MESSAGES[code]);
    this.name = "D360ProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type D360ProviderConfig = Readonly<{
  trpEnvironment: TrpEnvironment;
  apiKey: string;
  webhookBaseUrl: string;
  webhookUsername: string;
  webhookPassword: string;
}>;

export type D360ConfigResolution =
  | Readonly<{
      configured: true;
      config: D360ProviderConfig;
    }>
  | Readonly<{
      configured: false;
      missing: readonly string[];
      invalid: readonly string[];
      trpEnvironment: TrpEnvironment | null;
    }>;

export type D360WebhookValidationResult =
  | Readonly<{
      valid: true;
      payload: D360WebhookPayload;
      diagnostics: D360SafeWebhookDiagnostics;
    }>
  | Readonly<{
      valid: false;
      errorCode:
        | "D360_WEBHOOK_CONFIGURATION_ERROR"
        | "D360_WEBHOOK_AUTH_MISSING"
        | "D360_WEBHOOK_AUTH_INVALID"
        | "D360_WEBHOOK_INVALID_JSON";
      httpStatus: 400 | 401 | 503;
      missing: readonly string[];
      invalid: readonly string[];
    }>;

export type D360WebhookPayload = Readonly<{
  bodyLength: number;
  value: unknown;
}>;

export type D360SafeWebhookDiagnostics = Readonly<{
  bodyLength: number;
  topLevelKeyCount: number;
  entryCount: number;
  hasMessages: boolean;
  hasStatuses: boolean;
  hasSmbMessageEchoes: boolean;
  hasHistorySync: boolean;
}>;

export type SendD360OnboardingProbeOptions = Readonly<{
  to?: string;
  body?: string;
  source?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
}>;

export type D360OnboardingProbeResult = Readonly<{
  providerMessageId: string;
  providerStatus: string | null;
}>;

type ProviderErrorLike = Readonly<{
  status?: unknown;
  statusCode?: unknown;
  response?: Readonly<{ status?: unknown }>;
}>;

function readOptionalEnvString(
  source: NodeJS.ProcessEnv,
  key: string,
): string | null {
  const value = source[key]?.trim();
  return value ? value : null;
}

function readTrpEnvironment(source: NodeJS.ProcessEnv): TrpEnvironment | null {
  const value = readOptionalEnvString(source, "TRP_ENVIRONMENT");

  if (!value || !TRP_ENVIRONMENTS.has(value)) {
    return null;
  }

  return value as TrpEnvironment;
}

function isLocalDevelopmentOrigin(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]")
  );
}

function normalizeCanonicalOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isValidConfiguredWebhookBaseUrl(
  baseUrl: string,
  trpEnvironment: TrpEnvironment,
): boolean {
  if (trpEnvironment === "local") {
    return (
      isLocalDevelopmentOrigin(baseUrl) ||
      baseUrl === "https://trp-booking.juantzun.dev"
    );
  }

  if (trpEnvironment === "test") {
    return baseUrl === "https://trp-booking.juantzun.dev";
  }

  try {
    const url = new URL(baseUrl);
    return (
      url.protocol === "https:" &&
      (url.hostname === "turefugioperfecto.com" ||
        url.hostname.endsWith(".turefugioperfecto.com"))
    );
  } catch {
    return false;
  }
}

function isVisibleAsciiSecret(value: string): boolean {
  return /^[\x21-\x7E]+$/.test(value);
}

function isValidWebhookUsername(value: string): boolean {
  return isVisibleAsciiSecret(value) && !value.includes(":");
}

function isValidWebhookPassword(value: string): boolean {
  return value.length >= 32 && isVisibleAsciiSecret(value);
}

function isValidApiKey(value: string): boolean {
  return value.length >= 8 && /^\S+$/.test(value);
}

export function normalizeD360Recipient(value: string): `+${string}` {
  const compactNumber = value.trim().replace(/[\s().-]/g, "");

  if (!WHATSAPP_E164_PATTERN.test(compactNumber)) {
    throw new D360ProviderError("D360_PROVIDER_INVALID_REQUEST");
  }

  return compactNumber as `+${string}`;
}

function toD360RecipientNumber(value: `+${string}`): string {
  return value.slice(1);
}

export function resolveD360ProviderConfig(
  source: NodeJS.ProcessEnv = process.env,
): D360ConfigResolution {
  const missing: string[] = [];
  const invalid: string[] = [];
  const trpEnvironment = readTrpEnvironment(source);

  if (!trpEnvironment) {
    invalid.push("TRP_ENVIRONMENT");
  }

  const apiKey = readOptionalEnvString(source, "D360_API_KEY");
  const webhookBaseUrlSource = readOptionalEnvString(
    source,
    "D360_WEBHOOK_BASE_URL",
  );
  const webhookBaseUrl = normalizeCanonicalOrigin(webhookBaseUrlSource);
  const webhookUsername = readOptionalEnvString(
    source,
    "D360_WEBHOOK_USERNAME",
  );
  const webhookPassword = readOptionalEnvString(
    source,
    "D360_WEBHOOK_PASSWORD",
  );

  if (!apiKey) {
    missing.push("D360_API_KEY");
  } else if (!isValidApiKey(apiKey)) {
    invalid.push("D360_API_KEY");
  }

  if (!webhookBaseUrlSource) {
    missing.push("D360_WEBHOOK_BASE_URL");
  } else if (
    !webhookBaseUrl ||
    !trpEnvironment ||
    !isValidConfiguredWebhookBaseUrl(webhookBaseUrl, trpEnvironment)
  ) {
    invalid.push("D360_WEBHOOK_BASE_URL");
  }

  if (!webhookUsername) {
    missing.push("D360_WEBHOOK_USERNAME");
  } else if (!isValidWebhookUsername(webhookUsername)) {
    invalid.push("D360_WEBHOOK_USERNAME");
  }

  if (!webhookPassword) {
    missing.push("D360_WEBHOOK_PASSWORD");
  } else if (!isValidWebhookPassword(webhookPassword)) {
    invalid.push("D360_WEBHOOK_PASSWORD");
  }

  if (
    missing.length > 0 ||
    invalid.length > 0 ||
    !trpEnvironment ||
    !apiKey ||
    !webhookBaseUrl ||
    !webhookUsername ||
    !webhookPassword
  ) {
    return {
      configured: false,
      missing,
      invalid,
      trpEnvironment,
    };
  }

  return {
    configured: true,
    config: {
      trpEnvironment,
      apiKey,
      webhookBaseUrl,
      webhookUsername,
      webhookPassword,
    },
  };
}

export function requireD360ProviderConfig(
  source: NodeJS.ProcessEnv = process.env,
): D360ProviderConfig {
  const resolution = resolveD360ProviderConfig(source);

  if (!resolution.configured) {
    throw new D360ProviderError("D360_PROVIDER_CONFIGURATION_ERROR");
  }

  return resolution.config;
}

function parseBasicAuthorization(
  value: string | null,
): Readonly<{ username: string; password: string; credential: string }> | null {
  const trimmed = value?.trim();

  if (!trimmed?.toLowerCase().startsWith(BASIC_AUTH_SCHEME)) {
    return null;
  }

  const rawCredential = trimmed.slice(BASIC_AUTH_SCHEME.length).trim();
  let decoded: string;

  try {
    decoded = Buffer.from(rawCredential, "base64").toString("utf8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
    credential: decoded,
  };
}

function safeEqualString(actual: string, expected: string): boolean {
  const actualHash = createHash("sha256").update(actual, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();

  return timingSafeEqual(actualHash, expectedHash);
}

function isValidBasicCredential(
  credential: Readonly<{ username: string; password: string; credential: string }>,
  config: D360ProviderConfig,
): boolean {
  if (!credential.username || !credential.password) {
    return false;
  }

  return safeEqualString(
    credential.credential,
    `${config.webhookUsername}:${config.webhookPassword}`,
  );
}

function containsPropertyName(
  value: unknown,
  propertyName: string,
  depth = 0,
): boolean {
  if (depth > SAFE_DIAGNOSTIC_DEPTH_LIMIT) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) =>
      containsPropertyName(item, propertyName, depth + 1),
    );
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      key === propertyName ||
      containsPropertyName(nestedValue, propertyName, depth + 1),
  );
}

function getEntryCount(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as Record<string, unknown>).entry)
  ) {
    return (value as { entry: unknown[] }).entry.length;
  }

  return 0;
}

export function extractD360WebhookDiagnostics(
  payload: D360WebhookPayload,
): D360SafeWebhookDiagnostics {
  const value = payload.value;

  return {
    bodyLength: payload.bodyLength,
    topLevelKeyCount:
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? Object.keys(value).length
        : 0,
    entryCount: getEntryCount(value),
    hasMessages: containsPropertyName(value, "messages"),
    hasStatuses: containsPropertyName(value, "statuses"),
    hasSmbMessageEchoes: containsPropertyName(value, "smb_message_echoes"),
    hasHistorySync: containsPropertyName(value, "history_sync"),
  };
}

export async function validateD360WebhookRequest(
  request: Request,
  source: NodeJS.ProcessEnv = process.env,
): Promise<D360WebhookValidationResult> {
  const resolution = resolveD360ProviderConfig(source);

  if (!resolution.configured) {
    return {
      valid: false,
      errorCode: "D360_WEBHOOK_CONFIGURATION_ERROR",
      httpStatus: 503,
      missing: resolution.missing,
      invalid: resolution.invalid,
    };
  }

  const credential = parseBasicAuthorization(request.headers.get("authorization"));

  if (!credential) {
    return {
      valid: false,
      errorCode: "D360_WEBHOOK_AUTH_MISSING",
      httpStatus: 401,
      missing: [],
      invalid: [],
    };
  }

  if (!isValidBasicCredential(credential, resolution.config)) {
    return {
      valid: false,
      errorCode: "D360_WEBHOOK_AUTH_INVALID",
      httpStatus: 401,
      missing: [],
      invalid: [],
    };
  }

  const rawBody = await request.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {
      valid: false,
      errorCode: "D360_WEBHOOK_INVALID_JSON",
      httpStatus: 400,
      missing: [],
      invalid: [],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      errorCode: "D360_WEBHOOK_INVALID_JSON",
      httpStatus: 400,
      missing: [],
      invalid: [],
    };
  }

  const payload: D360WebhookPayload = {
    bodyLength: rawBody.length,
    value: parsed,
  };

  return {
    valid: true,
    payload,
    diagnostics: extractD360WebhookDiagnostics(payload),
  };
}

function getProviderErrorStatus(error: ProviderErrorLike): number | null {
  const status =
    typeof error.status === "number"
      ? error.status
      : typeof error.statusCode === "number"
        ? error.statusCode
        : typeof error.response?.status === "number"
          ? error.response.status
          : null;

  return status !== null && Number.isFinite(status) ? status : null;
}

function readErrorStringProperty(
  error: unknown,
  propertyName: "name" | "message",
): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const value = (error as Record<string, unknown>)[propertyName];
  return typeof value === "string" ? value : null;
}

function isFetchTransportError(error: unknown): boolean {
  const name = readErrorStringProperty(error, "name");
  const message = readErrorStringProperty(error, "message") ?? "";

  if (name === "AbortError" || name === "TimeoutError") {
    return true;
  }

  if (name === "TypeError") {
    return FETCH_TRANSPORT_ERROR_PATTERN.test(message);
  }

  return false;
}

export function normalizeD360ProviderError(error: unknown): D360ProviderError {
  if (error instanceof D360ProviderError) {
    return error;
  }

  const errorLike =
    typeof error === "object" && error !== null
      ? (error as ProviderErrorLike)
      : {};
  const status = getProviderErrorStatus(errorLike);

  if (status === 429) {
    return new D360ProviderError("D360_PROVIDER_RATE_LIMITED", true);
  }

  if (status === 401 || status === 403) {
    return new D360ProviderError("D360_PROVIDER_UNAUTHORIZED", false);
  }

  if (status === 400 || status === 404 || status === 422) {
    return new D360ProviderError("D360_PROVIDER_INVALID_REQUEST", false);
  }

  if (status !== null && status >= 500) {
    return new D360ProviderError("D360_PROVIDER_TEMPORARY_FAILURE", true);
  }

  if (status !== null && status >= 400) {
    return new D360ProviderError("D360_PROVIDER_REJECTED", false);
  }

  if (isFetchTransportError(error)) {
    return new D360ProviderError("D360_PROVIDER_TEMPORARY_FAILURE", true);
  }

  return new D360ProviderError("D360_PROVIDER_UNEXPECTED_ERROR", true);
}

function normalizeOutboundProbeBody(body?: string | null): string {
  const normalized = (body ?? DEFAULT_PROBE_BODY).trim();

  if (!normalized || normalized.length > PROBE_BODY_MAX_LENGTH) {
    throw new D360ProviderError("D360_PROVIDER_INVALID_REQUEST");
  }

  return normalized;
}

async function parseProviderJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readFirstProviderMessage(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !Array.isArray((value as Record<string, unknown>).messages)
  ) {
    return null;
  }

  const [firstMessage] = (value as { messages: unknown[] }).messages;

  if (
    typeof firstMessage !== "object" ||
    firstMessage === null ||
    Array.isArray(firstMessage)
  ) {
    return null;
  }

  return firstMessage as Readonly<Record<string, unknown>>;
}

function readFirstProviderMessageId(value: unknown): string | null {
  const firstMessage = readFirstProviderMessage(value);
  const idValue = firstMessage?.id;

  if (typeof idValue !== "string") {
    return null;
  }

  const id = idValue.trim();
  return id || null;
}

function readProviderMessageStatus(value: unknown): string | null {
  const firstMessage = readFirstProviderMessage(value);
  const status = firstMessage?.message_status;

  if (typeof status !== "string") {
    return null;
  }

  const trimmed = status.trim();
  return trimmed || null;
}

export async function sendD360OnboardingProviderProbe(
  options: SendD360OnboardingProbeOptions = {},
): Promise<D360OnboardingProbeResult> {
  const source = options.source ?? process.env;
  const config = requireD360ProviderConfig(source);

  if (config.trpEnvironment === "production") {
    throw new D360ProviderError("D360_PROVIDER_PROBE_NOT_ALLOWED");
  }

  const to = normalizeD360Recipient(
    options.to ?? readOptionalEnvString(source, "D360_ONBOARDING_TO") ?? "",
  );
  const body = normalizeOutboundProbeBody(
    options.body ?? readOptionalEnvString(source, "D360_ONBOARDING_PROBE_BODY"),
  );
  const fetcher = options.fetch ?? fetch;

  try {
    const response = await fetcher(D360_MESSAGES_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: JSON_CONTENT_TYPE,
        "Content-Type": JSON_CONTENT_TYPE,
        "D360-API-KEY": config.apiKey,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toD360RecipientNumber(to),
        type: "text",
        text: { body },
      }),
    });

    if (!response.ok) {
      throw normalizeD360ProviderError({ status: response.status });
    }

    const responseBody = await parseProviderJson(response);
    const providerMessageId = readFirstProviderMessageId(responseBody);

    if (!providerMessageId) {
      throw new D360ProviderError("D360_PROVIDER_UNEXPECTED_ERROR", true);
    }

    return {
      providerMessageId,
      providerStatus: readProviderMessageStatus(responseBody),
    };
  } catch (error) {
    throw normalizeD360ProviderError(error);
  }
}
