import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  FelDocumentStatus,
  FelLineKind,
  FelLineSourceRole,
  FelLineSourceType,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PropertyStatus,
  ReservationLifecycleRequestChannel,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

import {
  AdminFelError,
  createAdminFelDraft,
  discardAdminFelDraft,
  previewAdminFelDraft,
  rebuildAdminFelDraft,
} from "@/lib/admin/fel";
import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { test } from "./harness";

type FixtureContext = Readonly<{
  prefix: string;
  adminId: string;
  actor: AdminActor;
  propertyIds: string[];
  reservationIds: string[];
  paymentIds: string[];
  additionalChargeIds: string[];
  guestPaymentRequestIds: string[];
  guestPaymentRequestItemIds: string[];
  felDocumentIds: string[];
}>;

type ReservationFixture = Readonly<{
  id: string;
  propertyId: string;
}>;

type ExtraFixture = Readonly<{
  chargeId: string;
  guestPaymentRequestId: string;
  guestPaymentRequestItemId: string;
  paymentId: string;
}>;

const receiver = {
  receiverName: "Consumidor Final I6 DB",
  receiverIdentifierType: "CONSUMIDOR_FINAL" as const,
  receiverIdentifier: null,
  receiverAddress: null,
  receiverEmail: null,
  receiverCountry: "Guatemala",
};

function assertTestEnvironment(): void {
  assert.equal(
    process.env.TRP_ENVIRONMENT,
    "test",
    "final-i:db:validate must run only with TRP_ENVIRONMENT=test.",
  );

  const databaseUrl = process.env.DATABASE_URL ?? "";

  assert.ok(databaseUrl, "DATABASE_URL must be configured for DB validation.");
  assert.doesNotMatch(
    databaseUrl,
    /production|prod|turefugioperfecto/i,
    "Refusing to run Final-I DB validation against a production-looking database URL.",
  );
}

function createPrefix(name: string): string {
  return `i6db-${name}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function makeId(context: FixtureContext, suffix: string): string {
  return `${context.prefix}-${suffix}`;
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function decimalText(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

async function createContext(name: string): Promise<FixtureContext> {
  const prefix = createPrefix(name);
  const adminId = `${prefix}-admin`;
  const actor = {
    email: `${prefix}@final-i-db.test`,
    name: "Final I6 DB",
  };
  const context: FixtureContext = {
    prefix,
    adminId,
    actor,
    propertyIds: [],
    reservationIds: [],
    paymentIds: [],
    additionalChargeIds: [],
    guestPaymentRequestIds: [],
    guestPaymentRequestItemIds: [],
    felDocumentIds: [],
  };

  await prisma.user.create({
    data: {
      id: adminId,
      email: actor.email,
      name: actor.name,
      role: UserRole.ADMIN,
    },
  });

  return context;
}

async function cleanup(context: FixtureContext): Promise<void> {
  await prisma.adminAuditLog.deleteMany({
    where: {
      OR: [
        { userId: context.adminId },
        { entityId: { in: context.felDocumentIds } },
      ],
    },
  });
  await prisma.felCreditAllocation.deleteMany({
    where: {
      OR: [
        { creditDocumentId: { in: context.felDocumentIds } },
        { originalDocumentId: { in: context.felDocumentIds } },
      ],
    },
  });
  await prisma.felProviderAttempt.deleteMany({
    where: { felDocumentId: { in: context.felDocumentIds } },
  });
  await prisma.felLineSource.deleteMany({
    where: {
      felLineItem: {
        felDocumentId: { in: context.felDocumentIds },
      },
    },
  });
  await prisma.felCommercialSourceAllocation.deleteMany({
    where: { felDocumentId: { in: context.felDocumentIds } },
  });
  await prisma.felLineItem.deleteMany({
    where: { felDocumentId: { in: context.felDocumentIds } },
  });
  await prisma.felDocumentReservation.deleteMany({
    where: { felDocumentId: { in: context.felDocumentIds } },
  });
  await prisma.felDocument.deleteMany({
    where: { id: { in: context.felDocumentIds } },
  });
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { id: { in: context.paymentIds } },
        { reservationId: { in: context.reservationIds } },
        { guestPaymentRequestId: { in: context.guestPaymentRequestIds } },
      ],
    },
  });
  await prisma.guestPaymentRequestItem.deleteMany({
    where: {
      OR: [
        { id: { in: context.guestPaymentRequestItemIds } },
        { paymentRequestId: { in: context.guestPaymentRequestIds } },
      ],
    },
  });
  await prisma.guestPaymentRequest.deleteMany({
    where: { id: { in: context.guestPaymentRequestIds } },
  });
  await prisma.additionalChargeRefundAllocation.deleteMany({
    where: { additionalChargeId: { in: context.additionalChargeIds } },
  });
  await prisma.additionalCharge.deleteMany({
    where: { id: { in: context.additionalChargeIds } },
  });
  await prisma.reservationLifecycleRequest.deleteMany({
    where: { reservationId: { in: context.reservationIds } },
  });
  await prisma.reservationGuest.deleteMany({
    where: { reservationId: { in: context.reservationIds } },
  });
  await prisma.reservation.deleteMany({
    where: { id: { in: context.reservationIds } },
  });
  await prisma.property.deleteMany({
    where: { id: { in: context.propertyIds } },
  });
  await prisma.user.deleteMany({
    where: { id: context.adminId },
  });

  const remainingCounts = await Promise.all([
    prisma.felDocument.count({ where: { id: { in: context.felDocumentIds } } }),
    prisma.felCommercialSourceAllocation.count({
      where: { felDocumentId: { in: context.felDocumentIds } },
    }),
    prisma.guestPaymentRequestItem.count({
      where: { id: { in: context.guestPaymentRequestItemIds } },
    }),
    prisma.guestPaymentRequest.count({
      where: { id: { in: context.guestPaymentRequestIds } },
    }),
    prisma.additionalCharge.count({
      where: { id: { in: context.additionalChargeIds } },
    }),
    prisma.payment.count({ where: { id: { in: context.paymentIds } } }),
    prisma.reservation.count({ where: { id: { in: context.reservationIds } } }),
    prisma.property.count({ where: { id: { in: context.propertyIds } } }),
    prisma.user.count({ where: { id: context.adminId } }),
    prisma.adminAuditLog.count({
      where: { entityId: { in: context.felDocumentIds } },
    }),
  ]);

  assert.equal(
    remainingCounts.reduce((total, count) => total + count, 0),
    0,
    "Final-I DB fixture cleanup must leave no tracked rows behind.",
  );
}

async function withFixture(
  name: string,
  run: (context: FixtureContext) => Promise<void>,
): Promise<void> {
  assertTestEnvironment();
  const context = await createContext(name);

  try {
    await run(context);
  } finally {
    await cleanup(context);
  }
}

async function createProperty(
  context: FixtureContext,
  suffix: string,
): Promise<string> {
  const id = makeId(context, `property-${suffix}`);
  context.propertyIds.push(id);

  await prisma.property.create({
    data: {
      id,
      nameEs: `Propiedad ${suffix}`,
      nameEn: `Property ${suffix}`,
      slug: `${context.prefix}-property-${suffix}`,
      shortDescriptionEs: "Fixture FEL",
      shortDescriptionEn: "FEL fixture",
      longDescriptionEs: "Fixture FEL de validacion",
      longDescriptionEn: "FEL validation fixture",
      maxGuests: 4,
      bedrooms: 1,
      bathrooms: 1,
      baseNightlyPrice: new Prisma.Decimal("350.00"),
      currency: "USD",
      status: PropertyStatus.ACTIVE,
      checkInTime: "15:00",
      checkOutTime: "11:00",
    },
  });

  return id;
}

async function createReservation(
  context: FixtureContext,
  suffix: string,
  input: Readonly<{
    total?: string;
    subtotal?: string;
    payments?: readonly Readonly<{
      suffix: string;
      purpose: PaymentPurpose;
      amount: string;
    }>[];
  }> = {},
): Promise<ReservationFixture> {
  const propertyId = await createProperty(context, suffix);
  const reservationId = makeId(context, `reservation-${suffix}`);
  const total = input.total ?? "380.00";
  const subtotal = input.subtotal ?? "350.00";
  context.reservationIds.push(reservationId);

  await prisma.reservation.create({
    data: {
      id: reservationId,
      propertyId,
      guestName: `Huesped ${suffix}`,
      guestEmail: `${context.prefix}-${suffix}@guest.test`,
      guestPhone: "+50255550000",
      guestCountry: "GT",
      preferredLocale: "es",
      checkInDate: new Date("2026-08-15T00:00:00.000Z"),
      checkOutDate: new Date("2026-08-16T00:00:00.000Z"),
      guestCount: 2,
      status: ReservationStatus.CONFIRMED,
      subtotal: new Prisma.Decimal(subtotal),
      cleaningFee: new Prisma.Decimal("30.00"),
      taxes: new Prisma.Decimal("0.00"),
      discounts: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal(total),
      currency: "USD",
      pricingSnapshot: { fixture: context.prefix, suffix },
      confirmedAt: new Date("2026-08-01T12:00:00.000Z"),
    },
  });

  for (const payment of
    input.payments ?? [
      {
        suffix: "initial",
        purpose: PaymentPurpose.INITIAL_RESERVATION,
        amount: total,
      },
    ]) {
    const paymentId = makeId(context, `payment-${suffix}-${payment.suffix}`);
    const lifecycleRequestId =
      payment.purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT
        ? makeId(context, `lifecycle-${suffix}-${payment.suffix}`)
        : null;

    if (lifecycleRequestId) {
      const requestedTotal = new Prisma.Decimal(total);
      const originalTotal = requestedTotal.minus(payment.amount);
      const originalSubtotal = originalTotal.minus("30.00");

      await prisma.reservationLifecycleRequest.create({
        data: {
          id: lifecycleRequestId,
          reservationId,
          requestType: ReservationLifecycleRequestType.DATE_CHANGE,
          status: ReservationLifecycleRequestStatus.COMPLETED,
          channel: ReservationLifecycleRequestChannel.OTHER,
          requesterName: `Huesped ${suffix}`,
          requesterEmail: `${context.prefix}-${suffix}@guest.test`,
          requesterPhone: "+50255550000",
          requestNote: "Final-I.6 DB fixture",
          clientRequestId: makeId(
            context,
            `lifecycle-client-${suffix}-${payment.suffix}`,
          ),
          idempotencyKey: makeId(
            context,
            `lifecycle-idempotency-${suffix}-${payment.suffix}`,
          ),
          originalReservationStatus: ReservationStatus.CONFIRMED,
          originalCheckInDate: new Date("2026-08-14T00:00:00.000Z"),
          originalCheckOutDate: new Date("2026-08-15T00:00:00.000Z"),
          originalGuestName: `Huesped ${suffix}`,
          originalGuestEmail: `${context.prefix}-${suffix}@guest.test`,
          originalGuestPhone: "+50255550000",
          originalGuestCountry: "GT",
          originalPreferredLocale: "es",
          originalGuestCount: 2,
          originalSubtotal,
          originalCleaningFee: new Prisma.Decimal("30.00"),
          originalTaxes: new Prisma.Decimal("0.00"),
          originalDiscounts: new Prisma.Decimal("0.00"),
          originalTotal,
          originalPricingSnapshot: { fixture: context.prefix, suffix },
          currency: "USD",
          requestedCheckInDate: new Date("2026-08-15T00:00:00.000Z"),
          requestedCheckOutDate: new Date("2026-08-16T00:00:00.000Z"),
          requestedGuestCount: 2,
          requestedSubtotal: new Prisma.Decimal(subtotal),
          requestedCleaningFee: new Prisma.Decimal("30.00"),
          requestedTaxes: new Prisma.Decimal("0.00"),
          requestedDiscounts: new Prisma.Decimal("0.00"),
          requestedTotal,
          financialDifference: new Prisma.Decimal(payment.amount),
          createdByAdminId: context.adminId,
          reviewedByAdminId: context.adminId,
          decisionReasonCode: "FINAL_I6_DB_FIXTURE",
          requestedAt: new Date("2026-08-01T12:05:00.000Z"),
          reviewedAt: new Date("2026-08-01T12:10:00.000Z"),
          decidedAt: new Date("2026-08-01T12:10:00.000Z"),
          completedAt: new Date("2026-08-02T13:00:00.000Z"),
          expectedReservationUpdatedAt: new Date("2026-08-01T12:00:00.000Z"),
        },
      });
    }

    context.paymentIds.push(paymentId);
    await prisma.payment.create({
      data: {
        id: paymentId,
        reservationId,
        lifecycleRequestId,
        purpose: payment.purpose,
        status: PaymentStatus.APPROVED,
        amount: new Prisma.Decimal(payment.amount),
        currency: "USD",
        providerReference: makeId(context, `provider-${suffix}-${payment.suffix}`),
        paidAt: new Date("2026-08-01T12:30:00.000Z"),
      },
    });
  }

  return { id: reservationId, propertyId };
}

async function createPaidExtra(
  context: FixtureContext,
  reservation: ReservationFixture,
  suffix: string,
  amount: string,
  category: AdditionalChargeCategory,
): Promise<ExtraFixture> {
  const chargeId = makeId(context, `charge-${suffix}`);
  const requestId = makeId(context, `gpr-${suffix}`);
  const itemId = makeId(context, `gpri-${suffix}`);
  const paymentId = makeId(context, `payment-extra-${suffix}`);

  context.additionalChargeIds.push(chargeId);
  context.guestPaymentRequestIds.push(requestId);
  context.guestPaymentRequestItemIds.push(itemId);
  context.paymentIds.push(paymentId);

  await prisma.additionalCharge.create({
    data: {
      id: chargeId,
      reservationId: reservation.id,
      category,
      description: `Cargo ${suffix}`,
      amount: new Prisma.Decimal(amount),
      currency: "USD",
      status: AdditionalChargeStatus.PAID,
      createdByAdminId: context.adminId,
    },
  });
  await prisma.guestPaymentRequest.create({
    data: {
      id: requestId,
      reservationId: reservation.id,
      status: GuestPaymentRequestStatus.PAID,
      totalAmount: new Prisma.Decimal(amount),
      currency: "USD",
      accessTokenHash: hashToken(`${context.prefix}-${suffix}-token`),
      accessTokenEncrypted: `encrypted-${context.prefix}-${suffix}`,
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
      createdByAdminId: context.adminId,
      clientRequestId: makeId(context, `client-${suffix}`),
      paidAt: new Date("2026-08-16T18:00:00.000Z"),
    },
  });
  await prisma.guestPaymentRequestItem.create({
    data: {
      id: itemId,
      paymentRequestId: requestId,
      additionalChargeId: chargeId,
      categorySnapshot: category,
      descriptionSnapshot: `Cargo ${suffix}`,
      amountSnapshot: new Prisma.Decimal(amount),
      currencySnapshot: "USD",
    },
  });
  await prisma.payment.create({
    data: {
      id: paymentId,
      reservationId: reservation.id,
      guestPaymentRequestId: requestId,
      purpose: PaymentPurpose.ADDITIONAL_CHARGE,
      status: PaymentStatus.APPROVED,
      amount: new Prisma.Decimal(amount),
      currency: "USD",
      providerReference: makeId(context, `provider-extra-${suffix}`),
      paidAt: new Date("2026-08-16T18:01:00.000Z"),
    },
  });

  return {
    chargeId,
    guestPaymentRequestId: requestId,
    guestPaymentRequestItemId: itemId,
    paymentId,
  };
}

async function createDraft(
  context: FixtureContext,
  reservationIds: readonly string[],
  groupExtras = false,
) {
  const document = await createAdminFelDraft(
    {
      ...receiver,
      receiverName: `${receiver.receiverName} ${context.prefix}`,
      reservationIds,
      groupExtras,
    },
    context.actor,
  );
  context.felDocumentIds.push(document.id);

  return document;
}

async function readDocumentGraph(documentId: string) {
  return prisma.felDocument.findUnique({
    where: { id: documentId },
    include: {
      reservations: { orderBy: { reservationId: "asc" } },
      lineItems: {
        orderBy: { lineNumber: "asc" },
        include: {
          sources: {
            orderBy: [
              { sourceType: "asc" },
              { sourceId: "asc" },
              { sourceRole: "asc" },
            ],
          },
          commercialAllocations: {
            orderBy: [
              { reservationId: "asc" },
              { guestPaymentRequestItemId: "asc" },
            ],
          },
        },
      },
    },
  });
}

function normalizeDocumentGraph(graph: Awaited<ReturnType<typeof readDocumentGraph>>) {
  return JSON.parse(JSON.stringify(graph));
}

async function assertAdminFelError(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await operation;
  } catch (error) {
    assert.ok(error instanceof AdminFelError);
    assert.equal(error.code, code);
    return;
  }

  assert.fail(`Expected AdminFelError ${code}`);
}

test("I.6 DB creates lodging draft without adding payment evidence to fiscal total", async () => {
  await withFixture("settlement", async (context) => {
    const reservation = await createReservation(context, "settlement", {
      total: "380.00",
      subtotal: "350.00",
      payments: [
        {
          suffix: "initial",
          purpose: PaymentPurpose.INITIAL_RESERVATION,
          amount: "300.00",
        },
        {
          suffix: "lifecycle",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "80.00",
        },
      ],
    });
    const document = await createDraft(context, [reservation.id]);
    const graph = await readDocumentGraph(document.id);

    assert.ok(graph);
    assert.equal(decimalText(graph.total), "380.00");
    assert.equal(graph.reservations.length, 1);
    assert.equal(graph.lineItems.length, 1);
    assert.equal(graph.lineItems[0].kind, FelLineKind.LODGING);
    assert.equal(decimalText(graph.lineItems[0].amount), "380.00");
    assert.equal(graph.lineItems[0].commercialAllocations.length, 1);
    assert.equal(
      decimalText(graph.lineItems[0].commercialAllocations[0].amountSnapshot),
      "380.00",
    );
    assert.equal(
      graph.lineItems[0].commercialAllocations[0].reservationId,
      reservation.id,
    );
    assert.equal(
      graph.lineItems[0].sources.filter(
        (source) => source.sourceType === FelLineSourceType.PAYMENT,
      ).length,
      2,
    );
    assert.equal(
      graph.lineItems[0].sources.every(
        (source) =>
          source.sourceType !== FelLineSourceType.PAYMENT ||
          source.sourceRole === FelLineSourceRole.SETTLEMENT_EVIDENCE,
      ),
      true,
    );
  });
});

test("I.6 DB creates individual extra lines from paid GPRI snapshots", async () => {
  await withFixture("extras", async (context) => {
    const reservation = await createReservation(context, "extras");
    await createPaidExtra(
      context,
      reservation,
      "transport",
      "40.00",
      AdditionalChargeCategory.TRANSPORT,
    );
    await createPaidExtra(
      context,
      reservation,
      "damage",
      "25.00",
      AdditionalChargeCategory.DAMAGE,
    );

    const document = await createDraft(context, [reservation.id], false);
    const graph = await readDocumentGraph(document.id);

    assert.ok(graph);
    assert.equal(decimalText(graph.total), "445.00");
    assert.deepEqual(
      graph.lineItems.map((line) => [
        line.kind,
        decimalText(line.amount),
        line.commercialAllocations.length,
      ]),
      [
        [FelLineKind.LODGING, "380.00", 1],
        [FelLineKind.ADDITIONAL_CHARGE, "40.00", 1],
        [FelLineKind.ADDITIONAL_CHARGE, "25.00", 1],
      ],
    );
  });
});

test("I.6 DB creates grouped extra line while preserving two canonical allocations", async () => {
  await withFixture("grouped", async (context) => {
    const reservation = await createReservation(context, "grouped");
    await createPaidExtra(
      context,
      reservation,
      "transport",
      "40.00",
      AdditionalChargeCategory.TRANSPORT,
    );
    await createPaidExtra(
      context,
      reservation,
      "damage",
      "25.00",
      AdditionalChargeCategory.DAMAGE,
    );

    const document = await createDraft(context, [reservation.id], true);
    const graph = await readDocumentGraph(document.id);

    assert.ok(graph);
    assert.equal(decimalText(graph.total), "445.00");
    assert.deepEqual(
      graph.lineItems.map((line) => [
        line.kind,
        decimalText(line.amount),
        line.commercialAllocations.length,
      ]),
      [
        [FelLineKind.LODGING, "380.00", 1],
        [FelLineKind.GROUPED_ADDITIONAL_CHARGES, "65.00", 2],
      ],
    );
  });
});

test("I.6 DB rejects duplicate reservation claims with bounded FEL error", async () => {
  await withFixture("duplicate", async (context) => {
    const reservation = await createReservation(context, "duplicate");
    const document = await createDraft(context, [reservation.id]);

    await assertAdminFelError(
      createAdminFelDraft(
        {
          ...receiver,
          reservationIds: [reservation.id],
          groupExtras: false,
        },
        context.actor,
      ),
      "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
    );

    const allocations = await prisma.felCommercialSourceAllocation.findMany({
      where: { reservationId: reservation.id },
    });

    assert.equal(allocations.length, 1);
    assert.equal(allocations[0].felDocumentId, document.id);
  });
});

test("I.6 DB enforces XOR source constraint for commercial allocations", async () => {
  await withFixture("xor", async (context) => {
    const reservation = await createReservation(context, "valid");
    const unusedReservation = await createReservation(context, "unused");
    const unusedExtra = await createPaidExtra(
      context,
      unusedReservation,
      "unused-extra",
      "10.00",
      AdditionalChargeCategory.OTHER,
    );
    const document = await createDraft(context, [reservation.id]);
    const graph = await readDocumentGraph(document.id);

    assert.ok(graph);
    const lineId = graph.lineItems[0].id;

    await assert.rejects(() =>
      prisma.$executeRaw`
        INSERT INTO "fel_commercial_source_allocations"
          ("id", "fel_document_id", "fel_line_item_id", "amount_snapshot", "currency_snapshot", "created_at")
        VALUES
          (${makeId(context, "invalid-xor-null")}, ${document.id}, ${lineId}, ${"1.00"}, ${"USD"}, NOW())
      `,
    );
    await assert.rejects(() =>
      prisma.$executeRaw`
        INSERT INTO "fel_commercial_source_allocations"
          ("id", "fel_document_id", "fel_line_item_id", "reservation_id", "guest_payment_request_item_id", "amount_snapshot", "currency_snapshot", "created_at")
        VALUES
          (${makeId(context, "invalid-xor-both")}, ${document.id}, ${lineId}, ${unusedReservation.id}, ${unusedExtra.guestPaymentRequestItemId}, ${"1.00"}, ${"USD"}, NOW())
      `,
    );
  });
});

test("I.6 DB failed rebuild rolls back original draft graph", async () => {
  await withFixture("rollback", async (context) => {
    const reservationA = await createReservation(context, "rollback-a");
    const reservationB = await createReservation(context, "rollback-b");
    const documentA = await createDraft(context, [reservationA.id]);
    const documentB = await createDraft(context, [reservationB.id]);
    const before = normalizeDocumentGraph(await readDocumentGraph(documentA.id));

    await assertAdminFelError(
      rebuildAdminFelDraft(
        {
          documentId: documentA.id,
          reservationIds: [reservationA.id, reservationB.id],
          groupExtras: false,
        },
        context.actor,
      ),
      "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
    );

    const after = normalizeDocumentGraph(await readDocumentGraph(documentA.id));
    const partialBRows = await prisma.felCommercialSourceAllocation.count({
      where: {
        felDocumentId: documentA.id,
        reservationId: reservationB.id,
      },
    });
    const documentBAllocations = await prisma.felCommercialSourceAllocation.count({
      where: { felDocumentId: documentB.id },
    });

    assert.deepEqual(after, before);
    assert.equal(partialBRows, 0);
    assert.equal(documentBAllocations, 1);
  });
});

test("I.6 DB discard deletes draft graph and releases commercial source", async () => {
  await withFixture("discard", async (context) => {
    const reservation = await createReservation(context, "discard");
    const document = await createDraft(context, [reservation.id]);

    await discardAdminFelDraft({ documentId: document.id }, context.actor);

    assert.equal(
      await prisma.felDocument.findUnique({ where: { id: document.id } }),
      null,
    );
    assert.equal(
      await prisma.felCommercialSourceAllocation.count({
        where: { reservationId: reservation.id },
      }),
      0,
    );

    const replacement = await createDraft(context, [reservation.id]);

    assert.equal(replacement.total, "380.00");
  });
});

test("I.6 DB blocks rebuild and discard for non-DRAFT documents", async () => {
  await withFixture("readonly", async (context) => {
    const reservation = await createReservation(context, "readonly");
    const document = await createDraft(context, [reservation.id]);

    await prisma.felDocument.update({
      where: { id: document.id },
      data: { status: FelDocumentStatus.READY },
    });

    await assertAdminFelError(
      discardAdminFelDraft({ documentId: document.id }, context.actor),
      "ADMIN_FEL_DRAFT_NOT_EDITABLE",
    );
    await assertAdminFelError(
      rebuildAdminFelDraft(
        {
          documentId: document.id,
          reservationIds: [reservation.id],
          groupExtras: false,
        },
        context.actor,
      ),
      "ADMIN_FEL_DRAFT_NOT_EDITABLE",
    );
  });
});

test("I.6 DB preview allows same-draft ownership and rejects another draft", async () => {
  await withFixture("preview", async (context) => {
    const reservationA = await createReservation(context, "preview-a");
    const reservationB = await createReservation(context, "preview-b");
    const documentA = await createDraft(context, [reservationA.id]);
    const documentB = await createDraft(context, [reservationB.id]);

    const preview = await previewAdminFelDraft({
      ...receiver,
      reservationIds: [reservationA.id],
      groupExtras: false,
      editingDocumentId: documentA.id,
    });

    assert.equal(preview.total, "380.00");
    assert.deepEqual(preview.reservationIds, [reservationA.id]);

    await assertAdminFelError(
      previewAdminFelDraft({
        ...receiver,
        reservationIds: [reservationA.id],
        groupExtras: false,
        editingDocumentId: documentB.id,
      }),
      "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
    );
  });
});
