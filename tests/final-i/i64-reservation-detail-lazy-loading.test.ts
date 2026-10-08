import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { shouldLoadAdminReservationTab } from "@/features/admin/reservation-detail-tab-cache";

import { test } from "./harness";

const ROOT = process.cwd();
const DETAIL_ROUTE = "app/admin/reservations/[reservationId]/page.tsx";
const DETAIL_PAGE =
  "features/admin/components/admin-reservation-detail-page.tsx";
const ADDITIONAL_CHARGES =
  "features/admin/components/admin-additional-charges-section.tsx";
const FOCUS_SCROLL_HOOK =
  "features/admin/components/use-admin-initial-focus-scroll.ts";
const DATE_MUTATION_SECTION =
  "features/admin/components/admin-reservation-date-mutation-section.tsx";
const REFUND_SECTION =
  "features/admin/components/admin-reservation-refund-section.tsx";
const LIFECYCLE_REFUND_SECTION =
  "features/admin/components/admin-reservation-lifecycle-adjustment-refund-section.tsx";
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

test("I.6.4 tab load decision helper blocks loops and allows explicit reload", () => {
  assert.equal(
    shouldLoadAdminReservationTab({ status: "idle", stale: false }),
    true,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ status: "ready", stale: false }),
    false,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ status: "ready", stale: true }),
    true,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ status: "error", stale: false }),
    false,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ force: true, status: "error", stale: false }),
    true,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ force: true, status: "loading", stale: true }),
    false,
  );
  assert.equal(
    shouldLoadAdminReservationTab({ force: true, status: "refreshing", stale: true }),
    false,
  );
});

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
    "type CacheStatus = AdminReservationTabCacheStatus;",
    "const [visitedTabs, setVisitedTabs] = useState<",
    "new Set([initialActiveTab])",
    "shouldLoadAdminReservationTab({",
    "inFlightTabsRef.current.has(tab)",
    "inFlightTabsRef.current.add(tab)",
    "inFlightTabsRef.current.delete(tab)",
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

test("I.6.4 financial tab fetch is owned by the financial-specific effect", () => {
  const component = read(DETAIL_PAGE);
  const genericEffect = blockBetween(
    component,
    "  useEffect(() => {\n    if (\n      activeReservationTab === \"additionalCharges\" ||",
    "  }, [activeReservationTab, loadServerTab]);",
  );
  const financialEffect = blockBetween(
    component,
    "  useEffect(() => {\n    if (activeReservationTab === \"financial\") {",
    "  }, [activeFinancialTab, activeReservationTab, loadServerTab]);",
  );

  expectIncludes(genericEffect, 'activeReservationTab === "financial"');
  expectIncludes(genericEffect, "return;");
  expectIncludes(genericEffect, "void loadServerTab(tab);");
  expectIncludes(financialEffect, 'activeFinancialTab === "attempts" ? "payment-attempts" : "financial"');
  expectIncludes(financialEffect, "void loadServerTab(");
});

test("I.6.4 failed lazy loads do not auto-retry and refresh failures keep data", () => {
  const component = read(DETAIL_PAGE);
  const loadServerTab = blockBetween(
    component,
    "const loadServerTab = useCallback(",
    "  useEffect(() => {\n    setVisitedTabs((current) => {",
  );

  expectIncludes(loadServerTab, "shouldLoadAdminReservationTab({");
  expectIncludes(loadServerTab, "status: current.status");
  expectIncludes(loadServerTab, "const hadExistingData = current.data !== null;");
  expectIncludes(loadServerTab, "updateCacheStatus(tab, hadExistingData ? \"refreshing\" : \"loading\");");
  expectIncludes(loadServerTab, "setErrorFeedback(detailCopy.loadFailed);");
  expectIncludes(loadServerTab, "finally {");
  expectIncludes(loadServerTab, "inFlightTabsRef.current.delete(tab);");
});

test("I.6.4 header badge follows lazy payload reservation status", () => {
  const component = read(DETAIL_PAGE);

  expectIncludes(component, "const [reservationStatus, setReservationStatus] = useState(");
  expectIncludes(component, "setReservationStatus(payload.data.status);");
  expectIncludes(component, "const shellBadge = reservationStatusLabel(reservationStatus);");
  expectNotIncludes(component, "const shellBadge = reservationStatusLabel(reservationShell.status);");
});

test("I.6.4 Additional Charges management reload is explicit and locale-stable", () => {
  const component = read(ADDITIONAL_CHARGES);
  const loadManagement = blockBetween(
    component,
    "const loadManagement = useCallback(",
    "  useEffect(() => {\n    void loadManagement(true);",
  );

  expectIncludes(component, "reloadVersion?: number;");
  expectIncludes(component, "onLoadBusyChange?: (busy: boolean) => void;");
  expectIncludes(component, "onLoadBusyChangeRef.current?.(true);");
  expectIncludes(component, "onLoadBusyChangeRef.current?.(false);");
  expectIncludes(component, "if (reloadVersion > 0) {");
  expectIncludes(component, "void loadManagement(false);");
  expectIncludes(component, "onDataChanged?.();");
  expectIncludes(loadManagement, "onLoadBusyChangeRef.current?.(true);");
  expectIncludes(loadManagement, "[reservationId]");
  expectNotIncludes(component, "onRefreshingChange");
  expectNotIncludes(loadManagement, "const shouldNotifyRefreshing = !showLoading;");
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

test("I.6.4 contextual focus cleans URL only after exact focus scroll", () => {
  const additionalCharges = read(ADDITIONAL_CHARGES);
  const dateMutationSection = read(DATE_MUTATION_SECTION);
  const focusHook = read(FOCUS_SCROLL_HOOK);
  const lifecycleRefundSection = read(LIFECYCLE_REFUND_SECTION);
  const refundSection = read(REFUND_SECTION);
  const route = read(DETAIL_ROUTE);
  const component = read(DETAIL_PAGE);
  const service = read(DETAIL_SERVICE);

  expectIncludes(route, "resolveAdminReservationRefundFocusTab");
  expectIncludes(component, "const cleanupInitialFocusQuery = useCallback");
  expectIncludes(component, 'url.searchParams.delete("focus");');
  expectIncludes(component, 'url.searchParams.delete("focusId");');
  expectIncludes(component, "window.history.replaceState(window.history.state, \"\", nextUrl);");
  expectIncludes(component, "onInitialFocusApplied={cleanupInitialFocusQuery}");
  for (const focusedSection of [
    additionalCharges,
    dateMutationSection,
    lifecycleRefundSection,
    refundSection,
  ]) {
    expectIncludes(focusedSection, "onInitialFocusApplied?: () => void;");
  }
  expectIncludes(additionalCharges, "onScrolled: notifyInitialFocusApplied");
  expectIncludes(dateMutationSection, "onScrolled: onInitialFocusApplied");
  expectIncludes(lifecycleRefundSection, "onScrolled: onInitialFocusApplied");
  expectIncludes(refundSection, "onScrolled: onInitialFocusApplied");
  expectIncludes(focusHook, "onScrolled?.();");
  expectNotIncludes(
    component,
    "  useEffect(() => {\n    if (!initialFocus) {\n      return;\n    }\n\n    const url = new URL(window.location.href);",
  );
  expectIncludes(service, "export async function resolveAdminReservationRefundFocusTab");
  expectIncludes(service, "refund.findFirst");
  expectIncludes(service, "payment: {\n        reservationId,");
  expectIncludes(service, 'authorizationType === "ADDITIONAL_CHARGE"');
});

test("I.6.4 reload control is icon-only, localized and scoped to the active data unit", () => {
  const component = read(DETAIL_PAGE);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");
  const header = blockBetween(component, "<AdminPageHeader", "      <AdminSnackbar");
  const actions = blockBetween(header, "actions={", "        badge={shellBadge}");
  const reloadButton = blockBetween(
    actions,
    "aria-label={detailCopy.reload}",
    "</Button>",
  );
  const reloadUnit = blockBetween(
    component,
    "  function reloadActiveUnit(): void {",
    "  function getActiveReloadBusy(): boolean {",
  );

  expectNotIncludes(component, "function PanelToolbar");
  expectNotIncludes(component, "<PanelToolbar");
  expectIncludes(actions, '<div className="flex items-center gap-2">');
  assert.ok(
    actions.indexOf('href="/admin/reservations"') <
      actions.indexOf("aria-label={detailCopy.reload}"),
    "Reload action should render after the Reservations back button",
  );
  expectIncludes(reloadButton, 'size="icon"');
  expectIncludes(reloadButton, "<RefreshCcw");
  expectNotIncludes(reloadButton, "\n                    {detailCopy.reload}\n");
  expectIncludes(actions, '<TooltipContent align="end" side="bottom">');
  expectIncludes(actions, "{detailCopy.reload}");
  expectIncludes(component, "function isCacheBusy(entry: CacheEntry<unknown>): boolean");
  expectIncludes(component, 'entry.status === "loading" || entry.status === "refreshing"');
  expectIncludes(component, "function getActiveReloadBusy(): boolean");
  expectIncludes(component, 'activeReservationTab === "additionalCharges"');
  expectIncludes(component, 'additionalChargesLoadBusy || !visitedTabs.has("additionalCharges")');
  expectIncludes(component, 'const [additionalChargesLoadBusy, setAdditionalChargesLoadBusy] = useState(');
  expectIncludes(component, 'initialActiveTab === "additionalCharges"');
  expectIncludes(component, 'value === "additionalCharges" && !visitedTabs.has(value)');
  expectIncludes(component, 'activeFinancialTab === "attempts" ? attemptsCache : financialCache');
  expectIncludes(component, "return isCacheBusy(getCacheForTab(tab));");
  expectIncludes(component, "const activeReloadBusy = getActiveReloadBusy();");
  expectIncludes(component, "aria-busy={activeReloadBusy}");
  expectIncludes(component, "disabled={activeReloadBusy}");
  expectIncludes(component, 'className={activeReloadBusy ? "animate-spin" : undefined}');
  expectIncludes(component, "onLoadBusyChange={setAdditionalChargesLoadBusy}");
  expectIncludes(reloadUnit, "setAdditionalChargesReloadVersion((value) => value + 1);");
  expectIncludes(reloadUnit, 'activeFinancialTab === "attempts" ? "payment-attempts" : "financial"');

  expectIncludes(es, 'reload: "Recargar"');
  expectIncludes(en, 'reload: "Reload"');
});
