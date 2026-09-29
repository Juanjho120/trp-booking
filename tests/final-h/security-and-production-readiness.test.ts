import assert from "node:assert/strict";

import { test } from "./harness";
import { readRepoFile } from "./test-utils";

test("security headers remain configured for the app and service worker", () => {
  const nextConfig = readRepoFile("next.config.ts");

  for (const expectedHeader of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Frame-Options",
    "Cache-Control",
  ]) {
    assert.ok(
      nextConfig.includes(expectedHeader),
      `next.config.ts should keep ${expectedHeader}`,
    );
  }

  assert.ok(nextConfig.includes("/sw.js"));
});

test("ADMIN route middleware and mutation same-origin boundary remain present", () => {
  const middleware = readRepoFile("middleware.ts");
  const sameOrigin = readRepoFile("lib/admin/same-origin.ts");

  assert.ok(middleware.includes('matcher: ["/admin/:path*"]'));
  assert.ok(middleware.includes("ADMIN_ROLE"));
  assert.ok(sameOrigin.includes("isValidAdminMutationOrigin"));
  assert.ok(sameOrigin.includes("environmentConfig.test.applicationUrl"));
  assert.ok(sameOrigin.includes("environmentConfig.production.applicationUrl"));
  assert.ok(sameOrigin.includes("validateServerEnv"));
  assert.ok(sameOrigin.includes("isLocalDevelopmentOrigin"));
  assert.ok(sameOrigin.includes('request.headers.get("origin")'));
});

test("Final-H security ledger categorizes blockers and Phase-13 carry-forwards", () => {
  const finalH = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  assert.ok(finalH.includes("Blockers before Phase 13"));
  assert.ok(finalH.includes("Phase-13 carry-forward"));
  assert.ok(finalH.includes("Accepted/no action"));
  assert.ok(finalH.includes("no applicable blocker remains open"));
});

test("Production carry-forward inventory remains documentation-only before Phase 13", () => {
  const finalH = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  for (const expected of [
    "company-owned Vercel",
    "company-owned Supabase",
    "company-owned Tilopay",
    "company-owned Resend",
    "company-owned Zoho",
    "company-owned Cloudinary",
    "company Google/Auth identity",
    "Production DNS",
  ]) {
    assert.ok(finalH.includes(expected), `docs/211 should carry forward ${expected}`);
  }

  assert.ok(finalH.includes("Do not perform these actions in Final-H"));
});
