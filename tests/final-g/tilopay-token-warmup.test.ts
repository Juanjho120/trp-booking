import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { handleTilopaySdkTokenWarmupRequest } from "@/app/api/payments/tilopay/warmup/route";
import {
  createTilopaySdkTokenCache,
  resolveTilopaySdkTokenUsableUntil,
  TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
  type TilopaySdkTokenProviderResponse,
} from "@/lib/payments/tilopay-sdk-token-cache";

import { test } from "./harness";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function token(
  accessToken: string,
  expiresIn: unknown,
): TilopaySdkTokenProviderResponse {
  return { accessToken, expiresIn };
}

test("G.3 caches reusable Tilopay SDK tokens with the documented safety buffer", async () => {
  let nowMs = 1_000_000;
  let calls = 0;
  const cache = createTilopaySdkTokenCache({
    now: () => nowMs,
    requestToken: async () => {
      calls += 1;
      return token(`sdk-token-${calls}`, 3_600);
    },
  });

  const first = await cache.getToken();
  const second = await cache.getToken();

  assert.equal(first.token, "sdk-token-1");
  assert.equal(first.source, "provider-refresh");
  assert.equal(second.token, "sdk-token-1");
  assert.equal(second.source, "cache-hit");
  assert.equal(calls, 1);

  nowMs += 3_600_000 - TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS + 1;

  const afterSafetyWindow = await cache.getToken();

  assert.equal(afterSafetyWindow.token, "sdk-token-2");
  assert.equal(afterSafetyWindow.source, "provider-refresh");
  assert.equal(calls, 2);
});

test("G.3 parses numeric, numeric-string and provider datetime SDK token expiry shapes", () => {
  const nowMs = Date.parse("2026-09-28T12:00:00.000Z");

  assert.equal(
    resolveTilopaySdkTokenUsableUntil(3_600, nowMs),
    nowMs + 3_600_000 - TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
  );
  assert.equal(
    resolveTilopaySdkTokenUsableUntil("3600", nowMs),
    nowMs + 3_600_000 - TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
  );
  assert.equal(
    resolveTilopaySdkTokenUsableUntil("2026-09-28 13:00:00", nowMs),
    Date.parse("2026-09-28T13:00:00.000Z") -
      TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
  );
});

test("G.3 returns invalid-expiry Tilopay SDK tokens fresh but does not reuse them", async () => {
  let calls = 0;
  const cache = createTilopaySdkTokenCache({
    requestToken: async () => {
      calls += 1;
      return token(`uncached-token-${calls}`, "not-a-provider-expiry");
    },
  });

  const first = await cache.getToken();
  const second = await cache.getToken();

  assert.equal(first.token, "uncached-token-1");
  assert.equal(first.source, "provider-refresh-uncached");
  assert.equal(second.token, "uncached-token-2");
  assert.equal(second.source, "provider-refresh-uncached");
  assert.equal(calls, 2);
});

test("G.3 deduplicates concurrent Tilopay SDK token refreshes", async () => {
  let calls = 0;
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const cache = createTilopaySdkTokenCache({
    requestToken: async () => {
      calls += 1;
      await refreshGate;
      return token("deduped-token", 3_600);
    },
  });

  const requests = Promise.all([
    cache.getToken(),
    cache.getToken(),
    cache.getToken(),
  ]);

  assert.equal(calls, 1);
  releaseRefresh();

  const results = await requests;

  assert.deepEqual(
    results.map((result) => result.token),
    ["deduped-token", "deduped-token", "deduped-token"],
  );
  assert.equal(calls, 1);
});

test("G.3 failed Tilopay SDK token refreshes clear the in-flight state for retry", async () => {
  let calls = 0;
  const cache = createTilopaySdkTokenCache({
    requestToken: async () => {
      calls += 1;

      if (calls === 1) {
        throw new Error("provider unavailable");
      }

      return token("recovered-token", 3_600);
    },
  });

  await assert.rejects(() => cache.getToken(), /provider unavailable/);

  const recovered = await cache.getToken();

  assert.equal(recovered.token, "recovered-token");
  assert.equal(recovered.source, "provider-refresh");
  assert.equal(calls, 2);
});

test("G.3 warm-up API returns bounded no-store responses without exposing SDK tokens", async () => {
  const response = await handleTilopaySdkTokenWarmupRequest(async () => ({
    source: "cache-hit",
  }));
  const payload = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(payload, {
    ready: true,
    source: "cache-hit",
  });
  assert.equal("token" in payload, false);
  assert.doesNotMatch(JSON.stringify(payload), /secret|access_token/i);
});

test("G.3 warm-up API failure remains bounded and token-free", async () => {
  const response = await handleTilopaySdkTokenWarmupRequest(async () => {
    throw new Error("provider-secret-token-value");
  });
  const payload = await readJson(response);
  const serializedPayload = JSON.stringify(payload);

  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(payload, {
    ready: false,
    error: { code: "TILOPAY_SDK_TOKEN_WARMUP_UNAVAILABLE" },
  });
  assert.doesNotMatch(serializedPayload, /provider-secret-token-value/);
  assert.doesNotMatch(serializedPayload, /access_token/i);
});

test("G.3 repeated warm-up calls reuse the server token cache without business side effects", async () => {
  let providerCalls = 0;
  const cache = createTilopaySdkTokenCache({
    requestToken: async () => {
      providerCalls += 1;
      return token("warm-cache-token", 3_600);
    },
  });
  const warmup = async () => {
    const result = await cache.getToken();
    return { source: result.source };
  };

  const first = await readJson(await handleTilopaySdkTokenWarmupRequest(warmup));
  const second = await readJson(await handleTilopaySdkTokenWarmupRequest(warmup));

  assert.equal(providerCalls, 1);
  assert.equal(first.source, "provider-refresh");
  assert.equal(second.source, "cache-hit");

  const route = readSource("app/api/payments/tilopay/warmup/route.ts");

  assert.doesNotMatch(route, /prisma|PaymentAttempt|Payment\b|Reservation\b/);
  assert.doesNotMatch(route, /providerReference|preflight|Tilopay\.Init|startPayment/);
  assert.doesNotMatch(route, /request\.json\(|request\.text\(|headers\(\)/);
});

test("G.3 client warm-up helper is best-effort and keeps browser state token-free", () => {
  const helper = readSource("features/payments/lib/tilopay-sdk-token-warmup.ts");

  assert.match(helper, /^"use client";/);
  assert.match(helper, /\/api\/payments\/tilopay\/warmup/);
  assert.match(helper, /method: "POST"/);
  assert.match(helper, /cache: "no-store"/);
  assert.match(helper, /\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(helper, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(helper, /setState|useState|toast|throw new Error/);
});

test("G.3 warms Tilopay SDK token only from payable payment surfaces", () => {
  const reservationForm = readSource(
    "features/reservations/components/reservation-request-form.tsx",
  );
  const retryPage = readSource("features/payments/components/payment-retry-page.tsx");
  const additionalChargePage = readSource(
    "features/payments/components/additional-charge-payment-page.tsx",
  );
  const lifecyclePage = readSource(
    "features/payments/components/lifecycle-adjustment-payment-page.tsx",
  );

  assert.match(reservationForm, /useTilopaySdkTokenWarmup\(Boolean\(pendingHold\)\)/);
  assert.match(retryPage, /useTilopaySdkTokenWarmup\(Boolean\(reservationId\)\)/);
  assert.match(
    additionalChargePage,
    /const payable = Boolean\(\s*summary\?\.payable && paymentToken && !paid && !expired && !cancelled,\s*\)/,
  );
  assert.match(additionalChargePage, /useTilopaySdkTokenWarmup\(payable\)/);
  assert.match(
    lifecyclePage,
    /const lifecyclePayable = Boolean\(\s*summary\?\.payable && !approved && !errorMessage,\s*\)/,
  );
  assert.match(lifecyclePage, /useTilopaySdkTokenWarmup\(lifecyclePayable\)/);
});

test("G.3 keeps Tilopay SDK token cache server-owned and out of manifests/client helpers", () => {
  const cache = readSource("lib/payments/tilopay-sdk-token-cache.ts");
  const session = readSource("lib/payments/tilopay-sdk-session.ts");
  const checkout = readSource("features/payments/components/tilopay-sdk-checkout.tsx");

  assert.match(cache, /let cachedToken: string \| null = null/);
  assert.match(cache, /let inFlightRefresh: Promise<TilopaySdkTokenCacheResult> \| null = null/);
  assert.match(cache, /expires_in/);
  assert.match(session, /getCachedTilopaySdkToken/);
  assert.match(session, /Promise\.all\(\[\s*ensurePaymentProviderReference/s);
  assert.doesNotMatch(checkout, /warmTilopaySdkToken|cachedToken|getCachedTilopaySdkToken/);
  assert.equal(
    existsSync(path.join(ROOT, "prisma", "migrations", "20260928_final_g_3_tilopay_token_cache")),
    false,
  );
});
