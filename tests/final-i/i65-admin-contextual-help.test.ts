import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const ADMIN_COMPONENTS = "features/admin/components";
const I65_DOC = "docs/219-final-i-6-5-admin-contextual-help-copy-density-polish.md";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function expectExcludes(source: string, unexpected: string): void {
  assert.ok(
    !source.includes(unexpected),
    `Expected source to exclude: ${unexpected}`,
  );
}


test("I.6.5 shared admin help is localized, accessible and deterministic", () => {
  const component = read(`${ADMIN_COMPONENTS}/admin-contextual-help.tsx`);
  const esMessages = read("messages/es.ts");
  const enMessages = read("messages/en.ts");
  const packageJson = read("package.json");

  for (const expected of [
    "export function AdminContextualHelp",
    "CircleHelp",
    "PopoverPrimitive.Root",
    "PopoverPrimitive.Anchor asChild",
    "PopoverPrimitive.Content",
    "messages.admin.feedback.help",
    "const contentId = useId();",
    "const [open, setOpen] = useState(false);",
    "const [pinnedOpen, setPinnedOpen] = useState(false);",
    "pinnedOpenRef",
    "onOpenChange={handleOpenChange}",
    "aria-label={label}",
    "aria-controls={contentId}",
    "aria-expanded={open}",
    "aria-haspopup=\"dialog\"",
    "aria-hidden=\"true\"",
    "type=\"button\"",
    "variant=\"ghost\"",
    "onMouseEnter={showHelp}",
    "onMouseLeave={scheduleClose}",
    "onBlur={scheduleClose}",
    "onClick={handleActivation}",
    "onFocus={handleFocus}",
    "matches(\":focus-visible\")",
    "setPinned(false)",
    "setPinned(true)",
    "onMouseEnter={clearCloseTimer}",
    "id={contentId}",
    "onOpenAutoFocus={(event) => {",
    "onCloseAutoFocus={(event) => {",
    "event.preventDefault();",
    "useEffect(() =>",
    "size-10 rounded-full text-muted-foreground sm:size-7",
    "max-w-[min(24rem,calc(100vw-2rem))]",
  ]) {
    expectIncludes(component, expected);
  }

  expectExcludes(component, "title=");
  expectExcludes(component, "PopoverPrimitive.Trigger asChild");
  expectExcludes(component, "onFocus={showHelp}");
  expectIncludes(esMessages, 'help: "Ayuda"');
  expectIncludes(enMessages, 'help: "Help"');
  expectIncludes(packageJson, '"radix-ui"');
});
test("I.6.5 admin page header moves descriptions behind contextual help", () => {
  const header = read(`${ADMIN_COMPONENTS}/admin-page-header.tsx`);

  expectIncludes(header, "import { AdminContextualHelp } from \"./admin-contextual-help\";");
  expectIncludes(header, "<h1 className=\"min-w-0 text-balance");
  expectIncludes(header, "<AdminContextualHelp align=\"start\" content={description} side=\"bottom\" />");
  expectIncludes(header, "{actions ? <div className=\"shrink-0\">{actions}</div> : null}");
  expectExcludes(header, "<p className=\"mt-3 text-sm leading-6 text-muted-foreground");
  assert.equal((header.match(/<h1\b/g) ?? []).length, 1);
});

test("I.6.5 category A explanatory admin copy is moved into help", () => {
  const accommodation = read(`${ADMIN_COMPONENTS}/admin-accommodation-content-editor.tsx`);
  const pricing = read(`${ADMIN_COMPONENTS}/admin-pricing-manager.tsx`);
  const photos = read(`${ADMIN_COMPONENTS}/admin-property-photo-manager.tsx`);
  const calendar = read(`${ADMIN_COMPONENTS}/admin-calendar-integrations-page.tsx`);
  const dashboard = read(`${ADMIN_COMPONENTS}/admin-dashboard-page.tsx`);
  const notifications = read(`${ADMIN_COMPONENTS}/admin-notifications-page.tsx`);
  const paymentDetail = read(`${ADMIN_COMPONENTS}/admin-payment-detail-page.tsx`);
  const reservationDetail = read(`${ADMIN_COMPONENTS}/admin-reservation-detail-page.tsx`);
  const catalog = read(`${ADMIN_COMPONENTS}/admin-catalog-manager.tsx`);

  for (const expected of [
    "content={copy.notes.requiredLanguages}",
    "content={copy.notes.publicImpact}",
    "content={copy.notes.capacityRange}",
    "content={copy.notes.timeFormat}",
  ]) {
    expectIncludes(accommodation, expected);
  }

  for (const expected of [
    "content={copy.base.description}",
    "content={copy.summary.description}",
    "content={copy.summary.seasonalDescription}",
    "content={copy.summary.losDescription}",
    "content={copy.seasonal.description}",
    "content={copy.los.description}",
    "content={copy.preview.description}",
  ]) {
    expectIncludes(pricing, expected);
  }

  for (const expected of [
    "<p>{copy.notes.formats}</p>",
    "<p className=\"mt-2\">{copy.notes.altText}</p>",
    "content={copy.notes.order}",
  ]) {
    expectIncludes(photos, expected);
  }
  expectExcludes(photos, "<p className=\"text-xs leading-5 text-muted-foreground\">\n                {copy.notes.altText}\n              </p>");

  for (const expected of [
    "content={copy.cards.description}",
    "content={copy.directions.inbound.description}",
    "content={copy.directions.outbound.description}",
  ]) {
    expectIncludes(calendar, expected);
  }

  for (const expected of [
    "content={statCopy.description}",
    "content={copy.upcomingArrivalsDescription}",
  ]) {
    expectIncludes(dashboard, expected);
  }

  for (const expected of [
    "content={copy.history.description}",
    "content={copy.device.description}",
  ]) {
    expectIncludes(notifications, expected);
  }

  expectIncludes(paymentDetail, "content={paymentCopy.description}");
  for (const expected of [
    "content={paymentCopy.description}",
    "content={notificationCopy.description}",
    "<p>{correspondenceCopy.description}</p>",
    "<p className=\"mt-2\">{correspondenceCopy.helper}</p>",
    "content={copy.description}",
  ]) {
    expectIncludes(reservationDetail, expected);
  }
  expectIncludes(catalog, "<AdminContextualHelp content={description} />");
});

test("I.6.5 operational metadata remains visible outside contextual help", () => {
  const dashboard = read(`${ADMIN_COMPONENTS}/admin-dashboard-page.tsx`);
  const notifications = read(`${ADMIN_COMPONENTS}/admin-notifications-page.tsx`);
  const paymentDetail = read(`${ADMIN_COMPONENTS}/admin-payment-detail-page.tsx`);
  const reservationDetail = read(`${ADMIN_COMPONENTS}/admin-reservation-detail-page.tsx`);
  const paymentHistory = read(`${ADMIN_COMPONENTS}/admin-payment-submission-attempt-history.tsx`);
  const accommodation = read(`${ADMIN_COMPONENTS}/admin-accommodation-management.tsx`);

  for (const expected of [
    "{arrival.guestName}",
    "arrival.property.nameEn",
    "formatDate(arrival.checkInDate)",
    "{statValues[definition.key]}",
  ]) {
    expectIncludes(dashboard, expected);
  }

  for (const expected of [
    "notification.zohoEmail.fromAddress",
    "notification.zohoEmail.toAddress",
    "notification.zohoEmail.subject",
    "notification.zohoEmail.receivedAt",
    "notification.zohoEmail.reservationMatched",
  ]) {
    expectIncludes(notifications, expected);
  }

  for (const expected of [
    "<CardDescription>{propertyName}</CardDescription>",
    "value={payment.id}",
    "event.sdkMessage ?? paymentCopy.labels.unavailable",
    "formatDateTime(event.createdAt)",
  ]) {
    expectIncludes(paymentDetail, expected);
  }

  for (const expected of [
    "<CardDescription>{propertyName}</CardDescription>",
    "payment.providerReference ??",
    "formatMoney(payment.amount, payment.currency)",
    "guestEmail",
  ]) {
    expectIncludes(reservationDetail, expected);
  }

  expectIncludes(paymentHistory, "history.totalAttempts");
  expectIncludes(paymentHistory, "attempt.paymentId");
  expectIncludes(paymentHistory, "attempt.environment");
  expectIncludes(accommodation, "/alojamientos/{property.slug}");
  expectIncludes(accommodation, "copy.overview.notes.readonlyBoundaries");
});

test("I.6.5 critical warnings and security boundaries stay visible", () => {
  const additionalCharges = read(`${ADMIN_COMPONENTS}/admin-additional-charges-section.tsx`);
  const cancellation = read(`${ADMIN_COMPONENTS}/admin-reservation-cancellation-section.tsx`);
  const dateChanges = read(`${ADMIN_COMPONENTS}/admin-reservation-date-mutation-section.tsx`);
  const dateChangeControls = read(`${ADMIN_COMPONENTS}/admin-reservation-date-mutation-decision-controls.tsx`);
  const refunds = read(`${ADMIN_COMPONENTS}/admin-reservation-refund-section.tsx`);
  const calendar = read(`${ADMIN_COMPONENTS}/admin-calendar-integrations-page.tsx`);
  const fel = read(`${ADMIN_COMPONENTS}/admin-fel-page.tsx`);
  const publicLocation = read(`${ADMIN_COMPONENTS}/admin-public-location-page.tsx`);

  for (const expected of [
    "copy.notes.financialIsolation",
    "copy.notes.chargeBoundary",
    "copy.notes.requestBoundary",
  ]) {
    expectIncludes(additionalCharges, expected);
  }

  for (const expected of [
    "copy.notes.policyCalculation",
    "copy.notes.refundSeparate",
    "copy.notes.availabilityRelease",
  ]) {
    expectIncludes(cancellation, expected);
  }

  for (const expected of [
    "copy.notes.serverQuote",
    "copy.notes.availability",
    "copy.notes.noMutation",
  ]) {
    expectIncludes(dateChanges, expected);
  }
  expectIncludes(dateChangeControls, "copy.notes.paymentLink");

  for (const expected of [
    "copy.notes.separateLifecycle",
    "copy.notes.providerMovements",
    "copy.executionDialog.description",
    "copy.reconciliationDialog.description",
  ]) {
    expectIncludes(refunds, expected);
  }

  for (const expected of [
    "copy.notes.secretSafe",
    "copy.notes.legacyMigrationDescription",
    "copy.notes.generateRequiredDescription",
    "copy.notes.rotationRequiredDescription",
    "copy.rotationDialog.warningDescription",
  ]) {
    expectIncludes(calendar, expected);
  }

  for (const expected of [
    "copy.notes.noProviderCertification",
    "copy.notes.previewStale",
    "copy.notes.savedSnapshot",
  ]) {
    expectIncludes(fel, expected);
  }

  expectIncludes(publicLocation, "copy.notes.publicOnly");
  expectIncludes(publicLocation, "copy.notes.allowedProviders");
  expectIncludes(publicLocation, "copy.notes.securityDescription");
});

test("I.6.5 implementation record contains the complete admin component audit", () => {
  const doc = read(I65_DOC);
  const sourceFiles = [
    "use-admin-initial-focus-scroll.ts",
    "admin-snackbar.tsx",
    "admin-shell.tsx",
    "admin-reviews-page.tsx",
    "admin-reservations-page.tsx",
    "admin-reservation-refund-section.tsx",
    "admin-reservation-operational-history-section.tsx",
    "admin-reservation-lifecycle-adjustment-refund-section.tsx",
    "admin-reservation-detail-page.tsx",
    "admin-reservation-date-mutation-section.tsx",
    "admin-reservation-date-mutation-decision-controls.tsx",
    "admin-reservation-cancellation-section.tsx",
    "admin-refund-operational-controls.tsx",
    "admin-record-pagination.tsx",
    "admin-public-location-page.tsx",
    "admin-property-photo-manager.tsx",
    "admin-property-calendar.tsx",
    "admin-pricing-manager.tsx",
    "admin-pricing-date-range-calendar.tsx",
    "admin-payments-page.tsx",
    "admin-payment-submission-attempt-history.tsx",
    "admin-payment-detail-page.tsx",
    "admin-page-header.tsx",
    "admin-notifications-page.tsx",
    "admin-fel-page.tsx",
    "admin-dashboard-page.tsx",
    "admin-cron-jobs-page.tsx",
    "admin-catalog-manager.tsx",
    "admin-calendar-integrations-page.tsx",
    "admin-arrival-instructions-editor.tsx",
    "admin-amenities-house-rules-manager.tsx",
    "admin-additional-charges-section.tsx",
    "admin-accommodation-settings.tsx",
    "admin-accommodation-management.tsx",
    "admin-accommodation-content-editor.tsx",
  ];

  for (const file of sourceFiles) {
    expectIncludes(doc, file);
  }

  for (const expected of [
    "Category A",
    "Category B",
    "Category C",
    "Runtime changes are limited to Admin presentation/accessibility",
    "Final-I.6.5 — Implementation completed; Hosted owner validation pending",
    "Final-I.7 — Blocked",
  ]) {
    expectIncludes(doc, expected);
  }
});
