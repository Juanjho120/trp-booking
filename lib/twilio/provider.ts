import twilio from "twilio";

import type { TrpEnvironment } from "@/lib/env/server";

export const TWILIO_INBOUND_WEBHOOK_PATH = "/api/twilio/whatsapp/inbound";
export const TWILIO_STATUS_WEBHOOK_PATH = "/api/twilio/whatsapp/status";

const TWILIO_SIGNATURE_HEADER = "x-twilio-signature";
const DEFAULT_PROBE_BODY = "TRP Booking Twilio Sandbox onboarding probe.";
const PROBE_BODY_MAX_LENGTH = 320;
export const WHATSAPP_FREEFORM_BODY_MAX_LENGTH = 1600;
const SAFE_DIAGNOSTIC_VALUE_MAX_LENGTH = 160;
const TWILIO_ACCOUNT_SID_PATTERN = /^AC[0-9a-fA-F]{32}$/;
const TWILIO_MESSAGE_SID_PATTERN = /^(SM|MM)[0-9a-fA-F]{32}$/;
const WHATSAPP_E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const TRP_ENVIRONMENTS = new Set(["local", "test", "production"]);

const FORM_URLENCODED_CONTENT_TYPE = "application/x-www-form-urlencoded";
const JSON_CONTENT_TYPE = "application/json";

export type TwilioProviderErrorCode =
  | "TWILIO_PROVIDER_CONFIGURATION_ERROR"
  | "TWILIO_PROVIDER_INVALID_REQUEST"
  | "TWILIO_PROVIDER_RATE_LIMITED"
  | "TWILIO_PROVIDER_TEMPORARY_FAILURE"
  | "TWILIO_PROVIDER_REJECTED"
  | "TWILIO_PROVIDER_UNEXPECTED_ERROR"
  | "TWILIO_PROVIDER_PROBE_NOT_ALLOWED";

const SAFE_PROVIDER_ERROR_MESSAGES: Readonly<
  Record<TwilioProviderErrorCode, string>
> = {
  TWILIO_PROVIDER_CONFIGURATION_ERROR:
    "Twilio provider configuration is incomplete or invalid.",
  TWILIO_PROVIDER_INVALID_REQUEST: "The Twilio provider request is invalid.",
  TWILIO_PROVIDER_RATE_LIMITED: "The Twilio provider rate limit was reached.",
  TWILIO_PROVIDER_TEMPORARY_FAILURE:
    "The Twilio provider is temporarily unavailable.",
  TWILIO_PROVIDER_REJECTED: "The Twilio provider rejected the request.",
  TWILIO_PROVIDER_UNEXPECTED_ERROR:
    "The Twilio provider returned an unexpected error.",
  TWILIO_PROVIDER_PROBE_NOT_ALLOWED:
    "The Twilio Sandbox provider probe is not allowed in this environment.",
};

export class TwilioProviderError extends Error {
  readonly code: TwilioProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: TwilioProviderErrorCode, retryable = false) {
    super(SAFE_PROVIDER_ERROR_MESSAGES[code]);
    this.name = "TwilioProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type TwilioProviderConfig = Readonly<{
  trpEnvironment: TrpEnvironment;
  accountSid: string;
  authToken: string;
  whatsappFrom: `whatsapp:${string}`;
  webhookBaseUrl: string | null;
}>;

export type TwilioConfigResolution =
  | Readonly<{
      configured: true;
      config: TwilioProviderConfig;
    }>
  | Readonly<{
      configured: false;
      missing: readonly string[];
      invalid: readonly string[];
      trpEnvironment: TrpEnvironment | null;
    }>;

export type TwilioWebhookValidationResult =
  | Readonly<{
      valid: true;
      canonicalUrl: string;
      payload: TwilioWebhookPayload;
    }>
  | Readonly<{
      valid: false;
      errorCode:
        | "TWILIO_WEBHOOK_CONFIGURATION_ERROR"
        | "TWILIO_WEBHOOK_SIGNATURE_MISSING"
        | "TWILIO_WEBHOOK_SIGNATURE_INVALID";
      httpStatus: 400 | 403 | 503;
      missing: readonly string[];
      invalid: readonly string[];
    }>;

export type TwilioWebhookPayload = Readonly<{
  contentType: "form" | "json" | "unknown";
  params: Readonly<Record<string, string | readonly string[]>>;
  bodyLength: number;
}>;

export type TwilioSafeWebhookDiagnostics = Readonly<{
  messageSid?: string;
  messageStatus?: string;
  errorCode?: string;
  numMedia?: string;
  hasFromAddress: boolean;
  hasToAddress: boolean;
  hasBody: boolean;
  bodyLength: number;
  extraParamCount: number;
}>;

export type TwilioMessageClient = Readonly<{
  messages: Readonly<{
    create: (
      input: TwilioOutboundMessageRequest,
    ) => Promise<Readonly<{ sid?: string | null; status?: string | null }>>;
  }>;
}>;

type TwilioOutboundMessageRequest = Readonly<{
  from: `whatsapp:${string}`;
  to: `whatsapp:${string}`;
  body: string;
  statusCallback?: string;
}>;

export type SendTwilioSandboxProbeOptions = Readonly<{
  to?: string;
  body?: string;
  source?: NodeJS.ProcessEnv;
  client?: TwilioMessageClient;
}>;

export type TwilioSandboxProbeResult = Readonly<{
  providerMessageId: string | null;
  providerStatus: string | null;
  statusCallbackUrl: string | null;
}>;

export type SendTwilioWhatsAppFreeformMessageOptions = Readonly<{
  to: string;
  body: string;
  statusCallbackUrl?: string | null;
  source?: NodeJS.ProcessEnv;
  client?: TwilioMessageClient;
}>;

export type TwilioWhatsAppFreeformMessageResult = Readonly<{
  providerMessageSid: string;
  providerStatus: string | null;
  statusCallbackUrl: string | null;
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
    return isLocalDevelopmentOrigin(baseUrl) || baseUrl === "https://trp-booking.juantzun.dev";
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

export function normalizeTwilioWhatsappAddress(
  value: string,
): `whatsapp:${string}` {
  const trimmed = value.trim();
  const rawNumber = trimmed.toLowerCase().startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length)
    : trimmed;
  const compactNumber = rawNumber.replace(/[\s().-]/g, "");

  if (!WHATSAPP_E164_PATTERN.test(compactNumber)) {
    throw new TwilioProviderError("TWILIO_PROVIDER_INVALID_REQUEST");
  }

  return `whatsapp:${compactNumber}`;
}

export function resolveTwilioProviderConfig(
  source: NodeJS.ProcessEnv = process.env,
): TwilioConfigResolution {
  const missing: string[] = [];
  const invalid: string[] = [];
  const trpEnvironment = readTrpEnvironment(source);

  if (!trpEnvironment) {
    invalid.push("TRP_ENVIRONMENT");
  }

  const accountSid = readOptionalEnvString(source, "TWILIO_ACCOUNT_SID");
  const authToken = readOptionalEnvString(source, "TWILIO_AUTH_TOKEN");
  const whatsappFrom = readOptionalEnvString(source, "TWILIO_WHATSAPP_FROM");
  const webhookBaseUrl = normalizeCanonicalOrigin(
    readOptionalEnvString(source, "TWILIO_WEBHOOK_BASE_URL"),
  );

  if (!accountSid) {
    missing.push("TWILIO_ACCOUNT_SID");
  } else if (!TWILIO_ACCOUNT_SID_PATTERN.test(accountSid)) {
    invalid.push("TWILIO_ACCOUNT_SID");
  }

  if (!authToken) {
    missing.push("TWILIO_AUTH_TOKEN");
  } else if (/\s/.test(authToken)) {
    invalid.push("TWILIO_AUTH_TOKEN");
  }

  if (!whatsappFrom) {
    missing.push("TWILIO_WHATSAPP_FROM");
  }

  if (
    readOptionalEnvString(source, "TWILIO_WEBHOOK_BASE_URL") &&
    (!webhookBaseUrl ||
      !trpEnvironment ||
      !isValidConfiguredWebhookBaseUrl(webhookBaseUrl, trpEnvironment))
  ) {
    invalid.push("TWILIO_WEBHOOK_BASE_URL");
  }

  let normalizedFrom: `whatsapp:${string}` | null = null;
  if (whatsappFrom) {
    try {
      normalizedFrom = normalizeTwilioWhatsappAddress(whatsappFrom);
    } catch {
      invalid.push("TWILIO_WHATSAPP_FROM");
    }
  }

  if (
    missing.length > 0 ||
    invalid.length > 0 ||
    !trpEnvironment ||
    !accountSid ||
    !authToken ||
    !normalizedFrom
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
      accountSid,
      authToken,
      whatsappFrom: normalizedFrom,
      webhookBaseUrl,
    },
  };
}

export function requireTwilioProviderConfig(
  source: NodeJS.ProcessEnv = process.env,
): TwilioProviderConfig {
  const resolution = resolveTwilioProviderConfig(source);

  if (!resolution.configured) {
    throw new TwilioProviderError("TWILIO_PROVIDER_CONFIGURATION_ERROR");
  }

  return resolution.config;
}

export function createTwilioClient(
  config: TwilioProviderConfig = requireTwilioProviderConfig(),
): TwilioMessageClient {
  return twilio(config.accountSid, config.authToken) as TwilioMessageClient;
}

function appendRequestPathAndQuery(baseUrl: string, requestUrl: string): string {
  const incomingUrl = new URL(requestUrl);
  return `${baseUrl}${incomingUrl.pathname}${incomingUrl.search}`;
}

export function resolveTwilioWebhookValidationUrl(
  request: Request,
  config: TwilioProviderConfig,
): string | null {
  if (config.webhookBaseUrl) {
    return appendRequestPathAndQuery(config.webhookBaseUrl, request.url);
  }

  if (config.trpEnvironment === "local") {
    const incomingUrl = new URL(request.url);

    if (isLocalDevelopmentOrigin(incomingUrl.origin)) {
      return appendRequestPathAndQuery(incomingUrl.origin, request.url);
    }
  }

  return null;
}

function contentTypeIncludes(request: Request, expected: string): boolean {
  return request.headers
    .get("content-type")
    ?.toLowerCase()
    .includes(expected) ?? false;
}

function parseFormPayload(
  rawBody: string,
): Record<string, string | readonly string[]> {
  const parsed = new URLSearchParams(rawBody);
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of parsed.entries()) {
    const existing = params[key];

    if (existing === undefined) {
      params[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    params[key] = [existing, value];
  }

  return params;
}

function parseJsonPayload(
  rawBody: string,
): Record<string, string | readonly string[]> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      params[key] = String(value);
    }
  }

  return params;
}

function buildWebhookPayload(request: Request, rawBody: string): TwilioWebhookPayload {
  if (contentTypeIncludes(request, FORM_URLENCODED_CONTENT_TYPE)) {
    return {
      contentType: "form",
      params: parseFormPayload(rawBody),
      bodyLength: rawBody.length,
    };
  }

  if (contentTypeIncludes(request, JSON_CONTENT_TYPE)) {
    return {
      contentType: "json",
      params: parseJsonPayload(rawBody),
      bodyLength: rawBody.length,
    };
  }

  return {
    contentType: "unknown",
    params: {},
    bodyLength: rawBody.length,
  };
}

function shouldValidateWithRawBody(request: Request): boolean {
  const url = new URL(request.url);

  return (
    url.searchParams.has("bodySHA256") ||
    contentTypeIncludes(request, JSON_CONTENT_TYPE)
  );
}

export async function validateTwilioWebhookRequest(
  request: Request,
  source: NodeJS.ProcessEnv = process.env,
): Promise<TwilioWebhookValidationResult> {
  const resolution = resolveTwilioProviderConfig(source);

  if (!resolution.configured) {
    return {
      valid: false,
      errorCode: "TWILIO_WEBHOOK_CONFIGURATION_ERROR",
      httpStatus: 503,
      missing: resolution.missing,
      invalid: resolution.invalid,
    };
  }

  const canonicalUrl = resolveTwilioWebhookValidationUrl(
    request,
    resolution.config,
  );

  if (!canonicalUrl) {
    return {
      valid: false,
      errorCode: "TWILIO_WEBHOOK_CONFIGURATION_ERROR",
      httpStatus: 503,
      missing: ["TWILIO_WEBHOOK_BASE_URL"],
      invalid: [],
    };
  }

  const signature = request.headers.get(TWILIO_SIGNATURE_HEADER)?.trim();

  if (!signature) {
    return {
      valid: false,
      errorCode: "TWILIO_WEBHOOK_SIGNATURE_MISSING",
      httpStatus: 400,
      missing: [],
      invalid: [],
    };
  }

  const rawBody = await request.text();
  const payload = buildWebhookPayload(request, rawBody);
  const valid = shouldValidateWithRawBody(request)
    ? twilio.validateRequestWithBody(
        resolution.config.authToken,
        signature,
        canonicalUrl,
        rawBody,
      )
    : twilio.validateRequest(
        resolution.config.authToken,
        signature,
        canonicalUrl,
        payload.params,
      );

  if (!valid) {
    return {
      valid: false,
      errorCode: "TWILIO_WEBHOOK_SIGNATURE_INVALID",
      httpStatus: 403,
      missing: [],
      invalid: [],
    };
  }

  return {
    valid: true,
    canonicalUrl,
    payload,
  };
}

function readFirstParam(
  params: Readonly<Record<string, string | readonly string[]>>,
  key: string,
): string | null {
  const value = params[key];

  if (typeof value === "string") {
    return value;
  }

  return value?.[0] ?? null;
}

function safeDiagnosticValue(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, SAFE_DIAGNOSTIC_VALUE_MAX_LENGTH);
}

export function extractTwilioWebhookDiagnostics(
  payload: TwilioWebhookPayload,
): TwilioSafeWebhookDiagnostics {
  const params = payload.params;
  const messageSid = safeDiagnosticValue(
    readFirstParam(params, "MessageSid") ?? readFirstParam(params, "SmsMessageSid"),
  );
  const messageStatus = safeDiagnosticValue(
    readFirstParam(params, "MessageStatus") ?? readFirstParam(params, "SmsStatus"),
  );
  const errorCode = safeDiagnosticValue(readFirstParam(params, "ErrorCode"));
  const numMedia = safeDiagnosticValue(readFirstParam(params, "NumMedia"));
  const safeKnownKeys = new Set([
    "MessageSid",
    "SmsMessageSid",
    "MessageStatus",
    "SmsStatus",
    "ErrorCode",
    "NumMedia",
    "From",
    "To",
    "Body",
  ]);

  return {
    ...(messageSid ? { messageSid } : {}),
    ...(messageStatus ? { messageStatus } : {}),
    ...(errorCode ? { errorCode } : {}),
    ...(numMedia ? { numMedia } : {}),
    hasFromAddress: Boolean(readFirstParam(params, "From")),
    hasToAddress: Boolean(readFirstParam(params, "To")),
    hasBody: Boolean(readFirstParam(params, "Body")),
    bodyLength: readFirstParam(params, "Body")?.length ?? 0,
    extraParamCount: Object.keys(params).filter((key) => !safeKnownKeys.has(key))
      .length,
  };
}

type ProviderErrorLike = Readonly<{
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
}>;

function getProviderErrorStatus(error: ProviderErrorLike): number | null {
  const status =
    typeof error.status === "number"
      ? error.status
      : typeof error.statusCode === "number"
        ? error.statusCode
        : null;

  return status !== null && Number.isFinite(status) ? status : null;
}

export function normalizeTwilioProviderError(error: unknown): TwilioProviderError {
  if (error instanceof TwilioProviderError) {
    return error;
  }

  const errorLike =
    typeof error === "object" && error !== null
      ? (error as ProviderErrorLike)
      : {};
  const status = getProviderErrorStatus(errorLike);

  if (status === 429) {
    return new TwilioProviderError("TWILIO_PROVIDER_RATE_LIMITED", true);
  }

  if (status === 401 || status === 403) {
    return new TwilioProviderError("TWILIO_PROVIDER_CONFIGURATION_ERROR", false);
  }

  if (status === 400 || status === 404 || status === 422) {
    return new TwilioProviderError("TWILIO_PROVIDER_INVALID_REQUEST", false);
  }

  if (status !== null && status >= 500) {
    return new TwilioProviderError("TWILIO_PROVIDER_TEMPORARY_FAILURE", true);
  }

  if (status !== null && status >= 400) {
    return new TwilioProviderError("TWILIO_PROVIDER_REJECTED", false);
  }

  return new TwilioProviderError("TWILIO_PROVIDER_UNEXPECTED_ERROR", true);
}

function normalizeOutboundProbeBody(body?: string): string {
  const normalized = (body ?? DEFAULT_PROBE_BODY).trim();

  if (!normalized || normalized.length > PROBE_BODY_MAX_LENGTH) {
    throw new TwilioProviderError("TWILIO_PROVIDER_INVALID_REQUEST");
  }

  return normalized;
}

function normalizeOutboundFreeformBody(body: string): string {
  const normalized = body.trim();

  if (!normalized || normalized.length > WHATSAPP_FREEFORM_BODY_MAX_LENGTH) {
    throw new TwilioProviderError("TWILIO_PROVIDER_INVALID_REQUEST");
  }

  return normalized;
}

function resolveStatusCallbackUrl(config: TwilioProviderConfig): string | null {
  return config.webhookBaseUrl
    ? `${config.webhookBaseUrl}${TWILIO_STATUS_WEBHOOK_PATH}`
    : null;
}

export async function sendTwilioSandboxProviderProbe(
  options: SendTwilioSandboxProbeOptions = {},
): Promise<TwilioSandboxProbeResult> {
  const source = options.source ?? process.env;
  const config = requireTwilioProviderConfig(source);

  if (config.trpEnvironment === "production") {
    throw new TwilioProviderError("TWILIO_PROVIDER_PROBE_NOT_ALLOWED");
  }

  const to = normalizeTwilioWhatsappAddress(
    options.to ?? readOptionalEnvString(source, "TWILIO_ONBOARDING_TO") ?? "",
  );
  const body = normalizeOutboundProbeBody(
    options.body ?? readOptionalEnvString(source, "TWILIO_ONBOARDING_PROBE_BODY") ?? undefined,
  );
  const statusCallbackUrl = resolveStatusCallbackUrl(config);
  const client = options.client ?? createTwilioClient(config);

  try {
    const response = await client.messages.create({
      from: config.whatsappFrom,
      to,
      body,
      ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
    });

    return {
      providerMessageId: response.sid ?? null,
      providerStatus: response.status ?? null,
      statusCallbackUrl,
    };
  } catch (error) {
    throw normalizeTwilioProviderError(error);
  }
}

export async function sendTwilioWhatsAppFreeformMessage(
  options: SendTwilioWhatsAppFreeformMessageOptions,
): Promise<TwilioWhatsAppFreeformMessageResult> {
  const config = requireTwilioProviderConfig(options.source ?? process.env);
  const to = normalizeTwilioWhatsappAddress(options.to);
  const body = normalizeOutboundFreeformBody(options.body);
  const statusCallbackUrl =
    options.statusCallbackUrl === undefined
      ? resolveStatusCallbackUrl(config)
      : options.statusCallbackUrl;
  const client = options.client ?? createTwilioClient(config);

  try {
    const response = await client.messages.create({
      from: config.whatsappFrom,
      to,
      body,
      ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
    });
    const providerMessageSid = response.sid?.trim() ?? "";

    if (!TWILIO_MESSAGE_SID_PATTERN.test(providerMessageSid)) {
      throw new TwilioProviderError("TWILIO_PROVIDER_UNEXPECTED_ERROR", true);
    }

    return {
      providerMessageSid,
      providerStatus: response.status ?? null,
      statusCallbackUrl,
    };
  } catch (error) {
    throw normalizeTwilioProviderError(error);
  }
}
