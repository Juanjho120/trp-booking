import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

function expectFile(relativePath: string): void {
  assert.ok(
    existsSync(path.join(ROOT, relativePath)),
    `Expected file to exist: ${relativePath}`,
  );
}

const accommodationEditorLoadingRoutes = [
  "app/admin/accommodations/[propertyId]/loading.tsx",
  "app/admin/accommodations/[propertyId]/pricing/loading.tsx",
  "app/admin/accommodations/[propertyId]/photos/loading.tsx",
  "app/admin/accommodations/[propertyId]/amenities-rules/loading.tsx",
  "app/admin/accommodations/[propertyId]/arrival-instructions/loading.tsx",
] as const;

const accommodationEditorFiles = [
  "admin-accommodation-content-editor.tsx",
  "admin-pricing-manager.tsx",
  "admin-property-photo-manager.tsx",
  "admin-amenities-house-rules-manager.tsx",
  "admin-arrival-instructions-editor.tsx",
] as const;

test("I.6.10 shared admin navigation preserves native link behavior and prevents duplicate pushes", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-navigation-feedback.tsx`);

  for (const expected of [
    "useTransition",
    "usePathname",
    "useSearchParams",
    "router.push(destination",
    "event.button !== 0",
    "event.altKey",
    "event.ctrlKey",
    "event.metaKey",
    "event.shiftKey",
    "getAttribute(\"target\")",
    "getAttribute(\"download\")",
    "target !== \"_self\"",
    "pendingHref !== null",
    "event.preventDefault()",
    "prefetch: false",
    "data-admin-navigation-pending",
    "aria-disabled",
    "aria-busy",
    "tabIndex: disabled && !pendingForLink ? -1 : undefined",
    "observedPendingTransitionRef",
    "setPendingHref(null)",
  ]) {
    expectIncludes(source, expected);
  }
});

test("I.6.10 route skeleton primitives are reusable, accessible, and private-data free", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-loading-skeletons.tsx`);

  for (const expected of [
    "AdminPaymentsPageSkeleton",
    "AdminCatalogPageSkeleton",
    "AdminCalendarRouteSkeleton",
    "AdminCalendarIntegrationsSkeleton",
    "AdminAccommodationListSkeleton",
    "AdminAccommodationEditorSkeleton",
    "AdminGenericPageSkeleton",
    'aria-busy="true"',
    'role="status"',
    "animate-pulse",
    "motion-reduce:animate-none",
    "ADMIN_CALENDAR_SKELETON_CELL_COUNT",
    "ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT",
  ]) {
    expectIncludes(source, expected);
  }

  for (const rejected of [
    "guestName",
    "guestEmail",
    "providerReference",
    "reservationCode",
    "paymentId",
  ]) {
    expectNotIncludes(source, rejected);
  }
});

test("I.6.10 payments tabs select optimistically and hide stale datasets during pending navigation", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-payments-page.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  for (const expected of [
    "useAdminRouteNavigation",
    "routeNavigation.pendingHref",
    "visibleView",
    "pending={routeNavigation.isPendingFor(href)}",
    "onClick={linkProps.onClick}",
    "onKeyDown={linkProps.onKeyDown}",
    "prefetch={linkProps.prefetch}",
    "routeNavigation.isPending ? (",
    "<AdminPaymentsPageSkeleton",
    "includeHeader={false}",
    "label={copy.states.loading}",
    "status: undefined",
    "page: 1",
    "search: data.filters.search",
    "propertyId: data.filters.propertyId",
    "status: data.filters.status",
    "page: data.filters.page",
  ]) {
    expectIncludes(source, expected);
  }

  expectIncludes(es, 'loading: "Cargando pagos y diagnóstico..."');
  expectIncludes(en, 'loading: "Loading payments and diagnostics..."');
});

test("I.6.10 catalog tabs select optimistically and avoid showing the wrong catalog while loading", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-catalog-manager.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  for (const expected of [
    "useAdminRouteNavigation",
    "routeNavigation.pendingHref",
    "visibleCatalog",
    '"/admin/catalogs?catalog=amenities"',
    '"/admin/catalogs?catalog=house-rules"',
    "pending={routeNavigation.isPendingFor(",
    "routeNavigation.getLinkProps",
    "routeNavigation.isPending ? (",
    "<AdminCatalogPageSkeleton",
    "includeHeader={false}",
    "label={copy.states.loading}",
  ]) {
    expectIncludes(source, expected);
  }

  expectIncludes(es, 'loading: "Cargando catálogo..."');
  expectIncludes(en, 'loading: "Loading catalog..."');
});

test("I.6.10 calendar and integrations links use shared feedback without changing local property tabs", () => {
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);
  const integrations = read(`${ADMIN_COMPONENTS}/admin-calendar-integrations-page.tsx`);

  expectIncludes(calendar, "AdminNavigationLink");
  expectIncludes(calendar, 'href="/admin/calendar/integrations"');
  expectIncludes(calendar, "calendarNavigationLinkProps(target)");
  expectIncludes(calendar, "<AdminCalendarGridSkeleton");

  expectIncludes(integrations, "AdminNavigationLink");
  expectIncludes(integrations, 'href="/admin/calendar"');
  expectIncludes(integrations, "onValueChange={setSelectedPropertyId}");
  expectIncludes(integrations, "value={selectedIntegration.property.id}");
  expectNotIncludes(integrations, "ArrowRight");
  expectNotIncludes(integrations, "mt-6 flex justify-end");
});

test("I.6.10 admin route loading files cover server-side navigation targets", () => {
  for (const file of [
    "app/admin/loading.tsx",
    "app/admin/payments/loading.tsx",
    "app/admin/payments/[paymentId]/loading.tsx",
    "app/admin/catalogs/loading.tsx",
    "app/admin/calendar/loading.tsx",
    "app/admin/calendar/integrations/loading.tsx",
    "app/admin/accommodations/loading.tsx",
    "app/admin/location/loading.tsx",
    "app/admin/cron-jobs/loading.tsx",
    "app/admin/reservations/loading.tsx",
    "app/admin/reservations/[reservationId]/loading.tsx",
    ...accommodationEditorLoadingRoutes,
  ]) {
    expectFile(file);
  }
});

test("I.6.10 accommodation list and editor links use the shared navigation feedback", () => {
  const overview = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);

  expectIncludes(overview, "useAdminRouteNavigation");
  expectIncludes(overview, "navigation={routeNavigation}");
  for (const href of [
    "`/admin/accommodations/${property.id}`",
    "`/admin/accommodations/${property.id}/pricing`",
    "`/admin/accommodations/${property.id}/photos`",
    "`/admin/accommodations/${property.id}/amenities-rules`",
    "`/admin/accommodations/${property.id}/arrival-instructions`",
  ]) {
    expectIncludes(overview, href);
  }

  for (const file of accommodationEditorFiles) {
    const source = read(`${ADMIN_COMPONENTS}/${file}`);

    expectIncludes(source, "AdminNavigationLink");
    expectIncludes(source, 'href="/admin/accommodations"');
    expectNotIncludes(source, 'import Link from "next/link"');
  }
});

test("I.6.10 accommodation editor loading routes use shape-specific skeleton variants", () => {
  const variants = new Map([
    ["app/admin/accommodations/[propertyId]/loading.tsx", 'variant="content"'],
    [
      "app/admin/accommodations/[propertyId]/pricing/loading.tsx",
      'variant="pricing"',
    ],
    [
      "app/admin/accommodations/[propertyId]/photos/loading.tsx",
      'variant="photos"',
    ],
    [
      "app/admin/accommodations/[propertyId]/amenities-rules/loading.tsx",
      'variant="amenities"',
    ],
    [
      "app/admin/accommodations/[propertyId]/arrival-instructions/loading.tsx",
      'variant="arrival"',
    ],
  ]);

  for (const [file, variant] of variants) {
    const source = read(file);

    expectIncludes(source, "AdminAccommodationEditorSkeleton");
    expectIncludes(source, variant);
    expectIncludes(source, "esMessages.admin.accommodations.states");
  }
});

test("I.6.10 local tabs for location and cron jobs remain local without artificial route navigation", () => {
  const location = read(`${ADMIN_COMPONENTS}/admin-public-location-page.tsx`);
  const cronJobs = read(`${ADMIN_COMPONENTS}/admin-cron-jobs-page.tsx`);

  for (const source of [location, cronJobs]) {
    expectIncludes(source, "from \"@/components/ui/tabs\"");
    expectIncludes(source, "<Tabs");
    expectIncludes(source, "<TabsTrigger");
    expectNotIncludes(source, "useAdminRouteNavigation");
    expectNotIncludes(source, "AdminNavigationLink");
  }

  expectIncludes(cronJobs, "buildPageHref");
  expectIncludes(cronJobs, '"/admin/cron-jobs?tab=history"');
  expectIncludes(cronJobs, "`/admin/cron-jobs?tab=history&page=${page}`");
});

test("I.6.10 admin shell uses the shared route navigation instead of bespoke pending state", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-shell.tsx`);

  expectIncludes(source, "useAdminRouteNavigation");
  expectIncludes(source, "routeNavigation.pendingHref");
  expectIncludes(source, "routeNavigation.getLinkProps(item.href)");
  expectIncludes(source, "routeNavigation.isPendingFor(item.href)");
  expectNotIncludes(source, "setPendingNavigation");
  expectNotIncludes(source, "useState");
});

test("I.6.10 admin link tabs expose pending and disabled state without changing active styling tokens", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-link-tabs.tsx`);

  for (const expected of [
    "pending?: boolean",
    '"aria-busy"',
    '"aria-disabled"',
    "pending && \"opacity-80 ring-2 ring-primary/30\"",
    "props[\"aria-disabled\"] && \"aria-disabled:pointer-events-none\"",
    "active ? tabsTriggerActiveClassName : tabsTriggerInactiveClassName",
  ]) {
    expectIncludes(source, expected);
  }
});

test("I.6.10 loading copy is centralized in ES and EN message files", () => {
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  for (const expected of [
    'loadingPage: "Cargando vista administrativa..."',
    'loading: "Cargando pagos y diagnóstico..."',
    'loading: "Cargando catálogo..."',
    'loading: "Cargando alojamientos..."',
    'editorLoading: "Cargando editor del alojamiento..."',
    'loading: "Cargando ubicación pública..."',
    'loading: "Cargando tareas programadas..."',
    'loading: "Cargando integraciones de calendario..."',
  ]) {
    expectIncludes(es, expected);
  }

  for (const expected of [
    'loadingPage: "Loading admin view..."',
    'loading: "Loading payments and diagnostics..."',
    'loading: "Loading catalog..."',
    'loading: "Loading accommodations..."',
    'editorLoading: "Loading accommodation editor..."',
    'loading: "Loading public location..."',
    'loading: "Loading cron jobs..."',
    'loading: "Loading calendar integrations..."',
  ]) {
    expectIncludes(en, expected);
  }
});

test("I.6.10 direct URL and back-forward behavior remains server-authoritative", () => {
  const navigation = read(`${ADMIN_COMPONENTS}/admin-navigation-feedback.tsx`);
  const paymentsPage = read("app/admin/payments/page.tsx");
  const catalogsPage = read("app/admin/catalogs/page.tsx");
  const calendarPage = read("app/admin/calendar/page.tsx");

  expectIncludes(navigation, "composeCurrentPath(pathname, searchParams)");
  expectIncludes(navigation, "normalizePathWithSearch(currentPath)");
  expectIncludes(navigation, "normalizedCurrentPath === normalizedPendingHref");
  expectIncludes(paymentsPage, 'export const dynamic = "force-dynamic";');
  expectIncludes(catalogsPage, 'export const dynamic = "force-dynamic";');
  expectIncludes(calendarPage, 'export const dynamic = "force-dynamic";');
});
