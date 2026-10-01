import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { listCronJobDefinitions } from "@/lib/cron/registry";

import { test } from "./harness";

const ROOT = process.cwd();
const I5_RECORD =
  "docs/213-final-i-5-fel-fiscal-domain-contract-and-architecture.md";

const EXPECTED_CRON_JOBS = [
  ["SYNC_AIRBNB_CALENDARS", "sync-airbnb-calendars", "*/30 * * * *"],
  [
    "EXPIRE_PENDING_RESERVATION_HOLDS",
    "expire-pending-reservation-holds",
    "*/5 * * * *",
  ],
  ["PROCESS_EMAIL_NOTIFICATIONS", "process-email-notifications", "*/5 * * * *"],
  [
    "SCHEDULE_ARRIVAL_INSTRUCTIONS",
    "schedule-arrival-instructions",
    "*/30 * * * *",
  ],
  [
    "SCHEDULE_REVIEW_INVITATIONS",
    "schedule-review-invitations",
    "*/30 * * * *",
  ],
  [
    "PROCESS_ADMIN_PUSH_NOTIFICATIONS",
    "process-admin-push-notifications",
    "*/5 * * * *",
  ],
] as const;

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readRecord(): string {
  return read(I5_RECORD);
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(
    source.includes(expected),
    `Expected ${I5_RECORD} to include: ${expected}`,
  );
}

test("I.5 freezes the payment versus fiscal-line source-of-truth contract", () => {
  const record = readRecord();

  expectIncludes(record, "PAYMENT != FISCAL LINE");
  expectIncludes(
    record,
    "INITIAL_RESERVATION Payment.amount must not be added on top of Reservation.total.",
  );
  expectIncludes(
    record,
    "LIFECYCLE_ADJUSTMENT Payment.amount must not become a separate fiscal service line",
  );
  expectIncludes(
    record,
    "ADDITIONAL_CHARGE Payment.amount is settlement evidence for immutable GuestPaymentRequestItem snapshots",
  );
  expectIncludes(record, "final current commercial state");
  expectIncludes(record, "GuestPaymentRequestItem");
  expectIncludes(record, "invoiceCommercialGross");
  expectIncludes(record, "USD 445");
});

test("I.5 freezes additional-charge, refund and credit-note separation", () => {
  const record = readRecord();

  expectIncludes(record, "AdditionalCharge identity");
  expectIncludes(record, "GuestPaymentRequestItem immutable snapshot");
  expectIncludes(record, "approved refund allocations");
  expectIncludes(record, "refund happened BEFORE FEL certification");
  expectIncludes(record, "refund happened AFTER FEL certification");
  expectIncludes(record, "Credit Note != Refund");
  expectIncludes(record, "Refund != Credit Note");
  expectIncludes(
    record,
    "Reservation cancellation != Payment refund != FEL DTE cancellation != Credit Note",
  );
});

test("I.5 freezes receiver, document-type and multi-reservation boundaries", () => {
  const record = readRecord();

  expectIncludes(record, "fiscal receiver != booking guest");
  expectIncludes(record, "Reservation guest != fiscal receiver");
  expectIncludes(record, "receiverTaxIdentifierType");
  expectIncludes(record, "Consumidor Final");
  expectIncludes(record, "Q2,500");
  expectIncludes(record, "SMALL_TAXPAYER_INVOICE");
  expectIncludes(record, "CREDIT_NOTE");
  expectIncludes(record, "one document -> multiple reservations");
  expectIncludes(record, "FelDocument 1 --- N FelDocumentReservation");
  expectIncludes(record, "same intended fiscal receiver");
});

test("I.5 documents provider-independent persistence and INFILE blocking", () => {
  const record = readRecord();

  for (const modelName of [
    "FelDocument",
    "FelDocumentReservation",
    "FelLineItem",
    "FelLineSource",
    "FelCommercialSourceAllocation",
    "FelProviderAttempt",
    "FelCreditAllocation",
  ]) {
    expectIncludes(record, modelName);
  }

  expectIncludes(record, "FelProviderAdapter");
  expectIncludes(record, "timeout after request != safe to resubmit");
  expectIncludes(record, "Do not silently convert USD to GTQ.");
  expectIncludes(record, "individual/grouped extras");
  expectIncludes(record, "Grouping must preserve provenance.");
  expectIncludes(record, "After `CERTIFIED`, freeze:");
  expectIncludes(record, "Final-I.6 can proceed with provider-independent persistence/UI");
  expectIncludes(
    record,
    "Final-I.7 remains blocked until the owner provides official INFILE technical documentation and Test credentials.",
  );
  expectIncludes(record, "Domain Relationship Diagram");
  expectIncludes(record, "Fiscal State Machine Diagram");
  expectIncludes(record, "Provider Boundary Diagram");
});

test("I.5 separates provenance evidence from exclusive commercial source consumption", () => {
  const record = readRecord();

  expectIncludes(record, "Fiscal line provenance/evidence");
  expectIncludes(record, "Fiscal commercial-source consumption");
  expectIncludes(record, "FelLineSource != fiscal source consumption lock");
  expectIncludes(record, "sourceRole");
  expectIncludes(record, "AMOUNT_SOURCE");
  expectIncludes(record, "SETTLEMENT_EVIDENCE");
  expectIncludes(record, "REFUND_EVIDENCE");
  expectIncludes(record, "LIFECYCLE_EVIDENCE");
  expectIncludes(record, "Payment evidence contributes zero additional fiscal amount.");
  expectIncludes(
    record,
    "FelCommercialSourceAllocation.amountSnapshot",
  );
  expectIncludes(
    record,
    "FelCommercialSourceAllocation.currencySnapshot",
  );
  expectIncludes(
    record,
    "These are the only canonical commercial source amounts used to construct fiscal line totals.",
  );
  expectIncludes(
    record,
    "FelLineSource rows are never summed to compute:",
  );
  expectIncludes(
    record,
    "It does not create a second monetary source of truth.",
  );
  expectIncludes(
    record,
    "FelLineItem.amount\n=\nsum(\n  FelCommercialSourceAllocation.amountSnapshot",
  );
  expectIncludes(
    record,
    "FelDocument commercial total\n=\nsum(FelLineItem.amount)",
  );
  expectIncludes(record, "FelCommercialSourceAllocation");
  expectIncludes(record, "reservationId UNIQUE when non-null");
  expectIncludes(record, "guestPaymentRequestItemId UNIQUE when non-null");
  expectIncludes(record, "reservationId XOR guestPaymentRequestItemId");
  expectIncludes(record, "exactly one canonical commercial source");
  expectIncludes(record, "Grouped extras preserve multiple allocations.");
  expectIncludes(
    record,
    "Credit Note does NOT consume the original Reservation or GuestPaymentRequestItem again.",
  );
  expectIncludes(
    record,
    "Credit Note must NOT delete/release the original FelCommercialSourceAllocation.",
  );
  expectIncludes(record, "Indexes do not prevent duplicate consumption.");
  expectIncludes(
    record,
    "Unique constraints / allocation ownership prevent duplicate fiscal consumption.",
  );
  expectIncludes(
    record,
    "grouping presentation derives from allocations\nnot from provenance arithmetic",
  );
  expectIncludes(
    record,
    "release eligible provisional allocations\nre-read current eligible commercial sources\ncreate fresh allocation snapshots\nrebuild fiscal lines from allocations\nrebuild provenance/evidence",
  );
  expectIncludes(
    record,
    "FelCommercialSourceAllocation.amountSnapshot\nFelCommercialSourceAllocation.currencySnapshot\nFelLineItem.amount\nFelDocument totals",
  );
  expectIncludes(record, "no arithmetic over FelLineSource");
  expectIncludes(
    record,
    "sum allocations per line == line.amount\n  sum lines == document total",
  );
  assert.doesNotMatch(
    record,
    /\bsourceAmount\b|\bsourceCurrency\b|sum\(AMOUNT_SOURCE\.sourceAmount\)/,
    "FelLineSource must not retain authoritative amount/currency fields",
  );
});

test("I.5 historical record leaves Prisma, migrations, UI, cron and scheduler work to I.6+", () => {
  const record = readRecord();
  const schema = read("prisma/schema.prisma");

  expectIncludes(
    record,
    "It does not modify `prisma/schema.prisma`, does not create migrations, does not create Admin FEL UI, does not call INFILE, does not add environment variables, and does not add a FEL cron.",
  );
  expectIncludes(
    record,
    "Final-I.6 can proceed with provider-independent persistence/UI",
  );

  assert.doesNotMatch(schema, /\bPROCESS_FEL_DOCUMENTS\b/);
  assert.deepEqual(JSON.parse(read("vercel.json")), { crons: [] });

  const definitions = listCronJobDefinitions();

  assert.deepEqual(
    definitions.map((definition) => [
      definition.key,
      definition.slug,
      definition.schedule,
    ]),
    EXPECTED_CRON_JOBS,
  );
});

test("I.5 tracker state keeps I.6 next and Phase 13 blocked", () => {
  const record = readRecord();
  const finalIRoadmap = read(
    "docs/212-final-i-operational-polish-notification-ux-and-fel-invoicing-roadmap.md",
  );

  expectIncludes(
    record,
    "Status: Completed and accepted on 2026-09-30",
  );
  expectIncludes(record, "Accepted Final-I.5 head: fde3ae06427af1f8905e6f7589263c199f918553");
  expectIncludes(
    record,
    "Final-I.6 status: Implementation completed; Hosted owner validation + acceptance pending",
  );
  expectIncludes(
    record,
    "Final-I.6 implementation record: docs/214-final-i-6-fel-persistence-admin-draft-module.md",
  );
  expectIncludes(record, "Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials");
  expectIncludes(record, "Phase 13 status: Blocked / Not started until Final-I closes");

  assert.ok(
    finalIRoadmap.includes(
      "Final-I.5 status: Completed and accepted on 2026-09-30",
    ),
    "docs/212 must expose I.5 as completed and accepted",
  );
  assert.ok(
    finalIRoadmap.includes(
      "Accepted Final-I.5 head: fde3ae06427af1f8905e6f7589263c199f918553",
    ),
    "docs/212 must expose the accepted I.5 feature head",
  );
  assert.ok(
    finalIRoadmap.includes(
      "Final-I.6 status: Implementation completed; Hosted owner validation in progress",
    ),
    "docs/212 must expose I.6 implementation as completed pending owner acceptance",
  );
  assert.ok(
    finalIRoadmap.includes("Phase 13 status: Blocked / Not started until Final-I closes"),
    "docs/212 must keep Phase 13 blocked",
  );
});
