import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function expectAll(text: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    assert.ok(
      text.includes(fragment),
      `Expected source contract fragment not found: ${fragment}`,
    );
  }
}

function expectNone(text: string, fragments: readonly string[]): void {
  for (const fragment of fragments) {
    assert.equal(
      text.includes(fragment),
      false,
      `Unexpected source contract fragment found: ${fragment}`,
    );
  }
}

function functionBody(text: string, functionName: string): string {
  const start = text.indexOf(`async function ${functionName}`);
  assert.notEqual(start, -1, `Function ${functionName} was not found.`);

  const nextFunction = text.indexOf("\n  async function ", start + 1);
  return text.slice(start, nextFunction === -1 ? text.length : nextFunction);
}

test("A.3 standard and extraordinary authorization remain Reservation-level and Serializable", () => {
  const text = source("lib/admin/refunds.ts");

  expectAll(text, [
    "getReservationFinancialSummary",
    "allocateReservationRefund",
    "fenceAllocatedPayments",
    "buildStandardRefundOperationKey",
    "buildExtraordinaryRefundOperationKey",
    "buildRefundChildIdempotencyKey",
    "refundOperationKey: input.operationKey",
    "Prisma.TransactionIsolationLevel.Serializable",
    'error.code === "P2002" || error.code === "P2034"',
  ]);
});

test("A.3 every allocated provider leg is fenced against its exact Payment version", () => {
  const text = source("lib/admin/refunds.ts");
  const start = text.indexOf("async function fenceAllocatedPayments");
  const end = text.indexOf("async function createRefundChildren", start);
  assert.ok(start >= 0 && end > start);
  const body = text.slice(start, end);

  expectAll(body, [
    "id: leg.paymentId",
    "updatedAt: leg.expectedPaymentUpdatedAt",
    "updateMany",
  ]);
});

test("A.3 Tilopay execute, consult, and reconcile remain child Refund / exact Payment operations", () => {
  const text = source("lib/admin/refunds.ts");

  const executeStart = text.indexOf("export async function executeAdminTilopayRefund");
  const consultStart = text.indexOf("export async function consultAdminTilopayRefund");
  const reconcileStart = text.indexOf("export async function reconcileAdminRefund");
  assert.ok(executeStart >= 0 && consultStart > executeStart && reconcileStart > consultStart);

  const execute = text.slice(executeStart, consultStart);
  const consult = text.slice(consultStart, reconcileStart);
  const reconcile = text.slice(reconcileStart);

  expectAll(execute, [
    "refund.payment.providerReference",
    "paymentId: refund.payment.id",
    "orderNumber: refund.payment.providerReference",
    "expectedPaymentUpdatedAt",
  ]);
  expectAll(consult, [
    "refund.payment.providerReference",
    "classifyConsultEvidence",
  ]);
  expectAll(reconcile, [
    "refund.paymentId",
    "expectedPaymentUpdatedAt",
    "approvedRefundTotalExcluding",
    "Prisma.TransactionIsolationLevel.Serializable",
  ]);
});

test("A.4 negative DATE_CHANGE keeps pooled allocation separate from exact failed-positive compensation", () => {
  const text = source("lib/reservations/lifecycle-adjustment-refunds.ts");

  expectAll(text, [
    "createNegativeLifecycleAdjustmentRefundInTransaction",
    "getReservationFinancialSummary",
    "allocateReservationRefund",
    "buildNegativeLifecycleRefundOperationKey",
    "refundOperationKey: operationKey",
    "runSerializableRefundTransaction",
    "Prisma.TransactionIsolationLevel.Serializable",
  ]);

  const compensationStart = text.indexOf("export async function compensateApprovedLifecycleAdjustmentPayment");
  assert.notEqual(compensationStart, -1);
  const compensation = text.slice(compensationStart);
  expectAll(compensation, [
    "payment.id",
    "payment.amount",
    "runSerializableRefundTransaction",
  ]);
});

test("A.4 negative completion authorizes Refund children before applying the Reservation mutation", () => {
  const text = source("lib/reservations/negative-date-mutation-completion.ts");
  const refundCall = text.indexOf("createNegativeLifecycleAdjustmentRefundInTransaction(");
  const reservationUpdate = text.indexOf("transaction.reservation.updateMany(", refundCall);

  assert.ok(refundCall >= 0, "Negative refund authorization call was not found.");
  assert.ok(
    reservationUpdate > refundCall,
    "Reservation mutation must remain after negative refund authorization.",
  );
  expectAll(text, [
    "refundOperationKey: refundOperation.refundOperationKey",
    "refundIds: refundOperation.refunds.map",
    "refundPaymentIds: refundOperation.refunds.map",
  ]);
});

test("A.5 admin authorization payload no longer sends a single source Payment fence", () => {
  const text = source(
    "features/admin/components/admin-reservation-refund-section.tsx",
  );
  const body = functionBody(text, "authorizeRefund");

  expectAll(body, ["reservation.id", "authorizationDraft.amount", "processingMode"]);
  expectNone(body, ["paymentId:", "expectedPaymentUpdatedAt:"]);
});

test("A.5 admin presentation groups logical Refund operations while preserving child controls", () => {
  const text = source(
    "features/admin/components/admin-reservation-refund-section.tsx",
  );

  expectAll(text, [
    "groupAdminRefundsByOperation",
    "reservation.financialSummary",
    "group.refundOperationKey",
    "onExecute",
    "onConsult",
    "onReconcile",
  ]);
});

test("A.5 refund notifications aggregate split-operation context but keep child confirmation semantics", () => {
  const text = source("lib/email/lifecycle-notifications.ts");

  expectAll(text, [
    "refundOperationKey: true",
    "readRefundOperationEmailContext",
    "aggregateLifecycleRefundStatus",
    "request.financialDifference.abs().toFixed(2)",
    "approvedMovementCount",
    "movementCount",
  ]);
});

test("A.3 persistence keeps nullable indexed refund_operation_key grouping", () => {
  const text = source("prisma/schema.prisma");

  expectAll(text, [
    'refundOperationKey  String?                 @map("refund_operation_key")',
    "@@index([refundOperationKey])",
  ]);
});
