import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const ADMIN_COMPONENTS = "features/admin/components";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function expectNotIncludes(source: string, rejected: string): void {
  assert.ok(!source.includes(rejected), `Expected source to omit: ${rejected}`);
}

function blockBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end + endMarker.length);
}

test("I.6.8 accommodations page removes only redundant presentation copy", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);

  expectNotIncludes(source, "{copy.overview.notes.readonlyBoundaries}");
  expectNotIncludes(source, "{copy.preparation.badge}");
  expectIncludes(source, "{copy.overview.statuses[property.status]}");
  expectIncludes(source, "{copy.overview.actions.editContent}");
  expectIncludes(source, "{copy.overview.actions.manageAmenitiesRules}");
  expectIncludes(source, "{copy.overview.actions.manageArrivalInstructions}");
  expectIncludes(source, "{copy.preparation.title}");
  expectIncludes(source, "<AdminAccommodationSettings");
  expectIncludes(source, "initialSettings={initialPreparationSettings}");
  assert.equal((source.match(/forceMount/g) ?? []).length, 2);
});

test("I.6.8 calendar integrations use controlled shared tabs without header/info cards", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-calendar-integrations-page.tsx`);

  for (const expected of [
    'import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";',
    '<Tabs\n          className="mb-5"',
    "onValueChange={setSelectedPropertyId}",
    "value={selectedIntegration.property.id}",
    '<div className="-mx-1 overflow-x-auto px-1 pb-2">',
    "<TabsList",
    "inline-flex h-auto min-w-max justify-start gap-1",
    "<TabsTrigger",
    'className="min-h-10 shrink-0"',
    "{locale === \"en\" ? property.nameEn : property.nameEs}",
    "{copy.values.airbnb}",
    "inboundBadgeVariant",
    "outboundBadgeVariant",
  ]) {
    expectIncludes(source, expected);
  }

  for (const rejected of [
    "badge={copy.badge}",
    "ShieldCheck",
    "Database",
    "copy.notes.secretSafeTitle",
    "copy.notes.independentDirectionsTitle",
    "aria-pressed",
    'variant={active ? "default" : "outline"}',
    'role="group"',
  ]) {
    expectNotIncludes(source, rejected);
  }
});

test("I.6.8 FEL tabs keep natural width while panels remain full-width", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-fel-page.tsx`);
  const tabsBlock = blockBetween(
    source,
    '<Tabs\n        className="grid gap-6"',
    '<TabsContent className="grid gap-6" value="new">',
  );

  expectIncludes(tabsBlock, 'className="h-auto w-fit justify-self-start"');
  expectIncludes(tabsBlock, 'className="min-h-10 shrink-0" value="new"');
  expectIncludes(tabsBlock, 'className="min-h-10 shrink-0" value="history"');
  expectIncludes(source, '<TabsContent className="grid gap-6" value="new">');
  expectIncludes(source, '<TabsContent className="grid gap-6" value="history">');
});

test("I.6.8 admin calendar still re-reads server state after write operations", () => {
  const page = read("app/admin/calendar/page.tsx");
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);
  const manualBlocksRoute = read("app/api/admin/calendar/manual-blocks/route.ts");
  const unlockRoute = read("app/api/admin/preparation-buffers/unlock/route.ts");

  expectIncludes(page, 'export const dynamic = "force-dynamic";');
  expectIncludes(calendar, "await executeMutation(");
  expectIncludes(calendar, "router.refresh();");
  expectIncludes(manualBlocksRoute, "createAdminManualCalendarBlock");
  expectIncludes(manualBlocksRoute, "releaseAdminManualCalendarBlockDay");
  expectIncludes(unlockRoute, "unlockAdminPreparationBufferDay");
  expectIncludes(unlockRoute, "restoreAdminPreparationBufferDay");
});

test("I.6.8 calendar performance record preserves accepted availability architecture", () => {
  const propertyCalendar = read("lib/admin/property-calendar.ts");
  const availability = read("lib/availability/service.ts");
  const docs = read("docs/222-final-i-6-8-admin-calendar-ux-cleanup-and-performance.md");

  expectIncludes(propertyCalendar, "getAvailabilityBlockingRecords");
  expectIncludes(propertyCalendar, "Promise.all([");
  expectIncludes(availability, "prismaClient.reservation.findMany");
  expectIncludes(availability, "prismaClient.calendarBlock.findMany");
  expectIncludes(availability, "prismaClient.lifecycleRequestHold.findMany");
  expectNotIncludes(propertyCalendar, "unstable_cache");
  expectNotIncludes(propertyCalendar, "localStorage");
  expectIncludes(docs, "G.4 historical black-white September 2026 median");
  expectIncludes(docs, "No persistent cache, Redis, localStorage, CDN cache, or unstable_cache");
});
