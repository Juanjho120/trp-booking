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

const redundantHeaderBadgeFiles = [
  "admin-dashboard-page.tsx",
  "admin-reservations-page.tsx",
  "admin-payments-page.tsx",
  "admin-fel-page.tsx",
  "admin-reviews-page.tsx",
  "admin-notifications-page.tsx",
  "admin-property-calendar.tsx",
  "admin-accommodation-management.tsx",
  "admin-public-location-page.tsx",
  "admin-catalog-manager.tsx",
  "admin-cron-jobs-page.tsx",
] as const;

const cronJobKeys = [
  "SYNC_AIRBNB_CALENDARS",
  "EXPIRE_PENDING_RESERVATION_HOLDS",
  "EXPIRE_GUEST_PAYMENT_REQUESTS",
  "PROCESS_EMAIL_NOTIFICATIONS",
  "SCHEDULE_ARRIVAL_INSTRUCTIONS",
  "SCHEDULE_REVIEW_INVITATIONS",
  "PROCESS_ADMIN_PUSH_NOTIFICATIONS",
] as const;

test("I.6.7 redundant admin page-header badges are removed only from target pages", () => {
  for (const file of redundantHeaderBadgeFiles) {
    const source = read(`${ADMIN_COMPONENTS}/${file}`);
    expectIncludes(source, "<AdminPageHeader");
    expectNotIncludes(source, "badge={copy.badge}");
  }

  for (const file of [
    "admin-accommodation-settings.tsx",
  ]) {
    expectIncludes(read(`${ADMIN_COMPONENTS}/${file}`), "badge={copy.badge}");
  }
});

test("I.6.7 operational status badges remain visible after header cleanup", () => {
  const reservationDetail = read(`${ADMIN_COMPONENTS}/admin-reservation-detail-page.tsx`);
  const paymentDetail = read(`${ADMIN_COMPONENTS}/admin-payment-detail-page.tsx`);
  const accommodation = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);
  const payments = read(`${ADMIN_COMPONENTS}/admin-payments-page.tsx`);
  const cronJobs = read(`${ADMIN_COMPONENTS}/admin-cron-jobs-page.tsx`);

  expectIncludes(reservationDetail, "badge={shellBadge}");
  expectIncludes(paymentDetail, "badge={paymentStatusLabel(payment.status)}");
  expectIncludes(accommodation, "{copy.overview.statuses[property.status]}");
  expectIncludes(payments, "{paymentStatusLabel(payment.status)}");
  expectIncludes(cronJobs, "{latest ? statusLabel(latest.status) : copy.statuses.NEVER_RUN}");
});

test("I.6.7 cron job cards move persistent descriptions into contextual help", () => {
  const cronJobs = read(`${ADMIN_COMPONENTS}/admin-cron-jobs-page.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");
  const card = blockBetween(cronJobs, "function CronJobCard({", "function ExecutionItem({");

  expectIncludes(cronJobs, 'import { AdminContextualHelp } from "./admin-contextual-help";');
  expectIncludes(card, "<AdminContextualHelp content={jobDescription} />");
  expectNotIncludes(card, "<CardDescription className=\"mt-1\">\n                {jobDescription}");
  expectIncludes(cronJobs, "jobDescription={jobCopy(job.key).description}");
  expectIncludes(cronJobs, "{selectedJob ? jobCopy(selectedJob.key).description : \"\"}");

  for (const key of cronJobKeys) {
    expectIncludes(es, `${key}: {`);
    expectIncludes(en, `${key}: {`);
  }
});

test("I.6.7 accommodations page uses mounted tabs for public content and preparation buffers", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  for (const expected of [
    'from "@/components/ui/tabs"',
    '<Tabs className="mt-6" defaultValue="content">',
    'value="content"',
    'value="preparation"',
    "{copy.overview.sectionTitle}",
    "{copy.preparation.title}",
    "{initialContent.properties.map((property) => {",
    "<AdminAccommodationSettings",
    "initialSettings={initialPreparationSettings}",
    "showHeader={false}",
  ]) {
    expectIncludes(source, expected);
  }

  assert.equal((source.match(/forceMount/g) ?? []).length, 2);
  assert.equal((source.match(/data-\[state=inactive\]:hidden/g) ?? []).length, 2);
  expectIncludes(source, "overflow-x-auto");
  expectIncludes(es, 'sectionTitle: "Contenido público"');
  expectIncludes(es, 'title: "Buffers de preparación"');
  expectIncludes(en, 'sectionTitle: "Public content"');
  expectIncludes(en, 'title: "Preparation buffers"');
});

test("I.6.7 reservation detail main tabs use natural width and keep scroll/panels", () => {
  const source = read(`${ADMIN_COMPONENTS}/admin-reservation-detail-page.tsx`);
  const mainTabs = blockBetween(
    source,
    '<TabsList\n            aria-label={reservationCopy.title}',
    "          </TabsList>",
  );

  expectIncludes(source, '<div className="-mx-1 overflow-x-auto px-1 pb-2">');
  expectIncludes(
    mainTabs,
    'className="inline-flex h-auto w-max justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5"',
  );
  expectNotIncludes(mainTabs, "min-w-full");
  for (const value of [
    "reservation",
    "financial",
    "emails",
    "lifecycle",
    "additionalCharges",
    "refunds",
    "changes",
    "history",
  ]) {
    expectIncludes(mainTabs, `value="${value}"`);
  }
  expectIncludes(source, 'className="mt-4 data-[state=inactive]:hidden sm:mt-6"');
  expectIncludes(source, "forceMount");
});

test("I.6.7 primary tab selection styling is centralized in the shared Tabs component", () => {
  const tabs = read("components/ui/tabs.tsx");
  const cronJobs = read(`${ADMIN_COMPONENTS}/admin-cron-jobs-page.tsx`);
  const publicLocation = read(`${ADMIN_COMPONENTS}/admin-public-location-page.tsx`);
  const baseBlock = blockBetween(
    tabs,
    "const tabsTriggerBaseClassName =",
    "const tabsTriggerInactiveClassName =",
  );
  const inactiveBlock = blockBetween(
    tabs,
    "const tabsTriggerInactiveClassName =",
    "const tabsTriggerActiveClassName =",
  );
  const activeBlock = blockBetween(
    tabs,
    "const tabsTriggerActiveClassName =",
    "function Tabs(",
  );

  for (const expected of [
    "tabsListClassName",
    "tabsTriggerBaseClassName",
    "tabsTriggerInactiveClassName",
    "tabsTriggerInactiveDataClassName",
    "tabsTriggerActiveClassName",
    "tabsTriggerActiveDataClassName",
    "tabsTriggerSubtleActiveDataClassName",
    'type TabsTriggerVariant = "primary" | "subtle"',
    'variant = "primary"',
    "variant?: TabsTriggerVariant",
    "data-[state=active]:border-primary",
    "data-[state=active]:bg-primary",
    "data-[state=active]:text-primary-foreground",
    "data-[state=active]:shadow-md",
    "hover:bg-background/80",
    "focus-visible:border-ring",
    "disabled:pointer-events-none",
  ]) {
    expectIncludes(tabs, expected);
  }

  expectNotIncludes(baseBlock, "hover:bg-background/80");
  expectNotIncludes(baseBlock, "hover:text-foreground");
  expectIncludes(inactiveBlock, "hover:bg-background/80");
  expectIncludes(inactiveBlock, "hover:text-foreground");
  expectNotIncludes(activeBlock, "hover:bg-background/80");
  expectNotIncludes(activeBlock, "hover:text-foreground");
  expectNotIncludes(cronJobs, "activeTabClassName");
  expectNotIncludes(publicLocation, "activeTabClassName");
  expectNotIncludes(cronJobs, "data-[state=active]:border-primary");
  expectNotIncludes(publicLocation, "data-[state=active]:border-primary");
});

test("I.6.7 active tabs keep primary styling on hover while inactive tabs receive hover affordance", () => {
  const tabs = read("components/ui/tabs.tsx");
  const linkTabs = read(`${ADMIN_COMPONENTS}/admin-link-tabs.tsx`);
  const publicAvailability = read("features/availability/components/public-availability-page.tsx");
  const inactiveDataBlock = blockBetween(
    tabs,
    "const tabsTriggerInactiveDataClassName =",
    "const tabsTriggerActiveClassName =",
  );
  const activeDataBlock = blockBetween(
    tabs,
    "const tabsTriggerActiveDataClassName =",
    "const tabsTriggerSubtleActiveDataClassName =",
  );

  expectIncludes(inactiveDataBlock, "data-[state=inactive]:hover:bg-background/80");
  expectIncludes(inactiveDataBlock, "data-[state=inactive]:hover:text-foreground");
  expectIncludes(activeDataBlock, "data-[state=active]:bg-primary");
  expectIncludes(activeDataBlock, "data-[state=active]:text-primary-foreground");
  expectNotIncludes(activeDataBlock, "hover:bg-background/80");
  expectNotIncludes(activeDataBlock, "hover:text-foreground");
  expectIncludes(linkTabs, "active ? tabsTriggerActiveClassName : tabsTriggerInactiveClassName");
  expectIncludes(publicAvailability, 'variant="subtle"');
});

test("I.6.7 admin link navigation shares tab tokens and preserves URL semantics", () => {
  const linkTabs = read(`${ADMIN_COMPONENTS}/admin-link-tabs.tsx`);
  const catalogs = read(`${ADMIN_COMPONENTS}/admin-catalog-manager.tsx`);
  const calendar = read(`${ADMIN_COMPONENTS}/admin-property-calendar.tsx`);
  const payments = read(`${ADMIN_COMPONENTS}/admin-payments-page.tsx`);

  for (const expected of [
    "tabsListClassName",
    "tabsTriggerBaseClassName",
    "tabsTriggerActiveClassName",
    "tabsTriggerInactiveClassName",
    "aria-current={active ? \"page\" : undefined}",
    "-mx-1 overflow-x-auto px-1 pb-2",
    "min-w-max",
    "active ? tabsTriggerActiveClassName : tabsTriggerInactiveClassName",
  ]) {
    expectIncludes(linkTabs, expected);
  }

  expectNotIncludes(linkTabs, "w-max max-w-full");

  for (const source of [catalogs, calendar, payments]) {
    expectIncludes(source, "<AdminLinkTabList");
    expectIncludes(source, "<AdminLinkTab");
    expectNotIncludes(source, 'variant={active ? "default" : "outline"}');
  }

  expectIncludes(catalogs, 'href="/admin/catalogs?catalog=amenities"');
  expectIncludes(catalogs, 'href="/admin/catalogs?catalog=house-rules"');
  expectIncludes(calendar, "calendarNavigationLinkProps(target)");
  expectIncludes(calendar, "createAdminCalendarHref(target)");
  expectIncludes(payments, "href={buildUrl({ view: target, status: undefined, page: 1 })}");
  expectIncludes(payments, "search: data.filters.search");
  expectIncludes(payments, "propertyId: data.filters.propertyId");
  expectIncludes(payments, "status: data.filters.status");
  expectIncludes(payments, "page: data.filters.page");
});

test("I.6.7 responsive admin navigation keeps controlled horizontal overflow", () => {
  const linkTabs = read(`${ADMIN_COMPONENTS}/admin-link-tabs.tsx`);
  const accommodation = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);
  const reservationDetail = read(`${ADMIN_COMPONENTS}/admin-reservation-detail-page.tsx`);
  const publicAvailability = read("features/availability/components/public-availability-page.tsx");

  expectIncludes(linkTabs, "overflow-x-auto");
  expectIncludes(linkTabs, "shrink-0");
  expectIncludes(linkTabs, "min-w-max");
  expectIncludes(accommodation, '<div className="-mx-1 overflow-x-auto px-1 pb-2">');
  expectIncludes(accommodation, "min-w-max");
  expectNotIncludes(accommodation, "w-max max-w-full");
  expectIncludes(reservationDetail, '<div className="-mx-1 overflow-x-auto px-1 pb-2">');
  expectIncludes(reservationDetail, "w-max justify-start");
  expectIncludes(publicAvailability, "TabsTrigger");
  expectIncludes(publicAvailability, 'variant="subtle"');
  expectIncludes(publicAvailability, "w-max max-w-full justify-start");
});
