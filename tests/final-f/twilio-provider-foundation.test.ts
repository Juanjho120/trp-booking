import assert from "node:assert/strict";

import twilio from "twilio";

import { POST as inboundPost } from "@/app/api/twilio/whatsapp/inbound/route";
import { POST as statusPost } from "@/app/api/twilio/whatsapp/status/route";
import {
  extractTwilioWebhookDiagnostics,
  normalizeTwilioWhatsappAddress,
  resolveTwilioProviderConfig,
  sendTwilioSandboxProviderProbe,
  TwilioProviderError,
  validateTwilioWebhookRequest,
} from "@/lib/twilio/provider";

import { test } from "./harness";

const AUTH_TOKEN = "twilio-test-auth-token";
const ENV = {
  TRP_ENVIRONMENT: "test",
  TWILIO_ACCOUNT_SID: ["A", "C", "1".repeat(32)].join(""),
  TWILIO_AUTH_TOKEN: AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: "whatsapp:+15005550006",
  TWILIO_WEBHOOK_BASE_URL: "https://trp-booking.juantzun.dev",
} satisfies NodeJS.ProcessEnv;

function formRequest(
  url: string,
  body: URLSearchParams,
  signatureUrl: string,
  signature = twilio.getExpectedTwilioSignature(
    AUTH_TOKEN,
    signatureUrl,
    Object.fromEntries(body.entries()),
  ),
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body: body.toString(),
  });
}

function jsonRequest(
  url: string,
  body: string,
  signatureUrl: string,
  signature = twilio.getExpectedTwilioSignature(AUTH_TOKEN, signatureUrl, {}),
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-twilio-signature": signature,
    },
    body,
  });
}

function expectTwilioError(code: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof TwilioProviderError && error.code === code;
}

async function withTwilioRouteEnv<T>(run: () => Promise<T>): Promise<T> {
  const originalEnv = {
    TRP_ENVIRONMENT: process.env.TRP_ENVIRONMENT,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_WEBHOOK_BASE_URL: process.env.TWILIO_WEBHOOK_BASE_URL,
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

test("F.2 resolves Twilio config only when optional Sandbox values are complete", () => {
  const missing = resolveTwilioProviderConfig({ TRP_ENVIRONMENT: "test" });

  assert.equal(missing.configured, false);
  if (!missing.configured) {
    assert.deepEqual(missing.missing, [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
    ]);
  }

  const configured = resolveTwilioProviderConfig(ENV);

  assert.equal(configured.configured, true);
  if (configured.configured) {
    assert.equal(configured.config.trpEnvironment, "test");
    assert.equal(configured.config.webhookBaseUrl, "https://trp-booking.juantzun.dev");
    assert.equal(configured.config.whatsappFrom, "whatsapp:+15005550006");
  }
});

test("F.2 normalizes WhatsApp addresses without accepting non-E.164 input", () => {
  assert.equal(
    normalizeTwilioWhatsappAddress(" WHATSAPP:+1 500-555-0001 "),
    "whatsapp:+15005550001",
  );
  assert.throws(
    () => normalizeTwilioWhatsappAddress("whatsapp:5555-1234"),
    expectTwilioError("TWILIO_PROVIDER_INVALID_REQUEST"),
  );
});

test("F.2 accepts a valid form-urlencoded webhook signed for the canonical Test URL", async () => {
  const requestUrl =
    "http://spoofed.example/api/twilio/whatsapp/inbound?source=sandbox";
  const canonicalUrl =
    "https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound?source=sandbox";
  const body = new URLSearchParams({
    MessageSid: "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    From: "whatsapp:+15005550001",
    To: "whatsapp:+15005550006",
    Body: "hola desde sandbox",
    NumMedia: "0",
    UnexpectedFutureParam: "accepted-without-breaking",
  });
  const result = await validateTwilioWebhookRequest(
    formRequest(requestUrl, body, canonicalUrl),
    ENV,
  );

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.canonicalUrl, canonicalUrl);
    assert.equal(result.payload.params.Body, "hola desde sandbox");
    assert.equal(result.payload.params.UnexpectedFutureParam, "accepted-without-breaking");
    assert.deepEqual(extractTwilioWebhookDiagnostics(result.payload), {
      messageSid: "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      numMedia: "0",
      hasFromAddress: true,
      hasToAddress: true,
      hasBody: true,
      bodyLength: "hola desde sandbox".length,
      extraParamCount: 1,
    });
  }
});

test("F.2 rejects missing and invalid Twilio webhook signatures before diagnostics are trusted", async () => {
  const url = "https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound";
  const body = new URLSearchParams({
    MessageSid: "SMbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });
  const missingSignature = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const missing = await validateTwilioWebhookRequest(missingSignature, ENV);

  assert.equal(missing.valid, false);
  if (!missing.valid) {
    assert.equal(missing.errorCode, "TWILIO_WEBHOOK_SIGNATURE_MISSING");
    assert.equal(missing.httpStatus, 400);
  }

  const invalid = await validateTwilioWebhookRequest(
    formRequest(url, body, url, "not-a-valid-signature"),
    ENV,
  );

  assert.equal(invalid.valid, false);
  if (!invalid.valid) {
    assert.equal(invalid.errorCode, "TWILIO_WEBHOOK_SIGNATURE_INVALID");
    assert.equal(invalid.httpStatus, 403);
  }
});

test("F.2 validates JSON webhooks through bodySHA256 without provider calls", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  const rawBody = JSON.stringify({
    MessageSid: "SMcccccccccccccccccccccccccccccccc",
    MessageStatus: "delivered",
    ExtraProviderField: "safe",
  });
  const bodyHash = twilio.getExpectedBodyHash(rawBody);
  const requestUrl =
    `https://trp-booking.juantzun.dev/api/twilio/whatsapp/status?bodySHA256=${bodyHash}`;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("UNEXPECTED_PROVIDER_CALL");
  }) as typeof fetch;

  try {
    const result = await validateTwilioWebhookRequest(
      jsonRequest(requestUrl, rawBody, requestUrl),
      ENV,
    );

    assert.equal(result.valid, true);
    assert.equal(fetchCalls, 0);
    if (result.valid) {
      assert.equal(result.payload.contentType, "json");
      assert.equal(result.payload.params.MessageStatus, "delivered");
      assert.equal(result.payload.params.ExtraProviderField, "safe");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("F.2 safely fails webhook validation when Twilio config is absent", async () => {
  const url = "https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound";
  const body = new URLSearchParams({
    MessageSid: "SMdddddddddddddddddddddddddddddddd",
  });
  const result = await validateTwilioWebhookRequest(
    formRequest(url, body, url),
    { TRP_ENVIRONMENT: "test" },
  );

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.errorCode, "TWILIO_WEBHOOK_CONFIGURATION_ERROR");
    assert.equal(result.httpStatus, 503);
  }
});

test("F.2 inbound route returns empty Messaging TwiML only after a valid signature", async () => {
  await withTwilioRouteEnv(async () => {
    const url = "https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound";
    const body = new URLSearchParams({
      MessageSid: "SMeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      From: "whatsapp:+15005550001",
      To: "whatsapp:+15005550006",
      Body: "private guest text",
      NumMedia: "0",
    });
    const response = await inboundPost(formRequest(url, body, url));
    const responseBody = await response.text();

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "text/xml; charset=utf-8",
    );
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(responseBody, "<Response></Response>");
    assert.equal(responseBody.includes("private guest text"), false);
    assert.equal(responseBody.includes("+15005550001"), false);
    assert.equal(responseBody.includes("SMeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"), false);

    const invalid = await inboundPost(
      formRequest(url, body, url, "not-a-valid-signature"),
    );

    assert.equal(invalid.status, 403);
    assert.deepEqual(await invalid.json(), {
      error: { code: "TWILIO_WEBHOOK_SIGNATURE_INVALID" },
    });
  });
});

test("F.2 status callback route returns no content only after a valid signature", async () => {
  await withTwilioRouteEnv(async () => {
    const url = "https://trp-booking.juantzun.dev/api/twilio/whatsapp/status";
    const body = new URLSearchParams({
      MessageSid: "SMffffffffffffffffffffffffffffffff",
      MessageStatus: "delivered",
      To: "whatsapp:+15005550001",
    });
    const response = await statusPost(formRequest(url, body, url));

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(await response.text(), "");

    const invalid = await statusPost(
      formRequest(url, body, url, "not-a-valid-signature"),
    );

    assert.equal(invalid.status, 403);
    assert.deepEqual(await invalid.json(), {
      error: { code: "TWILIO_WEBHOOK_SIGNATURE_INVALID" },
    });
  });
});

test("F.2 Sandbox provider probe is Local/Test only and uses an injected client in tests", async () => {
  let sentMessage: unknown = null;
  const client = {
    messages: {
      async create(input: unknown) {
        sentMessage = input;
        return { sid: "SMprobe", status: "queued" };
      },
    },
  };
  const result = await sendTwilioSandboxProviderProbe({
    source: {
      ...ENV,
      TWILIO_ONBOARDING_TO: "whatsapp:+15005550001",
    },
    client,
  });

  assert.equal(result.providerMessageId, "SMprobe");
  assert.equal(result.providerStatus, "queued");
  assert.equal(
    result.statusCallbackUrl,
    "https://trp-booking.juantzun.dev/api/twilio/whatsapp/status",
  );
  assert.deepEqual(sentMessage, {
    from: "whatsapp:+15005550006",
    to: "whatsapp:+15005550001",
    body: "TRP Booking Twilio Sandbox onboarding probe.",
    statusCallback: "https://trp-booking.juantzun.dev/api/twilio/whatsapp/status",
  });

  await assert.rejects(
    () =>
      sendTwilioSandboxProviderProbe({
        source: {
          ...ENV,
          TRP_ENVIRONMENT: "production",
          TWILIO_WEBHOOK_BASE_URL: "https://turefugioperfecto.com",
          TWILIO_ONBOARDING_TO: "whatsapp:+15005550001",
        },
        client,
      }),
    expectTwilioError("TWILIO_PROVIDER_PROBE_NOT_ALLOWED"),
  );
});
