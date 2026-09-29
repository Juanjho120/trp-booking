import assert from "node:assert/strict";

import { test } from "./harness";
import { readRepoFile } from "./test-utils";

test("Final-G public cache domains remain stable and exclude live transactional availability", () => {
  const publicCache = readRepoFile("lib/public-cache.ts");
  const availabilityRoute = readRepoFile("app/api/availability/route.ts");
  const blockedDatesRoute = readRepoFile("app/api/availability/blocked-dates/route.ts");

  for (const domain of ["properties", "location", "reviews"]) {
    assert.ok(publicCache.includes(domain), `public cache should include ${domain}`);
  }

  assert.ok(publicCache.includes("revalidateTag"));
  assert.ok(publicCache.includes("revalidatePath"));
  assert.ok(availabilityRoute.includes('dynamic = "force-dynamic"'));
  assert.ok(blockedDatesRoute.includes('dynamic = "force-dynamic"'));
  assert.ok(availabilityRoute.includes("getAvailabilityBlockingRecords"));
  assert.ok(blockedDatesRoute.includes("getAvailabilityBlockingRecords"));
});

test("Admin route entrypoints do not import broad admin barrels or public caches", () => {
  const adminFiles = [
    "app/admin/page.tsx",
    "app/admin/reservations/page.tsx",
    "app/admin/calendar/page.tsx",
    "app/admin/payments/page.tsx",
    "app/admin/reviews/page.tsx",
    "app/admin/notifications/page.tsx",
    "app/admin/cron-jobs/page.tsx",
  ];

  for (const relativePath of adminFiles) {
    const content = readRepoFile(relativePath);

    assert.equal(content.includes('from "@/features/admin"'), false);
    assert.equal(content.includes('from "@/lib/admin"'), false);
    assert.equal(content.includes("unstable_cache"), false);
    assert.equal(content.includes("public-cache"), false);
  }
});

test("Tilopay SDK and token-cache boundaries stay server-only and persistence-free", () => {
  const sdkClient = readRepoFile(
    "features/payments/components/tilopay-sdk-checkout.tsx",
  );
  const tokenCache = readRepoFile("lib/payments/tilopay-sdk-token-cache.ts");

  assert.ok(
    sdkClient.includes("https://app.tilopay.com/sdk/v2/sdk_tpay.min.js"),
  );
  assert.equal(sdkClient.includes("Date.now()"), false);
  assert.ok(sdkClient.includes("tilopaySdkScriptLoadPromise"));

  assert.ok(tokenCache.includes("TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS = 90_000"));
  assert.ok(tokenCache.includes("inFlightRefresh"));

  for (const forbidden of ["localStorage", "sessionStorage", "Redis", "redis", "KV"]) {
    assert.equal(tokenCache.includes(forbidden), false);
  }
});

test("Final-H document carries forward accepted Final-G performance boundaries", () => {
  const finalH = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  for (const expected of [
    "public stable cache architecture",
    "listing/detail graph split",
    "one availability calendar initially",
    "blocked-dates duplicate-query correction",
    "Tilopay performance hardening",
    "Admin direct route imports",
    "Admin no-stale-cache boundary",
  ]) {
    assert.ok(finalH.includes(expected), `docs/211 should mention ${expected}`);
  }
});
