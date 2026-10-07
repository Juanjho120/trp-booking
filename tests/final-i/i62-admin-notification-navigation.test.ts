import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { AdminNotificationType } from "@prisma/client";

import {
  buildAdminReservationFocusedTargetPath,
  parseAdminReservationDetailFocusQuery,
  resolveAdminNotificationReservationFocus,
  resolveAdminReservationDetailInitialTab,
} from "@/lib/admin/reservation-detail-focus";

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

const NOTIFICATIONS_PAGE = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const NOTIFICATION_CENTER = read("lib/admin-notifications/center.ts");
const RESERVATION_ROUTE = read(
  "app/admin/reservations/[reservationId]/page.tsx",
);
const RESERVATION_DETAIL = read(
  "features/admin/components/admin-reservation-detail-page.tsx",
);
const ADDITIONAL_CHARGES = read(
  "features/admin/components/admin-additional-charges-section.tsx",
);
const DATE_MUTATION = read(
  "features/admin/components/admin-reservation-date-mutation-section.tsx",
);
const STANDARD_REFUNDS = read(
  "features/admin/components/admin-reservation-refund-section.tsx",
);
const LIFECYCLE_REFUNDS = read(
  "features/admin/components/admin-reservation-lifecycle-adjustment-refund-section.tsx",
);
const FOCUS_SCROLL_HOOK = read(
  "features/admin/components/use-admin-initial-focus-scroll.ts",
);
const ADMIN_SHELL = read("features/admin/components/admin-shell.tsx");
const PUBLIC_SITE_HEADER = read("components/layout/site-header.tsx");
const TOOLTIP = read("components/ui/tooltip.tsx");
const PACKAGE_JSON = read("package.json");

test("I.6.2 G notifications accordion uses a stable controlled string closed state", () => {
  expectIncludes(
    NOTIFICATIONS_PAGE,
    "const [openNotificationId, setOpenNotificationId] = useState(",
  );
  expectIncludes(NOTIFICATIONS_PAGE, "initialNotificationId ?? \"\"");
  expectIncludes(NOTIFICATIONS_PAGE, "value={openNotificationId}");
  expectIncludes(NOTIFICATIONS_PAGE, "setOpenNotificationId(value || \"\")");
  expectNotIncludes(NOTIFICATIONS_PAGE, "setOpenNotificationId(value || undefined)");
  expectNotIncludes(NOTIFICATIONS_PAGE, "initialNotificationId ?? undefined");

  let openNotificationId = "";
  const applyAccordionValue = (value: string) => {
    openNotificationId = value || "";
  };

  applyAccordionValue("notification-a");
  assert.equal(openNotificationId, "notification-a");
  applyAccordionValue("");
  assert.equal(openNotificationId, "");
  applyAccordionValue("notification-a");
  applyAccordionValue("notification-b");
  assert.equal(openNotificationId, "notification-b");
  applyAccordionValue("");
  assert.equal(openNotificationId, "");
});

test("I.6.2 H notification center uses server-side pagination and canonical targeted pages", () => {
  for (const expected of [
    "export const ADMIN_NOTIFICATION_CENTER_PAGE_SIZE = 10",
    "normalizeAdminNotificationCenterPage",
    "resolveAdminNotificationCenterSafePage",
    "resolveAdminNotificationCenterSkip(page)",
    "resolveAdminNotificationTargetPage",
    "orderBy: [{ createdAt: \"desc\" }, { id: \"desc\" }]",
    "skip: resolveAdminNotificationCenterSkip(page)",
    "take: ADMIN_NOTIFICATION_CENTER_PAGE_SIZE",
    "pagination: {",
    "totalItems",
    "totalPages",
    "reads: {",
    "none: { userId: user.id }",
  ]) {
    expectIncludes(NOTIFICATION_CENTER, expected);
  }

  expectIncludes(NOTIFICATION_CENTER, "createdAt: {");
  expectIncludes(NOTIFICATION_CENTER, "gt: targetedNotification.createdAt");
  expectIncludes(NOTIFICATION_CENTER, "equals: targetedNotification.createdAt");
  expectIncludes(NOTIFICATION_CENTER, "id: {");
  expectIncludes(NOTIFICATION_CENTER, "gt: targetedNotification.id");
  expectNotIncludes(NOTIFICATION_CENTER, "mergeTargetedAdminNotification");
  expectIncludes(NOTIFICATIONS_PAGE, "notificationPagination.totalItems");
  expectIncludes(NOTIFICATIONS_PAGE, "navigateNotificationPage");
  expectIncludes(NOTIFICATIONS_PAGE, "/admin/notifications?page=${page}");
});

test("I.6.2 I derives safe financial notification focus targets from existing deduplication keys", () => {
  assert.deepEqual(
    resolveAdminNotificationReservationFocus({
      type: AdminNotificationType.ADDITIONAL_CHARGE_PAID,
      deduplicationKey: "admin-notification/additional-charge-paid/gpr_ABC-123",
    }),
    {
      kind: "additionalChargePaymentRequest",
      focusId: "gpr_ABC-123",
    },
  );
  assert.deepEqual(
    resolveAdminNotificationReservationFocus({
      type: AdminNotificationType.LIFECYCLE_ADJUSTMENT_PAID,
      deduplicationKey: "admin-notification/lifecycle-adjustment-paid/life_123",
    }),
    { kind: "lifecycleAdjustment", focusId: "life_123" },
  );
  assert.deepEqual(
    resolveAdminNotificationReservationFocus({
      type: AdminNotificationType.REFUND_PROCESSED,
      deduplicationKey: "admin-notification/refund-processed/refund_123",
    }),
    { kind: "refund", focusId: "refund_123" },
  );
  assert.equal(
    resolveAdminNotificationReservationFocus({
      type: AdminNotificationType.REFUND_PROCESSED,
      deduplicationKey: "admin-notification/refund-processed/unsafe/path",
    }),
    null,
  );
  assert.equal(
    resolveAdminNotificationReservationFocus({
      type: AdminNotificationType.RESERVATION_CONFIRMED,
      deduplicationKey: "admin-notification/refund-processed/refund_123",
    }),
    null,
  );
  assert.equal(
    buildAdminReservationFocusedTargetPath({
      reservationId: "reservation 1",
      focus: { kind: "refund", focusId: "refund_123" },
    }),
    "/admin/reservations/reservation%201?focus=refund&focusId=refund_123",
  );
});

test("I.6.2 I reservation focus parsing rejects unsafe query input", () => {
  assert.deepEqual(
    parseAdminReservationDetailFocusQuery({
      focus: ["refund"],
      focusId: ["refund_123"],
    }),
    { kind: "refund", focusId: "refund_123" },
  );
  assert.equal(
    parseAdminReservationDetailFocusQuery({
      focus: "invalid",
      focusId: "refund_123",
    }),
    null,
  );
  assert.equal(
    parseAdminReservationDetailFocusQuery({
      focus: "refund",
      focusId: "a".repeat(161),
    }),
    null,
  );
  assert.equal(
    parseAdminReservationDetailFocusQuery({
      focus: "refund",
      focusId: "refund/123",
    }),
    null,
  );
  assert.equal(
    parseAdminReservationDetailFocusQuery({
      focus: "refund",
    }),
    null,
  );
});

test("I.6.2 I reservation focus selects the correct initial top-level tab", () => {
  const refunds = [
    { id: "refund-stay", authorizationType: "STANDARD" },
    { id: "refund-life", authorizationType: "LIFECYCLE_ADJUSTMENT" },
    { id: "refund-charge", authorizationType: "ADDITIONAL_CHARGE" },
  ];

  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: null,
      refunds,
    }),
    "reservation",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "additionalChargePaymentRequest", focusId: "gpr-1" },
      refunds,
    }),
    "additionalCharges",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "lifecycleAdjustment", focusId: "life-1" },
      refunds,
    }),
    "changes",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "refund", focusId: "refund-stay" },
      refunds,
    }),
    "refunds",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "refund", focusId: "refund-life" },
      refunds,
    }),
    "refunds",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "refund", focusId: "refund-charge" },
      refunds,
    }),
    "additionalCharges",
  );
  assert.equal(
    resolveAdminReservationDetailInitialTab({
      focus: { kind: "refund", focusId: "missing" },
      refunds,
    }),
    "reservation",
  );
});

test("I.6.2 I reservation detail wires bounded focus into exact accordion targets", () => {
  for (const expected of [
    "parseAdminReservationDetailFocusQuery",
    "const initialFocus = parseAdminReservationDetailFocusQuery(focusParams)",
    "initialFocus={initialFocus}",
  ]) {
    expectIncludes(RESERVATION_ROUTE, expected);
  }

  for (const expected of [
    "resolveAdminReservationDetailInitialTab",
    "value={activeReservationTab}",
    "setActiveReservationTab(value)",
    "initialFocus={initialFocus}",
    "focusedRefundId={",
    "focusedLifecycleRequestId={",
  ]) {
    expectIncludes(RESERVATION_DETAIL, expected);
  }

  for (const expected of [
    "initialFocus?.kind === \"additionalChargePaymentRequest\"",
    "setActiveTab(\"requests\")",
    "setOpenPaymentRequestId(paymentRequest.id)",
    "setActiveTab(\"charges\")",
    "setOpenChargeId(charge.id)",
    "setOpenRefundHistoryId(initialFocus.focusId)",
    "registerFocusElement(`request:${request.id}`, element)",
    "registerFocusElement(",
    "`refund:${refund.id}`",
    "value={openPaymentRequestId}",
    "value={openRefundHistoryId}",
  ]) {
    expectIncludes(ADDITIONAL_CHARGES, expected);
  }

  for (const expected of [
    "focusedLifecycleRequestId",
    "requestPagination.setPage(",
    "setOpenRequestId(focusedLifecycleRequestId)",
    "value={openRequestId}",
    "registerRequestElement(request.id, element)",
  ]) {
    expectIncludes(DATE_MUTATION, expected);
  }

  for (const expected of [
    "focusedRefundId",
    "refundPagination.setPage(",
    "setOpenRefundGroupId(focusedRefundGroupValue)",
    "setOpenNestedRefundId(focusedRefundId)",
    "value={openRefundGroupId}",
    "value={openNestedRefundId}",
    "registerRefundElement(group.refunds[0].id, element)",
  ]) {
    expectIncludes(STANDARD_REFUNDS, expected);
  }

  for (const expected of [
    "focusedRefundId",
    "entryPagination.setPage(",
    "setOpenLifecycleRefundId(`refund:${focusedRefundId}`)",
    "value={openLifecycleRefundId}",
    "registerRefundElement(refund.id, element)",
  ]) {
    expectIncludes(LIFECYCLE_REFUNDS, expected);
  }

  assert.doesNotMatch(
    `${ADDITIONAL_CHARGES}\n${DATE_MUTATION}\n${STANDARD_REFUNDS}\n${LIFECYCLE_REFUNDS}`,
    /value=\{undefined\}|value=\{open[A-Za-z]+Id \?\? undefined\}/,
  );
});

test("I.6.2 I shared focus scroll waits for layout and respects reduced motion once per focus", () => {
  for (const expected of [
    "scrolledFocusKeyRef.current === focusKey",
    "window.requestAnimationFrame(() =>",
    "secondFrameRef.current = window.requestAnimationFrame(() =>",
    "(prefers-reduced-motion: reduce)",
    "scrollIntoView({",
    "block: \"start\"",
    "behavior: reducedMotion ? \"auto\" : \"smooth\"",
    "scrolledFocusKeyRef.current = focusKey",
    "window.cancelAnimationFrame",
  ]) {
    expectIncludes(FOCUS_SCROLL_HOOK, expected);
  }
});

test("I.6.2 J Open marks unread notifications read without removing manual mark-read", () => {
  for (const expected of [
    "async function markNotificationReadForOpen(",
    "/api/admin/notifications/${encodeURIComponent(",
    "applyNotificationReadState(notification.id, result.readAt)",
    "router.push(targetPath)",
    "catch {",
    "Opening the bounded Admin target remains available",
    "onClick={() => void openAdminNotificationTarget(notification)}",
    "onClick={() => void markNotificationRead(notification)}",
    "copy.actions.markRead",
  ]) {
    expectIncludes(NOTIFICATIONS_PAGE, expected);
  }

  const accordionChangeBlock = NOTIFICATIONS_PAGE.slice(
    NOTIFICATIONS_PAGE.indexOf("onValueChange={(value) =>"),
    NOTIFICATIONS_PAGE.indexOf("type=\"single\""),
  );
  expectNotIncludes(accordionChangeBlock, "markNotificationRead");
  expectNotIncludes(accordionChangeBlock, "markNotificationReadForOpen");
});

test("I.6.2 K Admin identity moves to the Admin header and public shell stays untouched", () => {
  const desktopAside = ADMIN_SHELL.slice(
    ADMIN_SHELL.indexOf("<aside"),
    ADMIN_SHELL.indexOf("</aside>"),
  );
  const header = ADMIN_SHELL.slice(
    ADMIN_SHELL.indexOf("<header"),
    ADMIN_SHELL.indexOf("</header>"),
  );
  const mobileSheet = ADMIN_SHELL.slice(
    ADMIN_SHELL.indexOf("<SheetContent"),
    ADMIN_SHELL.indexOf("</SheetContent>"),
  );

  expectIncludes(ADMIN_SHELL, "function AdminUserIdentity");
  expectIncludes(ADMIN_SHELL, "variant?: \"compact\" | \"full\"");
  expectIncludes(ADMIN_SHELL, "variant === \"compact\"");
  expectIncludes(
    header,
    "<AdminUserIdentity className=\"hidden md:inline-flex\" variant=\"compact\" />",
  );
  assert.ok(
    header.indexOf("AdminUserIdentity") < header.indexOf("LocaleSwitcher"),
    "Admin identity should render before the LocaleSwitcher in the header",
  );
  expectNotIncludes(header, "adminEmail");
  expectIncludes(desktopAside, "<AccountActions />");
  expectNotIncludes(desktopAside, "<AdminUserIdentity");
  expectIncludes(desktopAside, "min-h-0 flex-1 overflow-y-auto px-5 py-5");
  expectIncludes(mobileSheet, "<AdminUserIdentity variant=\"full\" />");
  expectIncludes(mobileSheet, "<AccountActions />");
  expectIncludes(mobileSheet, "min-h-0 flex-1 overflow-y-auto px-5 py-5");
  expectIncludes(ADMIN_SHELL, "copy.publicSite");
  expectIncludes(ADMIN_SHELL, "copy.signOut");
  expectNotIncludes(PUBLIC_SITE_HEADER, "AdminUserIdentity");
});

test("I.6.2 K compact Admin identity keeps email in an accessible Radix tooltip only", () => {
  for (const expected of [
    "Tooltip",
    "TooltipContent",
    "TooltipProvider",
    "TooltipTrigger",
    "h-10 max-w-72 items-center rounded-full",
    "tabIndex={adminEmail ? 0 : undefined}",
    "<span className=\"truncate\">{adminName}</span>",
    "<TooltipTrigger asChild>{identity}</TooltipTrigger>",
    "<TooltipContent align=\"end\" side=\"bottom\">",
    "{adminEmail}",
  ]) {
    expectIncludes(ADMIN_SHELL, expected);
  }

  const compactBranch = ADMIN_SHELL.slice(
    ADMIN_SHELL.indexOf("if (variant === \"compact\")"),
    ADMIN_SHELL.indexOf("return (", ADMIN_SHELL.indexOf("if (variant === \"compact\")") + 1),
  );
  expectNotIncludes(compactBranch, "text-xs text-muted-foreground");
  expectNotIncludes(compactBranch, "mt-1 truncate");

  for (const expected of [
    "import { Tooltip as TooltipPrimitive } from \"radix-ui\";",
    "TooltipPrimitive.Provider",
    "TooltipPrimitive.Root",
    "TooltipPrimitive.Trigger",
    "TooltipPrimitive.Content",
    "bg-popover",
    "text-popover-foreground",
    "px-3 py-2 text-xs",
  ]) {
    expectIncludes(TOOLTIP, expected);
  }

  expectIncludes(PACKAGE_JSON, "\"radix-ui\":");
  expectNotIncludes(PACKAGE_JSON, "\"@radix-ui/react-tooltip\"");
});
