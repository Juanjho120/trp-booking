import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AdditionalChargeStatus,
  FelLineKind,
  PaymentPurpose,
  PaymentStatus,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationStatus,
} from "@prisma/client";

import {
  buildAdminFelDraftPreview,
  calculateFelCheckoutAt,
  evaluateAdminFelReservationEligibility,
  hasUnresolvedFelLifecycleMutation,
  type AdminFelDraftSourceReservation,
} from "@/lib/admin/fel";
import { listCronJobDefinitions } from "@/lib/cron/registry";
import type { AdminFelReceiverInput } from "@/types/admin-fel";

import { test } from "./harness";

const ROOT = process.cwd();
const MIGRATION_DIR = "20260930182358_final_i_6_fel_draft_persistence";
const I6_RECORD =
  "docs/214-final-i-6-fel-persistence-admin-draft-module.md";

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

const receiver: AdminFelReceiverInput = {
  receiverName: "Consumidor Final",
  receiverIdentifierType: "CONSUMIDOR_FINAL",
  receiverIdentifier: null,
  receiverAddress: null,
  receiverEmail: null,
  receiverCountry: "Guatemala",
};

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sourceReservation(
  overrides: Partial<AdminFelDraftSourceReservation> = {},
): AdminFelDraftSourceReservation {
  return {
    id: "reservation-a",
    guestName: "Ada Lovelace",
    propertyId: "property-a",
    propertyName: "Bungalow del Bosque",
    checkInDate: "2026-08-15",
    checkOutDate: "2026-08-16",
    checkoutAt: "2026-08-16T17:00:00.000Z",
    nights: 1,
    guestCount: 2,
    subtotal: "350.00",
    cleaningFee: "30.00",
    taxes: "0.00",
    discounts: "0.00",
    total: "380.00",
    currency: "USD",
    pricingSnapshot: null,
    updatedAt: "2026-08-16T18:00:00.000Z",
    settlementPayments: [
      {
        id: "payment-initial",
        purpose: PaymentPurpose.INITIAL_RESERVATION,
        status: PaymentStatus.APPROVED,
        amount: "300.00",
        currency: "USD",
        paidAt: "2026-08-01T12:00:00.000Z",
      },
      {
        id: "payment-lifecycle",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        status: PaymentStatus.APPROVED,
        amount: "80.00",
        currency: "USD",
        paidAt: "2026-08-02T12:00:00.000Z",
      },
    ],
    lifecycleEvidence: [
      {
        id: "lifecycle-completed",
        requestType: "STAY_EXTENSION",
        status: ReservationLifecycleRequestStatus.COMPLETED,
        financialDifference: "80.00",
        currency: "USD",
        completedAt: "2026-08-02T13:00:00.000Z",
      },
    ],
    extras: [
      {
        guestPaymentRequestItemId: "gpri-transport",
        additionalChargeId: "charge-transport",
        category: "TRANSPORTATION",
        description: "Transporte",
        amount: "40.00",
        currency: "USD",
        createdAt: "2026-08-16T18:10:00.000Z",
        settlementPayment: {
          id: "payment-extra-transport",
          purpose: PaymentPurpose.ADDITIONAL_CHARGE,
          status: PaymentStatus.APPROVED,
          amount: "40.00",
          currency: "USD",
          paidAt: "2026-08-16T18:11:00.000Z",
        },
      },
      {
        guestPaymentRequestItemId: "gpri-damage",
        additionalChargeId: "charge-damage",
        category: "DAMAGE",
        description: "Daño",
        amount: "25.00",
        currency: "USD",
        createdAt: "2026-08-16T18:20:00.000Z",
        settlementPayment: {
          id: "payment-extra-damage",
          purpose: PaymentPurpose.ADDITIONAL_CHARGE,
          status: PaymentStatus.APPROVED,
          amount: "25.00",
          currency: "USD",
          paidAt: "2026-08-16T18:21:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

function reservationEligibilityRecord(overrides: Record<string, unknown> = {}) {
  return {
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-08-01T12:00:00.000Z"),
    checkOutDate: new Date("2026-08-16T00:00:00.000Z"),
    currency: "USD",
    property: { checkOutTime: "11:00" },
    lifecycleRequests: [],
    felCommercialAllocations: [],
    payments: [],
    additionalCharges: [],
    ...overrides,
  };
}

function evaluateReservationEligibility(
  overrides: Record<string, unknown> = {},
  now = new Date("2026-08-16T17:01:00.000Z"),
) {
  return evaluateAdminFelReservationEligibility(
    reservationEligibilityRecord(overrides) as never,
    now,
  );
}

function ineligibleReason(overrides: Record<string, unknown> = {}): string {
  const result = evaluateReservationEligibility(overrides);

  assert.equal(result.eligible, false);

  return result.reason;
}

test("I.6 adds provider-independent FEL schema and exactly one migration with allocation constraints", () => {
  const schema = read("prisma/schema.prisma");
  const migrationPath = path.join(
    ROOT,
    "prisma",
    "migrations",
    MIGRATION_DIR,
    "migration.sql",
  );
  const migrations = readdirSync(path.join(ROOT, "prisma", "migrations"), {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory());

  for (const modelName of [
    "FelDocument",
    "FelDocumentReservation",
    "FelLineItem",
    "FelLineSource",
    "FelCommercialSourceAllocation",
    "FelProviderAttempt",
    "FelCreditAllocation",
  ]) {
    assert.match(schema, new RegExp(`\\bmodel\\s+${modelName}\\b`));
  }

  assert.equal(migrations.length, 30);
  assert.equal(existsSync(migrationPath), true);

  const migration = read(
    `prisma/migrations/${MIGRATION_DIR}/migration.sql`,
  );
  assert.match(
    migration,
    /fel_commercial_source_allocations_exactly_one_source_check/,
  );
  assert.match(
    migration,
    /\("reservation_id" IS NOT NULL\) <> \("guest_payment_request_item_id" IS NOT NULL\)/,
  );
  assert.match(schema, /@@unique\(\[felDocumentId, lineNumber\]/);
  assert.match(schema, /@@unique\(\[id, felDocumentId\]/);
  assert.match(
    schema,
    /fields: \[felLineItemId, felDocumentId\], references: \[id, felDocumentId\]/,
  );
  assert.doesNotMatch(schema, /\bsourceAmount\b|\bsourceCurrency\b/);
});

test("I.6 eligibility uses confirmed checkout time, lifecycle blockers, refund blockers and source allocation", () => {
  const now = new Date("2026-08-16T17:01:00.000Z");

  assert.deepEqual(evaluateReservationEligibility({}, now).eligible, true);
  assert.equal(
    calculateFelCheckoutAt(new Date("2026-08-16T00:00:00.000Z"), "11:00")?.toISOString(),
    "2026-08-16T17:00:00.000Z",
  );
  assert.equal(
    ineligibleReason({
      status: ReservationStatus.PENDING_PAYMENT,
    }),
    "ADMIN_FEL_RESERVATION_NOT_ELIGIBLE",
  );
  assert.equal(
    ineligibleReason({
      checkOutDate: new Date("2026-08-17T00:00:00.000Z"),
    }),
    "ADMIN_FEL_CHECKOUT_NOT_REACHED",
  );
  assert.equal(
    ineligibleReason({
      property: { checkOutTime: "bad time" },
    }),
    "ADMIN_FEL_INVALID_CHECKOUT_TIME",
  );
  assert.equal(
    ineligibleReason({
      lifecycleRequests: [
        { status: ReservationLifecycleRequestStatus.PENDING_REVIEW },
      ],
    }),
    "ADMIN_FEL_LIFECYCLE_UNRESOLVED",
  );
  assert.equal(
    ineligibleReason({
      payments: [
        {
          status: PaymentStatus.APPROVED,
          refunds: [{ status: RefundStatus.APPROVED }],
        },
      ],
    }),
    "ADMIN_FEL_FISCAL_RECONCILIATION_REQUIRED",
  );
  assert.equal(
    evaluateReservationEligibility({
      payments: [
        {
          status: PaymentStatus.APPROVED,
          refunds: [{ status: RefundStatus.FAILED }],
        },
      ],
    }).eligible,
    true,
  );
  assert.equal(
    ineligibleReason({
      additionalCharges: [
        {
          status: AdditionalChargeStatus.PARTIALLY_REFUNDED,
          refundAllocations: [],
          paymentRequestItems: [],
        },
      ],
    }),
    "ADMIN_FEL_FISCAL_RECONCILIATION_REQUIRED",
  );
  assert.equal(
    ineligibleReason({
      felCommercialAllocations: [{ id: "allocation-a" }],
    }),
    "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
  );
  assert.equal(
    evaluateAdminFelReservationEligibility(
      reservationEligibilityRecord({
        felCommercialAllocations: [
          { id: "allocation-a", felDocumentId: "fel-draft-a" },
        ],
      }) as never,
      now,
      { editingDocumentId: "fel-draft-a" },
    ).eligible,
    true,
  );
  assert.equal(
    ineligibleReason({
      felCommercialAllocations: [
        { id: "allocation-a", felDocumentId: "fel-draft-other" },
      ],
    }),
    "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
  );
});

test("I.6 lifecycle helper uses actual enum statuses and treats terminal states as historical", () => {
  assert.equal(
    hasUnresolvedFelLifecycleMutation([
      { status: ReservationLifecycleRequestStatus.PENDING_REVIEW },
    ]),
    true,
  );
  assert.equal(
    hasUnresolvedFelLifecycleMutation([
      { status: ReservationLifecycleRequestStatus.APPROVED },
    ]),
    true,
  );
  assert.equal(
    hasUnresolvedFelLifecycleMutation([
      { status: ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT },
    ]),
    true,
  );
  assert.equal(
    hasUnresolvedFelLifecycleMutation([
      { status: ReservationLifecycleRequestStatus.COMPLETED },
      { status: ReservationLifecycleRequestStatus.REJECTED },
      { status: ReservationLifecycleRequestStatus.WITHDRAWN },
      { status: ReservationLifecycleRequestStatus.EXPIRED },
      { status: ReservationLifecycleRequestStatus.FAILED },
    ]),
    false,
  );
});

test("I.6 draft preview keeps payment evidence out of fiscal arithmetic", () => {
  const preview = buildAdminFelDraftPreview({
    reservations: [sourceReservation({ extras: [] })],
    receiver,
    groupExtras: false,
  });

  assert.equal(preview.total, "380.00");
  assert.equal(preview.lines.length, 1);
  assert.equal(preview.lines[0].kind, FelLineKind.LODGING);
  assert.equal(preview.lines[0].amount, "380.00");
  assert.equal(
    preview.lines[0].sources.filter(
      (source) => source.sourceRole === "SETTLEMENT_EVIDENCE",
    ).length,
    2,
  );
});

test("I.6 supports individual and grouped extras from GPRI snapshots", () => {
  const individual = buildAdminFelDraftPreview({
    reservations: [sourceReservation()],
    receiver,
    groupExtras: false,
  });
  const grouped = buildAdminFelDraftPreview({
    reservations: [sourceReservation()],
    receiver,
    groupExtras: true,
  });

  assert.deepEqual(
    individual.lines.map((line) => [line.kind, line.amount]),
    [
      [FelLineKind.LODGING, "380.00"],
      [FelLineKind.ADDITIONAL_CHARGE, "40.00"],
      [FelLineKind.ADDITIONAL_CHARGE, "25.00"],
    ],
  );
  assert.equal(individual.total, "445.00");
  assert.deepEqual(
    grouped.lines.map((line) => [line.kind, line.amount, line.allocationCount]),
    [
      [FelLineKind.LODGING, "380.00", 1],
      [FelLineKind.GROUPED_ADDITIONAL_CHARGES, "65.00", 2],
    ],
  );
  assert.equal(grouped.total, "445.00");
});

test("I.6 supports multi-reservation drafts and rejects currency mismatch atomically", () => {
  const reservationB = sourceReservation({
    id: "reservation-b",
    checkInDate: "2026-08-17",
    checkOutDate: "2026-08-18",
    total: "220.00",
    subtotal: "220.00",
    extras: [],
  });
  const multi = buildAdminFelDraftPreview({
    reservations: [sourceReservation({ extras: [] }), reservationB],
    receiver,
    groupExtras: false,
  });

  assert.equal(multi.lines.length, 2);
  assert.equal(multi.total, "600.00");
  assert.throws(
    () =>
      buildAdminFelDraftPreview({
        reservations: [
          sourceReservation({ extras: [] }),
          sourceReservation({
            id: "reservation-gtq",
            currency: "GTQ",
            total: "100.00",
            subtotal: "100.00",
            extras: [],
          }),
        ],
        receiver,
        groupExtras: false,
      }),
    /ADMIN_FEL_CURRENCY_MISMATCH/,
  );
});

test("I.6 service and UI avoid sensitive token, raw payload, push and card persistence", () => {
  const service = read("lib/admin/fel.ts");
  const ui = read("features/admin/components/admin-fel-page.tsx");
  const routes = [
    "app/api/admin/fel/drafts/route.ts",
    "app/api/admin/fel/preview/route.ts",
    "app/api/admin/fel/drafts/[documentId]/route.ts",
    "app/api/admin/fel/drafts/[documentId]/rebuild/route.ts",
  ]
    .map(read)
    .join("\n");

  for (const source of [service, ui, routes]) {
    assert.doesNotMatch(
      source,
      /accessTokenHash|accessTokenEncrypted|rawPayload|p256dh|authKey|pushSubscription|cardBrand|cardLast|cardNumber|paymentMethod|cvv/i,
    );
  }
});

test("I.6 Admin surface exists with nav, localization parity and no provider actions", () => {
  const shell = read("features/admin/components/admin-shell.tsx");
  const page = read("app/admin/fel/page.tsx");
  const component = read("features/admin/components/admin-fel-page.tsx");
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  assert.match(shell, /href: "\/admin\/fel"/);
  assert.match(shell, /ReceiptText/);
  assert.match(page, /robots:\s*{\s*index: false,\s*follow: false,/s);
  assert.match(component, /selectedReservationIds/);
  assert.match(component, /groupExtras/);
  assert.match(component, /refreshPreviewForState/);
  assert.match(component, /saveDraft/);
  assert.match(component, /rebuildDraft/);
  assert.match(component, /discardDraft/);
  assert.match(es, /felPage:\s*{/);
  assert.match(en, /felPage:\s*{/);
  assert.doesNotMatch(
    component,
    /Certificar|Enviar a INFILE|Anular DTE|Emitir Nota de Crédito|Descargar XML|Descargar PDF|Certify|Send to INFILE|Cancel DTE|Credit Note|Download XML|Download PDF/,
  );
});

test("I.6 server-authoritative preview route backs draft editing", () => {
  const service = read("lib/admin/fel.ts");
  const component = read("features/admin/components/admin-fel-page.tsx");
  const route = read("app/api/admin/fel/preview/route.ts");

  assert.match(service, /export async function previewAdminFelDraft/);
  assert.match(service, /recordsToDraftSources\(\s*records,\s*new Date\(\),\s*editingDocumentId/s);
  assert.match(route, /previewAdminFelDraft/);
  assert.match(route, /adminApiSuccessResponse\(\{\s*preview\s*\}\)/);
  assert.match(component, /\/api\/admin\/fel\/preview/);
  assert.match(component, /previewIsFresh/);
  assert.match(component, /!previewIsFresh/);
  assert.match(component, /editingDocumentId\s*===\s*selectedDocument\.id/);
  assert.match(component, /setActiveTab\("new"\)/);
  assert.doesNotMatch(component, /centsFromMoney|moneyFromCents|previewLines/);
});

test("I.6 APIs use admin session, same-origin protection and bounded FEL error codes", () => {
  const routes = [
    "app/api/admin/fel/drafts/route.ts",
    "app/api/admin/fel/preview/route.ts",
    "app/api/admin/fel/drafts/[documentId]/route.ts",
    "app/api/admin/fel/drafts/[documentId]/rebuild/route.ts",
  ];

  for (const routePath of routes) {
    const source = read(routePath);

    assert.match(source, /getAdminSessionActor/);
    assert.match(source, /isValidAdminMutationOrigin/);
    assert.match(source, /adminApiErrorResponse/);
    assert.match(source, /AdminFelError/);
    assert.doesNotMatch(source, /PrismaClientKnownRequestError|error\.message/);
  }
});

test("I.6 preserves scheduler boundary and does not add FEL cron work", () => {
  assert.deepEqual(JSON.parse(read("vercel.json")), { crons: [] });
  assert.doesNotMatch(read("prisma/schema.prisma"), /\bPROCESS_FEL_DOCUMENTS\b/);
  assert.doesNotMatch(read("lib/cron/registry.ts"), /\bPROCESS_FEL_DOCUMENTS\b/);
  assert.deepEqual(
    listCronJobDefinitions().map((definition) => [
      definition.key,
      definition.slug,
      definition.schedule,
    ]),
    EXPECTED_CRON_JOBS,
  );
});

test("I.6 documentation records implementation pending owner acceptance", () => {
  const record = read(I6_RECORD);

  assert.match(
    record,
    /Final-I\.6 .*Implementation completed; Hosted owner validation \+ acceptance pending/,
  );
  assert.match(record, /PAYMENT != FISCAL LINE/);
  assert.match(record, /FelCommercialSourceAllocation\.amountSnapshot/);
  assert.match(record, /Final-I\.7 .*Blocked pending official INFILE technical documentation \+ Test credentials/);
  assert.match(record, /Phase 13 .*Blocked \/ Not started/);
});
