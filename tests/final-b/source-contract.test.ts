import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}


function metadataBlocks(value: string): string[] {
  const blocks: string[] = [];
  let cursor = 0;

  while (true) {
    const start = value.indexOf("metadata:", cursor);
    if (start < 0) {
      break;
    }

    const braceStart = value.indexOf("{", start);
    if (braceStart < 0) {
      break;
    }

    let depth = 0;
    let end = braceStart;
    for (; end < value.length; end += 1) {
      const char = value[end];
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    blocks.push(value.slice(start, end));
    cursor = end;
  }

  return blocks;
}

const externalCalendarRoutes = [
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/import-url/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/import-test/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/import-sync/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/import-enabled/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/export-url/copy/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/export-url/rotate/route.ts",
  "app/api/admin/calendar-integrations/[propertyId]/airbnb/export-enabled/route.ts",
] as const;

test("Prisma enforces one durable external calendar per property/provider", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(
    schema,
    /@@unique\(\[propertyId, provider\], map: "external_calendars_property_id_provider_key"\)/,
  );
});

test("central server environment keeps the 32-byte canonical Base64 encryption-key contract", () => {
  const envSource = source("lib/env/server.ts");

  assert.match(envSource, /EXTERNAL_CALENDAR_ENCRYPTION_KEY/);
  assert.equal(
    envSource.includes(
      "/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(value)",
    ),
    true,
  );
  assert.equal(
    envSource.includes(
      '"Must be exactly 32 random bytes encoded as canonical Base64."',
    ),
    true,
  );
});

test("all seven Final-B admin endpoints independently enforce session, Zod validation and same-origin", () => {
  for (const routePath of externalCalendarRoutes) {
    const route = source(routePath);
    assert.match(route, /getAdminSessionActor/);
    assert.match(route, /safeParse/);
    assert.match(route, /isValidAdminMutationOrigin/);
  }
});

test("per-card manual import sync remains ADMIN-triggered and scoped to one calendar id", () => {
  const scheduledSync = source("lib/airbnb-ical/scheduled-sync.ts");
  const inbound = source("lib/admin/external-calendar-inbound.ts");

  assert.match(
    scheduledSync,
    /externalCalendarIds:\s*\[input\.externalCalendarId\][\s\S]*triggeredBy:\s*CalendarSyncTriggeredBy\.ADMIN/,
  );
  assert.match(
    inbound,
    /syncAirbnbIcalCalendarManually\(\{\s*externalCalendarId:\s*calendar\.id/,
  );
  assert.equal(inbound.includes("SYNC_AIRBNB_CALENDARS"), false);
});

test("Copy URL fails closed when the encrypted raw-token copy is unavailable", () => {
  const outbound = source("lib/admin/external-calendar-outbound.ts");
  assert.match(
    outbound,
    /if \(!calendar\.exportTokenEncrypted\)[\s\S]*ADMIN_EXTERNAL_CALENDAR_EXPORT_COPY_UNAVAILABLE/,
  );
});

test("outbound Copy URL is environment-canonical, .ics suffixed and never Host-derived", () => {
  const outbound = source("lib/admin/external-calendar-outbound.ts");
  assert.match(outbound, /environmentConfig\.test\.applicationUrl/);
  assert.match(outbound, /environmentConfig\.production\.applicationUrl/);
  assert.match(outbound, /\/api\/ical\/\$\{rawToken\}\.ics/);
  assert.equal(outbound.includes('headers.get("host")'), false);
  assert.equal(outbound.includes("headers.get('host')"), false);
});

test("outbound token rotation atomically replaces hash, encrypted token and rotation timestamp", () => {
  const service = source("lib/external-calendars/outbound-token-service.ts");
  assert.match(service, /exportTokenHash:\s*tokenMaterial\.tokenHash/);
  assert.match(service, /exportTokenEncrypted:\s*tokenMaterial\.encryptedToken/);
  assert.match(service, /exportTokenLastRotatedAt:\s*now/);
  assert.match(service, /updatedAt:\s*input\.expectedUpdatedAt/);
});

test("public iCal route preserves generic 404 and no-store behavior", () => {
  const route = source("app/api/ical/[token]/route.ts");
  assert.match(route, /Calendar feed not found/);
  assert.match(route, /status:\s*404/);
  assert.match(route, /cache-control":\s*"no-store, max-age=0"/);
  assert.match(route, /catch\s*\{/);
});

test("normal admin integration DTO type excludes secret-bearing fields", () => {
  const dto = source("types/admin-external-calendar-integration.ts");

  for (const forbidden of [
    "importUrlEncrypted",
    "exportTokenHash",
    "exportTokenEncrypted",
    "rawToken",
    "fullPrivateOutboundUrl",
  ]) {
    assert.equal(dto.includes(forbidden), false, forbidden);
  }
});

test("audit metadata implementations contain only the frozen safe evidence fields", () => {
  const inbound = source("lib/admin/external-calendar-inbound.ts");
  const outbound = source("lib/admin/external-calendar-outbound.ts");
  const tokenService = source("lib/external-calendars/outbound-token-service.ts");
  const combined = `${inbound}\n${outbound}\n${tokenService}`;

  const blocks = metadataBlocks(combined);
  assert.ok(blocks.length > 0);

  for (const block of blocks) {
    for (const forbiddenMetadataKey of [
      "importUrl",
      "rawToken",
      "exportTokenHash",
      "exportTokenEncrypted",
      "outboundUrl",
      "encryptionKey",
      "encryptedUrl",
      "candidateImportUrl",
    ]) {
      assert.equal(
        new RegExp(`\\b${forbiddenMetadataKey}\\s*:`).test(block),
        false,
        forbiddenMetadataKey,
      );
    }
  }

  for (const requiredAction of [
    "EXTERNAL_CALENDAR_IMPORT_URL_SAVED",
    "EXTERNAL_CALENDAR_IMPORT_URL_REPLACED",
    "EXTERNAL_CALENDAR_IMPORT_CONNECTION_TESTED",
    "EXTERNAL_CALENDAR_IMPORT_SYNC_REQUESTED",
    "EXTERNAL_CALENDAR_IMPORT_ENABLED",
    "EXTERNAL_CALENDAR_IMPORT_DISABLED",
    "EXTERNAL_CALENDAR_EXPORT_TOKEN_GENERATED",
    "EXTERNAL_CALENDAR_EXPORT_TOKEN_ROTATED",
    "EXTERNAL_CALENDAR_EXPORT_URL_COPIED",
    "EXTERNAL_CALENDAR_EXPORT_ENABLED",
    "EXTERNAL_CALENDAR_EXPORT_DISABLED",
  ]) {
    assert.ok(combined.includes(requiredAction), requiredAction);
  }
});

test("integration UI never uses native confirm and copies the private URL without storing it in state", () => {
  const component = source(
    "features/admin/components/admin-calendar-integrations-page.tsx",
  );
  assert.equal(component.includes("confirm("), false);
  assert.match(component, /navigator\.clipboard\.writeText\(payload\.url\)/);
  assert.equal(component.includes("setExportUrl"), false);
});

test("Test Vercel configuration still has zero scheduler registrations", () => {
  const vercel = JSON.parse(source("vercel.json")) as { crons?: unknown[] };
  assert.deepEqual(vercel.crons, []);
});
