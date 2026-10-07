import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const DETAIL_ROUTE = "app/admin/reservations/[reservationId]/page.tsx";
const DETAIL_PAGE =
  "features/admin/components/admin-reservation-detail-page.tsx";
const ADDITIONAL_CHARGES =
  "features/admin/components/admin-additional-charges-section.tsx";
const TAB_ROUTE =
  "app/api/admin/reservations/[reservationId]/tabs/[tab]/route.ts";
const DETAIL_SERVICE = "lib/admin/reservation-detail.ts";

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

test("I.6.4 reservation detail route renders only the lightweight shell initially", () => {
  const route = read(DETAIL_ROUTE);

  expectIncludes(route, "getAdminReservationDetailShell");
  expectIncludes(route, "reservationShell={reservation}");
  expectIncludes(route, "resolveAdminReservationRefundFocusTab");
  assert.doesNotMatch(route, /\bgetAdminReservationDetail\(/);
  expectNotIncludes(route, "getAdminPaymentSubmissionAttemptsForReservation");
  expectNotIncludes(route, "paymentAttempts");
});

test("I.6.4 authenticated tab API uses a closed reservation-detail tab contract", () => {
  const route = read(TAB_ROUTE);
  const service = read(DETAIL_SERVICE);

  for (const expected of [
    '"reservation"',
    '"financial"',
    '"payment-attempts"',
    '"emails"',
    '"lifecycle"',
    '"refunds"',
    '"changes"',
    '"history"',
    "getAdminSessionActor()",
    "ADMIN_UNAUTHORIZED",
    "INVALID_ADMIN_RESERVATION_TAB_REQUEST",
    "ADMIN_RESERVATION_NOT_FOUND",
  ]) {
    expectIncludes(route, expected);
  }

  for (const expected of [
    "getAdminReservationOverviewTab",
    "getAdminReservationFinancialTab",
    "getAdminReservationEmailsTab",
    "getAdminReservationLifecycleTab",
    "getAdminReservationRefundsTab",
    "getAdminReservationChangesTab",
    "getAdminReservationHistoryTab",
    "getAdminPaymentSubmissionAttemptsForReservation",
  ]) {
    expectIncludes(route, expected);
  }

  for (const expected of [
    "export async function getAdminReservationDetailShell",
    "export async function getAdminReservationOverviewTab",
    "export async function getAdminReservationFinancialTab",
    "export async function getAdminReservationEmailsTab",
    "export async function getAdminReservationLifecycleTab",
    "export async function getAdminReservationRefundsTab",
    "export async function getAdminReservationChangesTab",
    "export async function getAdminReservationHistoryTab",
  ]) {
    expectIncludes(service, expected);
  }
});

test("I.6.4 page-scoped tab cache lazy-loads once and keeps visited tabs mounted", () => {
  const component = read(DETAIL_PAGE);

  for (const expected of [
    "type CacheStatus = \"idle\" | \"loading\" | \"ready\" | \"refreshing\" | \"error\";",
    "const [visitedTabs, setVisitedTabs] = useState<",
    "new Set([initialActiveTab])",
    "current.status === \"ready\" && !current.stale",
    "cache: \"no-store\"",
    "setCacheForTab(payload)",
    "forceMount",
    "data-[state=inactive]:hidden",
  ]) {
    expectIncludes(component, expected);
  }

  assert.doesNotMatch(component, /router\.refresh/);
  assert.doesNotMatch(component, /useRouter/);
});

test("I.6.4 financial summary and payment attempts are separate cached units", () => {
  const component = read(DETAIL_PAGE);

  for (const expected of [
    "const [financialCache, setFinancialCache] = useState<",
    "CacheEntry<AdminReservationFinancialTab>",
    "const [attemptsCache, setAttemptsCache] = useState<",
    "CacheEntry<AdminPaymentSubmissionAttemptHistoryData>",
    "activeFinancialTab === \"attempts\" ? \"payment-attempts\" : \"financial\"",
    "detailCopy.financial.summary",
    "detailCopy.financial.attempts",
    "renderFinancialError",
    "renderAttemptsError",
    "<AdminPaymentSubmissionAttemptHistory history={attempts} />",
  ]) {
    expectIncludes(component, expected);
  }
});

test("I.6.4 Additional Charges management reload is explicit and locale-stable", () => {
  const component = read(ADDITIONAL_CHARGES);
  const loadManagement = blockBetween(
    component,
    "const loadManagement = useCallback(",
    "  useEffect(() => {\n    void loadManagement(true);",
  );

  expectIncludes(component, "reloadVersion?: number;");
  expectIncludes(component, "if (reloadVersion > 0) {");
  expectIncludes(component, "void loadManagement(false);");
  expectIncludes(component, "onDataChanged?.();");
  expectIncludes(loadManagement, "[reservationId]");
  expectNotIncludes(loadManagement, "resolveError");
  expectNotIncludes(loadManagement, "[copy]");
});

test("I.6.4 mutations invalidate dependent units without full route refresh", () => {
  const component = read(DETAIL_PAGE);

  for (const expected of [
    "function handleLifecycleChanged(): void {",
    'markTabsStale(["reservation", "changes", "refunds", "financial", "history"])',
    "void loadServerTab(\"lifecycle\", { force: true });",
    "function handleChangesChanged(): void {",
    'markTabsStale(["reservation", "financial", "refunds", "history"])',
    "void loadServerTab(\"changes\", { force: true });",
    "function handleRefundsChanged(): void {",
    'markTabsStale(["financial", "history"])',
    "void loadServerTab(\"refunds\", { force: true });",
    "function handleAdditionalChargesChanged(): void {",
  ]) {
    expectIncludes(component, expected);
  }
});

test("I.6.4 contextual focus uses lightweight refund lookup and cleans URL state", () => {
  const route = read(DETAIL_ROUTE);
  const component = read(DETAIL_PAGE);
  const service = read(DETAIL_SERVICE);

  expectIncludes(route, "resolveAdminReservationRefundFocusTab");
  expectIncludes(component, 'url.searchParams.delete("focus");');
  expectIncludes(component, 'url.searchParams.delete("focusId");');
  expectIncludes(component, "window.history.replaceState(window.history.state, \"\", nextUrl);");
  expectIncludes(service, "export async function resolveAdminReservationRefundFocusTab");
  expectIncludes(service, "refund.findFirst");
  expectIncludes(service, "payment: {\n        reservationId,");
  expectIncludes(service, 'authorizationType === "ADDITIONAL_CHARGE"');
});

test("I.6.4 reload control is icon-only, localized and scoped to the active data unit", () => {
  const component = read(DETAIL_PAGE);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  for (const expected of [
    "function PanelToolbar",
    "size=\"icon\"",
    "aria-label={label}",
    "<TooltipContent align=\"end\" side=\"bottom\">",
    "setAdditionalChargesReloadVersion((value) => value + 1);",
    "reloadActiveUnit",
  ]) {
    expectIncludes(component, expected);
  }

  expectIncludes(es, 'reload: "Recargar"');
  expectIncludes(en, 'reload: "Reload"');
});
