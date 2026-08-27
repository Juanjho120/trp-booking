import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("admin pricing mutations require admin session and same-origin validation", () => {
  const route = source("app/api/admin/pricing/route.ts");

  assert.match(route, /getAdminSessionActor/);
  assert.match(route, /isValidAdminMutationOrigin/);
  assert.match(route, /ADMIN_PRICING_ORIGIN_INVALID/);
  assert.match(route, /z\.discriminatedUnion/);
});

test("seasonal pricing mutations use a bounded Serializable transaction boundary", () => {
  const pricing = source("lib/admin/pricing.ts");

  assert.match(
    pricing,
    /Prisma\.TransactionIsolationLevel\.Serializable/,
  );
  assert.match(pricing, /SERIALIZABLE_ATTEMPTS = 2/);
  assert.match(pricing, /P2034/);
});

test("active seasonal overlap uses half-open same-Property range checks", () => {
  const pricing = source("lib/admin/pricing.ts");

  assert.match(pricing, /assertNoActiveSeasonalOverlap/);
  assert.match(pricing, /propertyId: input\.propertyId/);
  assert.match(pricing, /startDate: \{ lt: toDateOnlyDate\(input\.endDate\) \}/);
  assert.match(pricing, /endDate: \{ gt: toDateOnlyDate\(input\.startDate\) \}/);
  assert.match(pricing, /ADMIN_PRICING_SEASONAL_OVERLAP/);
});

test("restored seasonal rules return disabled for explicit review", () => {
  const pricing = source("lib/admin/pricing.ts");

  assert.match(pricing, /SEASONAL_PRICING_RULE_RESTORED/);
  assert.match(pricing, /deletedAt: null,\s*isEnabled: false/);
  assert.match(pricing, /restoredEnabled: false/);
});

test("LOS admin management keeps the frozen tier set and durable identity", () => {
  const pricing = source("lib/admin/pricing.ts");
  const types = source("types/pricing.ts");

  assert.match(types, /2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*15,\s*30/);
  assert.match(pricing, /propertyId_minimumNights/);
  assert.doesNotMatch(pricing, /lengthOfStayPricingRule\.delete/);
});

test("pricing mutations persist safe AdminAuditLog evidence", () => {
  const pricing = source("lib/admin/pricing.ts");

  assert.match(pricing, /SEASONAL_PRICING_RULE_CREATED/);
  assert.match(pricing, /SEASONAL_PRICING_RULE_SOFT_DELETED/);
  assert.match(pricing, /LOS_PRICING_RULE_CREATED/);
  assert.match(pricing, /LOS_PRICING_RULE_ENABLED_CHANGED/);
  assert.match(pricing, /adminAuditLog\.create/);
});

test("admin preview delegates resolution to the central C.3 pricing engine", () => {
  const pricing = source("lib/admin/pricing.ts");
  const previewRoute = source("app/api/admin/pricing/preview/route.ts");

  assert.match(pricing, /calculateStayPricing/);
  assert.match(pricing, /previewAdminPricing/);
  assert.match(previewRoute, /previewAdminPricing/);
  assert.doesNotMatch(previewRoute, /baseNightlyPrice\s*\*/);
});

test("admin pricing UI is localized, linked from accommodations, and avoids native confirmations", () => {
  const component = source(
    "features/admin/components/admin-pricing-manager.tsx",
  );
  const accommodations = source(
    "features/admin/components/admin-accommodation-management.tsx",
  );
  const es = source("messages/es.ts");
  const en = source("messages/en.ts");

  assert.match(component, /messages\.admin\.accommodations\.pricing/);
  assert.match(component, /<Sheet/);
  assert.doesNotMatch(component, /confirm\(|alert\(|prompt\(/);
  assert.match(accommodations, /\/pricing/);
  assert.match(accommodations, /managePricing/);
  assert.match(es, /managePricing: "Administrar precios"/);
  assert.match(en, /managePricing: "Manage pricing"/);
});
