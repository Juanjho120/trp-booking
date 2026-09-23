import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { POST as d360WebhookPost } from "@/app/api/360dialog/whatsapp/webhook/route";
import {
  D360_MESSAGES_ENDPOINT,
  D360_WEBHOOK_PATH,
  D360ProviderError,
  extractD360WebhookDiagnostics,
  normalizeD360ProviderError,
  normalizeD360Recipient,
  resolveD360ProviderConfig,
  sendD360OnboardingProviderProbe,
  validateD360WebhookRequest,
} from "@/lib/360dialog/provider";

import { test } from "./harness";

const API_KEY = "d360-test-api-key";
const WEBHOOK_USERNAME = "trp-d360-webhook";
const WEBHOOK_PASSWORD = "d360-webhook-password-32-characters-minimum";
const WEBHOOK_URL =
  "https://trp-booking.juantzun.dev/api/360dialog/whatsapp/webhook";
const ENV = {
  TRP_ENVIRONMENT: "test",
  D360_API_KEY: API_KEY,
  D360_WEBHOOK_BASE_URL: "https://trp-booking.juantzun.dev",
  D360_WEBHOOK_USERNAME: WEBHOOK_USERNAME,
  D360_WEBHOOK_PASSWORD: WEBHOOK_PASSWORD,
  D360_ONBOARDING_TO: "+50255550123",
  D360_ONBOARDING_PROBE_BODY:
    "TRP Booking 360dialog Coexistence onboarding probe.",
} satisfies NodeJS.ProcessEnv;

function basicAuth(username = WEBHOOK_USERNAME, password = WEBHOOK_PASSWORD): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

function jsonWebhookRequest(body: string, authorization = basicAuth()): Request {
  return new Request(WEBHOOK_URL, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body,
  });
}

function expectD360Error(code: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof D360ProviderError && error.code === code;
}

async function withD360RouteEnv<T>(run: () => Promise<T>): Promise<T> {
  const originalEnv = {
    TRP_ENVIRONMENT: process.env.TRP_ENVIRONMENT,
    D360_API_KEY: process.env.D360_API_KEY,
    D360_WEBHOOK_BASE_URL: process.env.D360_WEBHOOK_BASE_URL,
    D360_WEBHOOK_USERNAME: process.env.D360_WEBHOOK_USERNAME,
    D360_WEBHOOK_PASSWORD: process.env.D360_WEBHOOK_PASSWORD,
    D360_ONBOARDING_TO: process.env.D360_ONBOARDING_TO,
    D360_ONBOARDING_PROBE_BODY: process.env.D360_ONBOARDING_PROBE_BODY,
  };

  Object.assign(process.env, ENV);

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("F.R2 resolves 360dialog config only when optional Coexistence values are complete", () => {
  const missing = resolveD360ProviderConfig({ TRP_ENVIRONMENT: "test" });

  assert.equal(missing.configured, false);
  if (!missing.configured) {
    assert.deepEqual(missing.missing, [
      "D360_API_KEY",
      "D360_WEBHOOK_BASE_URL",
      "D360_WEBHOOK_USERNAME",
      "D360_WEBHOOK_PASSWORD",
    ]);
  }

  const configured = resolveD360ProviderConfig(ENV);

  assert.equal(configured.configured, true);
  if (configured.configured) {
    assert.equal(configured.config.trpEnvironment, "test");
    assert.equal(configured.config.webhookBaseUrl, "https://trp-booking.juantzun.dev");
    assert.equal(configured.config.webhookUsername, WEBHOOK_USERNAME);
  }
});

test("F.R2 rejects unsafe 360dialog webhook origins and weak Basic Auth secrets", () => {
  const invalid = resolveD360ProviderConfig({
    ...ENV,
    D360_WEBHOOK_BASE_URL:
      "https://trp-booking.juantzun.dev/api/360dialog/whatsapp/webhook",
    D360_WEBHOOK_USERNAME: "bad:username",
    D360_WEBHOOK_PASSWORD: "too-short",
  });

  assert.equal(invalid.configured, false);
  if (!invalid.configured) {
    assert.deepEqual(invalid.invalid, [
      "D360_WEBHOOK_BASE_URL",
      "D360_WEBHOOK_USERNAME",
      "D360_WEBHOOK_PASSWORD",
    ]);
  }
});

test("F.R2 normalizes 360dialog onboarding recipients without accepting local numbers", () => {
  assert.equal(normalizeD360Recipient(" +502 5555-0123 "), "+50255550123");
  assert.throws(
    () => normalizeD360Recipient("5555-0123"),
    expectD360Error("D360_PROVIDER_INVALID_REQUEST"),
  );
});

test("F.R2 sends the 360dialog onboarding probe through the official messages endpoint", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;

    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        messages: [
          {
            id: "wamid.HBgMNTDUMMYPROBE",
            message_status: "accepted",
          },
        ],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  const result = await sendD360OnboardingProviderProbe({
    source: ENV,
    fetch: fetcher,
  });

  assert.equal(result.providerMessageId, "wamid.HBgMNTDUMMYPROBE");
  assert.equal(result.providerStatus, "accepted");
  assert.equal(requestUrl, D360_MESSAGES_ENDPOINT);
  assert.equal(requestInit?.method, "POST");

  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("D360-API-KEY"), API_KEY);
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(typeof requestInit?.body, "string");

  const requestBodyText = requestInit?.body as string;
  assert.equal(requestBodyText.includes(API_KEY), false);
  assert.deepEqual(JSON.parse(requestBodyText), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "50255550123",
    type: "text",
    text: { body: ENV.D360_ONBOARDING_PROBE_BODY },
  });
});

test("F.R2 reads 360dialog provider status only from the first response message", async () => {
  const result = await sendD360OnboardingProviderProbe({
    source: ENV,
    fetch: (async () =>
      new Response(
        JSON.stringify({
          messaging_product: "whatsapp",
          messages: [{ id: "wamid.HBgMNTDUMMYPROBE" }],
          message_status: "accepted",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )) as typeof fetch,
  });

  assert.equal(result.providerMessageId, "wamid.HBgMNTDUMMYPROBE");
  assert.equal(result.providerStatus, null);
});

test("F.R2 refuses the 360dialog onboarding probe in production", async () => {
  let fetchCalls = 0;

  await assert.rejects(
    () =>
      sendD360OnboardingProviderProbe({
        source: {
          ...ENV,
          TRP_ENVIRONMENT: "production",
          D360_WEBHOOK_BASE_URL: "https://turefugioperfecto.com",
        },
        fetch: (async () => {
          fetchCalls += 1;
          return new Response(null, { status: 200 });
        }) as typeof fetch,
      }),
    expectD360Error("D360_PROVIDER_PROBE_NOT_ALLOWED"),
  );
  assert.equal(fetchCalls, 0);
});

test("F.R2 maps 360dialog provider failures to bounded safe error codes", () => {
  assert.deepEqual(
    {
      code: normalizeD360ProviderError({ status: 401 }).code,
      retryable: normalizeD360ProviderError({ status: 401 }).retryable,
    },
    { code: "D360_PROVIDER_UNAUTHORIZED", retryable: false },
  );
  assert.deepEqual(
    {
      code: normalizeD360ProviderError({ status: 429 }).code,
      retryable: normalizeD360ProviderError({ status: 429 }).retryable,
    },
    { code: "D360_PROVIDER_RATE_LIMITED", retryable: true },
  );
  assert.deepEqual(
    {
      code: normalizeD360ProviderError({ status: 503 }).code,
      retryable: normalizeD360ProviderError({ status: 503 }).retryable,
    },
    { code: "D360_PROVIDER_TEMPORARY_FAILURE", retryable: true },
  );
});

test("F.R2 maps fetch transport failures to retryable temporary provider failures", async () => {
  await assert.rejects(
    () =>
      sendD360OnboardingProviderProbe({
        source: ENV,
        fetch: (async () => {
          throw new TypeError("fetch failed");
        }) as typeof fetch,
      }),
    (error: unknown) =>
      error instanceof D360ProviderError &&
      error.code === "D360_PROVIDER_TEMPORARY_FAILURE" &&
      error.retryable,
  );
});

test("F.R2 requires a nonblank 360dialog provider message id as probe success evidence", async () => {
  await assert.rejects(
    () =>
      sendD360OnboardingProviderProbe({
        source: ENV,
        fetch: (async () =>
          new Response(JSON.stringify({ messages: [{}] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })) as typeof fetch,
      }),
    expectD360Error("D360_PROVIDER_UNEXPECTED_ERROR"),
  );
});

test("F.R2 rejects missing and invalid 360dialog webhook Basic Auth", async () => {
  const missing = await validateD360WebhookRequest(
    new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    ENV,
  );

  assert.equal(missing.valid, false);
  if (!missing.valid) {
    assert.equal(missing.errorCode, "D360_WEBHOOK_AUTH_MISSING");
    assert.equal(missing.httpStatus, 401);
  }

  const invalid = await validateD360WebhookRequest(
    jsonWebhookRequest("{}", basicAuth(WEBHOOK_USERNAME, "wrong-password")),
    ENV,
  );

  assert.equal(invalid.valid, false);
  if (!invalid.valid) {
    assert.equal(invalid.errorCode, "D360_WEBHOOK_AUTH_INVALID");
    assert.equal(invalid.httpStatus, 401);
  }
});

test("F.R2 accepts authenticated 360dialog JSON webhooks and exposes only safe diagnostics", async () => {
  const rawBody = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ text: { body: "guest private text" } }],
              statuses: [{ status: "sent" }],
              smb_message_echoes: [{ text: { body: "business app text" } }],
              history_sync: [{ metadata: "not persisted" }],
            },
          },
        ],
      },
    ],
  });
  const result = await validateD360WebhookRequest(
    jsonWebhookRequest(rawBody),
    ENV,
  );

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.diagnostics, {
      bodyLength: rawBody.length,
      topLevelKeyCount: 2,
      entryCount: 1,
      hasMessages: true,
      hasStatuses: true,
      hasSmbMessageEchoes: true,
      hasHistorySync: true,
    });
    assert.deepEqual(extractD360WebhookDiagnostics(result.payload), result.diagnostics);
    assert.equal(JSON.stringify(result.diagnostics).includes("guest private text"), false);
    assert.equal(JSON.stringify(result.diagnostics).includes("business app text"), false);
  }
});

test("F.R2 safely rejects malformed 360dialog webhook JSON after auth validation", async () => {
  const result = await validateD360WebhookRequest(
    jsonWebhookRequest("{not-json"),
    ENV,
  );

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.errorCode, "D360_WEBHOOK_INVALID_JSON");
    assert.equal(result.httpStatus, 400);
  }
});

test("F.R2 ACKs authenticated unknown 360dialog webhook events without leaking payload", async () => {
  await withD360RouteEnv(async () => {
    const response = await d360WebhookPost(
      jsonWebhookRequest(
        JSON.stringify({
          unknown_future_field: "private guest +50255550123 text",
        }),
      ),
    );
    const responseBody = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(responseBody, "");
    assert.equal(responseBody.includes("+50255550123"), false);
    assert.equal(responseBody.includes("private guest"), false);
  });
});

test("F.R2 webhook route fails closed when 360dialog config is absent", async () => {
  const result = await validateD360WebhookRequest(
    jsonWebhookRequest("{}"),
    { TRP_ENVIRONMENT: "test" },
  );

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.errorCode, "D360_WEBHOOK_CONFIGURATION_ERROR");
    assert.equal(result.httpStatus, 503);
  }
});

test("F.R2 webhook route returns safe errors for invalid auth and malformed JSON", async () => {
  await withD360RouteEnv(async () => {
    const invalidAuth = await d360WebhookPost(
      jsonWebhookRequest("{}", basicAuth("bad-user", "bad-password")),
    );

    assert.equal(invalidAuth.status, 401);
    assert.deepEqual(await invalidAuth.json(), {
      error: { code: "D360_WEBHOOK_AUTH_INVALID" },
    });

    const malformedJson = await d360WebhookPost(jsonWebhookRequest("{bad-json"));

    assert.equal(malformedJson.status, 400);
    assert.deepEqual(await malformedJson.json(), {
      error: { code: "D360_WEBHOOK_INVALID_JSON" },
    });
  });
});

test("F.R2 webhook route remains ACK-only and does not call persistence or Twilio processors", () => {
  const routeSource = readFileSync(
    "app/api/360dialog/whatsapp/webhook/route.ts",
    "utf8",
  );

  assert.equal(routeSource.includes("processInboundWhatsAppWebhook"), false);
  assert.equal(routeSource.includes("processTwilioWhatsAppStatusCallback"), false);
  assert.equal(routeSource.includes("prisma"), false);
  assert.equal(routeSource.includes("WhatsAppMessage"), false);
  assert.equal(routeSource.includes("validateD360WebhookRequest"), true);
});

test("F.R2 documents the 360dialog Developer/Test env contract without scheduling crons", () => {
  const envExample = readFileSync(".env.example", "utf8");
  const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons?: unknown[];
  };

  for (const key of [
    "D360_API_KEY",
    "D360_WEBHOOK_BASE_URL",
    "D360_WEBHOOK_USERNAME",
    "D360_WEBHOOK_PASSWORD",
    "D360_ONBOARDING_TO",
    "D360_ONBOARDING_PROBE_BODY",
  ]) {
    assert.equal(envExample.includes(key), true);
  }

  assert.equal(envExample.includes(D360_WEBHOOK_PATH), true);
  assert.deepEqual(vercelConfig, { crons: [] });
});
