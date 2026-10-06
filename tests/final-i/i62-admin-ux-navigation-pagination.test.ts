import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();

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

test("I.6.2 A additional-charge nested tabs use compact Email Delivery tab pattern", () => {
  const additionalCharges = read(
    "features/admin/components/admin-additional-charges-section.tsx",
  );
  const reservationDetail = read(
    "features/admin/components/admin-reservation-detail-page.tsx",
  );
  const compactTabsClass =
    "inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0";

  expectIncludes(additionalCharges, '<Tabs className="grid gap-5" defaultValue="charges">');
  expectIncludes(additionalCharges, '<div className="-mx-1 overflow-x-auto px-1 pb-2">');
  expectIncludes(additionalCharges, `<TabsList className="${compactTabsClass}">`);
  expectIncludes(additionalCharges, '<TabsTrigger className="min-h-10 shrink-0" value="charges">');
  expectIncludes(additionalCharges, '<TabsTrigger className="min-h-10 shrink-0" value="requests">');
  expectIncludes(reservationDetail, `className="${compactTabsClass}"`);
  expectNotIncludes(
    additionalCharges,
    '<TabsList className="w-full justify-start overflow-x-auto sm:w-auto">',
  );
});

test("I.6.2 B admin reviews list is a closed-by-default single accordion", () => {
  const source = read("features/admin/components/admin-reviews-page.tsx");
  const accordionBlock = blockBetween(
    source,
    '<Accordion className="grid gap-3" collapsible type="single">',
    "</Accordion>",
  );
  const trigger = blockBetween(
    accordionBlock,
    "<AccordionTrigger",
    "</AccordionTrigger>",
  );
  const content = blockBetween(
    accordionBlock,
    "<AccordionContent",
    "</AccordionContent>",
  );

  expectIncludes(source, 'from "@/components/ui/accordion";');
  expectIncludes(source, '<Accordion className="grid gap-3" collapsible type="single">');
  expectIncludes(source, "value={review.id}");
  expectIncludes(source, "const submittedAt = formatDateTime(review.submittedAt);");
  expectIncludes(source, "const reviewPropertyName = propertyName(review);");
  expectIncludes(trigger, "{statusLabel(review.moderationStatus)}");
  expectIncludes(trigger, "{review.guestDisplayName}");
  expectIncludes(trigger, "{reviewPropertyName}");
  expectIncludes(trigger, "{copy.labels.submittedAt}: {submittedAt}");
  expectIncludes(trigger, "{copy.labels.rating}: {review.rating}/5");
  assert.doesNotMatch(trigger, /<Button\b|<Link\b/);
  expectIncludes(content, "setModerationTarget({ review, targetStatus })");
  expectIncludes(content, "href={`/admin/reservations/${encodeURIComponent(");
  expectNotIncludes(accordionBlock, "defaultValue=");
});

test("I.6.2 B review filters pagination sheet and optimistic busy state are preserved", () => {
  const source = read("features/admin/components/admin-reviews-page.tsx");

  expectIncludes(source, "const propertyFilterInputRef = useRef<HTMLInputElement>(null);");
  expectIncludes(source, "const statusFilterInputRef = useRef<HTMLInputElement>(null);");
  expectIncludes(source, "function buildUrl(");
  expectIncludes(source, "propertyId: data.filters.propertyId");
  expectIncludes(source, "status: data.filters.status");
  expectIncludes(source, "page: data.filters.page");
  expectIncludes(source, "setBusyReviewId(moderationTarget.review.id);");
  expectIncludes(source, "<Sheet");
  expectIncludes(source, "expectedUpdatedAt: moderationTarget.review.updatedAt");
});

test("I.6.2 C dashboard upcoming arrivals link directly to reservation detail", () => {
  const dashboard = read("features/admin/components/admin-dashboard-page.tsx");
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  expectIncludes(dashboard, "ExternalLink,");
  expectIncludes(dashboard, "copy.actions.viewReservation");
  expectIncludes(dashboard, "href={`/admin/reservations/${encodeURIComponent(arrival.id)}`}");
  expectIncludes(dashboard, "lg:grid-cols-[minmax(0,1fr)_auto_auto]");
  expectIncludes(es, 'viewReservation: "Ver reservación"');
  expectIncludes(en, 'viewReservation: "View reservation"');
});

test("I.6.2 D reservations page size is five with existing server-side pagination", () => {
  const service = read("lib/admin/reservations.ts");
  const page = read("features/admin/components/admin-reservations-page.tsx");

  expectIncludes(service, "const PAGE_SIZE = 5;");
  expectIncludes(service, "Math.ceil(totalItems / PAGE_SIZE)");
  expectIncludes(service, "skip: (safePage - 1) * PAGE_SIZE");
  expectIncludes(service, "take: PAGE_SIZE");
  expectIncludes(service, "pageSize: PAGE_SIZE");
  expectIncludes(page, "function buildUrl(");
  expectIncludes(page, "search: data.filters.search");
  expectIncludes(page, "propertyId: data.filters.propertyId");
  expectIncludes(page, "status: data.filters.status");
  expectIncludes(page, "page: data.filters.page");
});

test("I.6.2 E accordion triggers share a subtle default background and open-state hierarchy", () => {
  const accordion = read("components/ui/accordion.tsx");
  const adminAdditionalCharges = read(
    "features/admin/components/admin-additional-charges-section.tsx",
  );
  const reservationDetail = read(
    "features/admin/components/admin-reservation-detail-page.tsx",
  );

  expectIncludes(accordion, "bg-muted/40");
  expectIncludes(accordion, "hover:bg-muted/50");
  expectIncludes(accordion, "data-[state=open]:bg-muted/50");
  assert.doesNotMatch(
    `${adminAdditionalCharges}\n${reservationDetail}`,
    /<AccordionTrigger[^>]*hover:bg-muted\/(?:30|40)/,
  );
});

test("I.6.2 F admin shell keeps only navigation scrollable on desktop and mobile", () => {
  const source = read("features/admin/components/admin-shell.tsx");
  const desktopAside = blockBetween(source, "<aside", "</aside>");
  const mobileSheet = blockBetween(source, "<SheetContent", "</SheetContent>");

  expectIncludes(desktopAside, "h-screen min-h-0 flex-col");
  expectIncludes(desktopAside, "shrink-0 border-b border-border/70 p-5");
  expectIncludes(desktopAside, "min-h-0 flex-1 overflow-y-auto px-5 py-5");
  expectIncludes(desktopAside, "shrink-0 border-t border-border/70 p-5");
  assert.doesNotMatch(
    desktopAside.slice(0, desktopAside.indexOf(">")),
    /overflow-y-auto/,
  );
  expectIncludes(mobileSheet, 'className="min-h-0 gap-0 p-0"');
  expectIncludes(mobileSheet, '<SheetHeader className="shrink-0">');
  expectIncludes(mobileSheet, '<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">');
  expectIncludes(mobileSheet, '<div className="shrink-0 border-t border-border/70 px-5 py-5">');
});
