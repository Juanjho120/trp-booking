import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ADMIN_CALENDAR_SKELETON_CELL_COUNT,
  ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT,
  clearAdminCalendarNavigationPending,
  createAdminCalendarHref,
  createAdminCalendarNavigationState,
  getVisibleAdminCalendarTarget,
  reconcileAdminCalendarNavigation,
  requestAdminCalendarNavigation,
} from "@/features/admin/lib/admin-calendar-navigation";
import {
  AUTHORIZED_ADMIN_CALENDAR_ROUTE_ORIGIN,
  isInvalidAdminCalendarRouteSampleStatus,
  resolveAuthorizedAdminCalendarRouteBaseUrl,
} from "../../scripts/measure-admin-property-calendar";

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
    "TabsContent",
    '<Tabs\n          className="mb-5 grid gap-5"',
    "onValueChange={setSelectedPropertyId}",
    "value={selectedIntegration.property.id}",
    '<div className="-mx-1 overflow-x-auto px-1 pb-2">',
    "<TabsList",
    "inline-flex h-auto min-w-max justify-start gap-1",
    "<TabsTrigger",
    'className="min-h-10 shrink-0"',
    "<TabsContent",
    "value={integration.property.id}",
    "integration.property.id === selectedIntegration.property.id",
    "integration={selectedIntegration}",
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
    '<div className="grid gap-5">',
  ]) {
    expectNotIncludes(source, rejected);
  }
});

test("I.6.8 calendar integration tabs render trigger and panel semantics", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      Tabs,
      { value: "black-white-apartment" },
      React.createElement(
        TabsList,
        { "aria-label": "Calendar integrations" },
        React.createElement(
          TabsTrigger,
          { value: "black-white-apartment" },
          "Black and White Apartment",
        ),
        React.createElement(
          TabsTrigger,
          { value: "perfect-retreat-bungalow" },
          "Perfect Retreat Bungalow",
        ),
      ),
      React.createElement(
        TabsContent,
        { value: "black-white-apartment" },
        "Selected integration",
      ),
    ),
  );

  assert.match(markup, /role="tablist"/);
  assert.match(markup, /role="tab"/);
  assert.match(markup, /role="tabpanel"/);
  assert.match(markup, /aria-controls=/);
  assert.match(markup, /aria-labelledby=/);
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

test("I.6.8 admin calendar navigation coordinator collapses rapid duplicate requests", () => {
  const confirmed = {
    month: "2026-10",
    propertyId: "black-white-apartment",
  };
  const requested = {
    month: "2026-10",
    propertyId: "perfect-retreat-bungalow",
  };
  let state = createAdminCalendarNavigationState(confirmed);
  let pushes = 0;

  for (let index = 0; index < 10; index += 1) {
    const decision = requestAdminCalendarNavigation(state, requested);
    state = decision.state;

    if (decision.shouldNavigate) {
      pushes += 1;
    }
  }

  assert.equal(pushes, 1);
  assert.deepEqual(getVisibleAdminCalendarTarget(state), requested);
  assert.equal(
    createAdminCalendarHref(requested),
    "/admin/calendar?propertyId=perfect-retreat-bungalow&month=2026-10",
  );
});

test("I.6.8 admin calendar navigation clears on confirmed, cancelled, and external navigation", () => {
  const confirmed = {
    month: "2026-10",
    propertyId: "black-white-apartment",
  };
  const requested = {
    month: "2026-11",
    propertyId: "black-white-apartment",
  };
  const external = {
    month: "2026-09",
    propertyId: "complete-retreat",
  };
  const decision = requestAdminCalendarNavigation(
    createAdminCalendarNavigationState(confirmed),
    requested,
  );

  assert.equal(decision.shouldNavigate, true);
  assert.deepEqual(
    reconcileAdminCalendarNavigation(decision.state, requested),
    createAdminCalendarNavigationState(requested),
  );
  assert.deepEqual(
    reconcileAdminCalendarNavigation(decision.state, external),
    createAdminCalendarNavigationState(external),
  );
  assert.deepEqual(
    clearAdminCalendarNavigationPending(decision.state),
    createAdminCalendarNavigationState(confirmed),
  );
});

test("I.6.8 admin calendar pending UX hides stale entries behind an accessible skeleton", () => {
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  expectIncludes(calendar, "useTransition");
  expectIncludes(calendar, "visibleTarget");
  expectIncludes(calendar, "isNavigationPending ? (");
  expectIncludes(calendar, "<AdminCalendarGridSkeleton");
  expectIncludes(calendar, "loadingLabel={copy.states.loading}");
  expectIncludes(calendar, 'aria-busy="true"');
  expectIncludes(calendar, 'aria-live="polite"');
  expectIncludes(calendar, "motion-reduce:animate-none");
  expectIncludes(calendar, "ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT");
  expectIncludes(calendar, "ADMIN_CALENDAR_SKELETON_CELL_COUNT");
  expectIncludes(calendar, "initialCalendar.days.map");
  expectIncludes(es, 'loading: "Cargando calendario..."');
  expectIncludes(en, 'loading: "Loading calendar..."');
  assert.equal(ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT, 7);
  assert.equal(ADMIN_CALENDAR_SKELETON_CELL_COUNT, 42);
});

test("I.6.8 admin calendar disables stale navigation and mutations while pending", () => {
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);
  const linkTabs = read(`${ADMIN_COMPONENTS}/admin-link-tabs.tsx`);

  expectIncludes(calendar, "isCalendarNavigationLocked");
  expectIncludes(calendar, "isCalendarInteractionLocked");
  expectIncludes(calendar, '"aria-disabled": isCalendarNavigationLocked');
  expectIncludes(calendar, "prefetch: false");
  expectIncludes(calendar, "tabIndex: isCalendarNavigationLocked ? -1 : undefined");
  expectIncludes(calendar, "preventLockedCalendarNavigation");
  expectIncludes(calendar, 'event.key === "Enter" || event.key === " "');
  expectIncludes(calendar, "busyKey !== null ||");
  expectIncludes(calendar, "pendingTargetRef.current");
  expectIncludes(calendar, "router.push(href, { scroll: false })");
  expectIncludes(calendar, "disabled={isCalendarInteractionLocked}");
  expectIncludes(calendar, "disabled={dayDisabled}");
  expectIncludes(calendar, "if (isCalendarInteractionLocked) {");
  expectIncludes(linkTabs, '"onClick"');
  expectIncludes(linkTabs, '"onKeyDown"');
  expectIncludes(linkTabs, '"prefetch"');
  expectIncludes(linkTabs, '"aria-disabled"');
});

test("I.6.8 admin calendar month controls share the same route coordinator", () => {
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);

  expectIncludes(calendar, "addMonths(visibleTarget.month, -1)");
  expectIncludes(calendar, "initialCalendar.today.slice(0, 7)");
  expectIncludes(calendar, "addMonths(visibleTarget.month, 1)");
  assert.equal(
    createAdminCalendarHref({
      month: "2026-11",
      propertyId: "complete-retreat",
    }),
    "/admin/calendar?propertyId=complete-retreat&month=2026-11",
  );
});

test("I.6.8 route timing accepts only the authorized Test origin", () => {
  const allowed = resolveAuthorizedAdminCalendarRouteBaseUrl(
    "https://trp-booking.juantzun.dev/admin/calendar?ignored=true#fragment",
  );

  assert.equal(allowed.origin, AUTHORIZED_ADMIN_CALENDAR_ROUTE_ORIGIN);
  assert.equal(allowed.protocol, "https:");
  assert.equal(allowed.username, "");
  assert.equal(allowed.password, "");
  assert.equal(allowed.search, "");
  assert.equal(allowed.hash, "");

  for (const rejected of [
    "http://trp-booking.juantzun.dev",
    "ftp://trp-booking.juantzun.dev",
    "https://turefugioperfecto.com",
    "https://admin:secret@trp-booking.juantzun.dev",
    "https://trp-booking.juantzun.dev.evil.example",
    "https://evil.example",
  ]) {
    assert.throws(() => resolveAuthorizedAdminCalendarRouteBaseUrl(rejected));
  }
});

test("I.6.8 route timing rejects redirect and authentication-failure samples", () => {
  for (const status of [301, 302, 307, 308, 401, 403]) {
    assert.equal(isInvalidAdminCalendarRouteSampleStatus(status), true);
  }

  for (const status of [200, 204, 404, 500]) {
    assert.equal(isInvalidAdminCalendarRouteSampleStatus(status), false);
  }
});

test("I.6.8 calendar performance record preserves accepted availability architecture", () => {
  const propertyCalendar = read("lib/admin/property-calendar.ts");
  const availability = read("lib/availability/service.ts");
  const packageJson = read("package.json");
  const measurementScript = read("scripts/measure-admin-property-calendar.ts");
  const docs = read("docs/222-final-i-6-8-admin-calendar-ux-cleanup-and-performance.md");
  const propertiesStart = propertyCalendar.indexOf("const propertiesPromise");
  const blockingStart = propertyCalendar.indexOf("const blockingRecordsPromise");
  const overridesStart = propertyCalendar.indexOf(
    "const preparationOverridesPromise",
  );
  const propertiesAwait = propertyCalendar.indexOf(
    "const properties = await propertiesPromise;",
  );

  expectIncludes(propertyCalendar, "getAvailabilityBlockingRecords");
  expectIncludes(propertyCalendar, "type AdminPropertyCalendarTimingEvent");
  expectIncludes(propertyCalendar, "measureCalendarRead");
  expectIncludes(propertyCalendar, "Promise.all([");
  assert.ok(propertiesStart >= 0);
  assert.ok(blockingStart > propertiesStart && blockingStart < propertiesAwait);
  assert.ok(overridesStart > blockingStart && overridesStart < propertiesAwait);
  expectIncludes(availability, "prismaClient.reservation.findMany");
  expectIncludes(availability, "prismaClient.calendarBlock.findMany");
  expectIncludes(availability, "prismaClient.lifecycleRequestHold.findMany");
  expectIncludes(packageJson, '"admin:calendar-performance:measure"');
  expectIncludes(measurementScript, "TRP_ENVIRONMENT");
  expectIncludes(measurementScript, "Refusing to measure against a production-looking database URL");
  expectIncludes(measurementScript, "TRP_ADMIN_SESSION_COOKIE");
  expectIncludes(measurementScript, "AUTHORIZED_ADMIN_CALENDAR_ROUTE_ORIGIN");
  expectIncludes(measurementScript, "resolveAuthorizedAdminCalendarRouteBaseUrl");
  expectIncludes(measurementScript, "pathToFileURL");
  expectIncludes(measurementScript, "redirect: \"manual\"");
  expectIncludes(measurementScript, "url.origin");
  expectNotIncludes(measurementScript, "console.error(error)");
  expectIncludes(measurementScript, "dataPathResults");
  expectNotIncludes(propertyCalendar, "unstable_cache");
  expectNotIncludes(propertyCalendar, "localStorage");
  expectIncludes(docs, "Pre-Hosted hardening");
  expectIncludes(docs, "No persistent cache, Redis, localStorage, CDN cache, or unstable_cache");
});
