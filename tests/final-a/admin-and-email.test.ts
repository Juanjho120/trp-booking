import assert from "node:assert/strict";

import {
  buildAdminRefundProcessedEmail,
  buildRefundProcessedEmail,
  buildReservationDatesUpdatedEmail,
} from "../../emails/lifecycle-email-templates";
import { buildReservationDatesUpdatedEmailView } from "../../emails/lifecycle-template-data";
import { groupAdminRefundsByOperation } from "../../features/admin/refund-operation-groups";
import { enMessages, esMessages } from "../../messages";
import type {
  RefundProcessedEmailTemplateInput,
  ReservationDatesUpdatedEmailTemplateInput,
} from "../../types/lifecycle-email-template";
import { adminRefund } from "./fixtures";
import { test } from "./harness";

function refundEmailInput(
  locale: "es" | "en",
  operation: RefundProcessedEmailTemplateInput["refund"]["operation"],
): RefundProcessedEmailTemplateInput {
  return {
    locale,
    publicBaseUrl: "https://trp-booking.juantzun.dev",
    brandLogoUrl:
      "https://res.cloudinary.com/demo/image/upload/v1/trp-booking/logo.png",
    reservation: {
      id: "reservation-final-a-email",
      guestName: "Ana Pérez",
      guestEmail: "ana@example.com",
      preferredLocale: locale,
      propertyNameEs: "Apartamento Blanco y Negro",
      propertyNameEn: "Black and White Apartment",
      currency: "USD",
    },
    refund: {
      amount: "130.00",
      approvedAt: "2026-08-12T12:30:00.000Z",
      authorizationType: "EXTRAORDINARY",
      processingMode: "TILOPAY_API",
      paymentStatus: "PARTIALLY_REFUNDED",
      providerRefundId: "provider-refund-130",
      reason: "Final-A integrated refund",
      operation,
    },
    admin: {
      requestedByAdminName: "TRP Admin",
      reconciledByAdminName: "TRP Admin",
    },
  };
}

function negativeDateChangeEmailInput(
  locale: "es" | "en",
): ReservationDatesUpdatedEmailTemplateInput {
  return {
    locale,
    publicBaseUrl: "https://trp-booking.juantzun.dev",
    brandLogoUrl:
      "https://res.cloudinary.com/demo/image/upload/v1/trp-booking/logo.png",
    reservation: {
      id: "reservation-negative-email",
      guestName: "Ana Pérez",
      guestEmail: "ana@example.com",
      preferredLocale: locale,
      propertyNameEs: "Apartamento Blanco y Negro",
      propertyNameEn: "Black and White Apartment",
      currency: "USD",
    },
    dateChange: {
      originalCheckInDate: "2026-09-10",
      originalCheckOutDate: "2026-09-15",
      requestedCheckInDate: "2026-09-11",
      requestedCheckOutDate: "2026-09-13",
      originalTotal: "195.00",
      requestedTotal: "50.00",
      financialDifference: "-145.00",
      completedAt: "2026-08-12T12:30:00.000Z",
      adjustmentPaymentStatus: null,
      refundStatus: "PENDING",
      refundAmount: "145.00",
    },
  };
}

function collectMessageShape(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectMessageShape(entry, `${prefix}[${index}]`),
    );
  }

  if (value === null || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    collectMessageShape(entry, prefix ? `${prefix}.${key}` : key),
  );
}

test("A.5 admin groups split refund children into one logical operation", () => {
  const operationKey = "extraordinary/reservation-final-a/request-145";
  const groups = groupAdminRefundsByOperation([
    adminRefund({
      id: "refund-initial",
      paymentId: "payment-initial",
      amount: "130.00",
      operationKey,
    }),
    adminRefund({
      id: "refund-adjustment",
      paymentId: "payment-adjustment",
      amount: "15.00",
      operationKey,
    }),
    adminRefund({
      id: "legacy-refund",
      paymentId: "legacy-payment",
      amount: "10.00",
      operationKey: null,
    }),
  ]);

  assert.equal(groups.length, 2);
  const split = groups.find((group) => group.refundOperationKey === operationKey);
  assert.ok(split);
  assert.equal(split.requestedAmount, "145.00");
  assert.equal(split.refunds.length, 2);
  assert.deepEqual(
    split.refunds.map((refund) => refund.paymentId),
    ["payment-initial", "payment-adjustment"],
  );

  const legacy = groups.find((group) => group.refundOperationKey === null);
  assert.ok(legacy);
  assert.equal(legacy.id, "legacy/legacy-refund");
  assert.equal(legacy.requestedAmount, "10.00");
  assert.equal(legacy.refunds.length, 1);
});

test("A.5 guest split-refund email confirms one movement without exposing internal operation key", async () => {
  const operationKey = "extraordinary/reservation-final-a-email/request-145";
  const input = refundEmailInput("es", {
    key: operationKey,
    movementCount: 2,
    approvedMovementCount: 1,
    requestedAmount: "145.00",
  });
  const email = await buildRefundProcessedEmail(input);

  assert.ok(email.text.includes("130.00"));
  assert.ok(email.text.includes("145.00"));
  assert.ok(email.text.includes("1 / 2"));
  assert.ok(
    email.text.includes(esMessages.admin.reservationsPage.refunds.notes.splitOperationEmail),
  );
  assert.ok(
    email.text.includes(
      esMessages.admin.reservationsPage.refunds.success.reconciledMovementApproved,
    ),
  );
  assert.equal(email.text.includes(operationKey), false);
});

test("A.5 admin split-refund email includes safe operation correlation and movement progress", async () => {
  const operationKey = "extraordinary/reservation-final-a-email/request-145";
  const input = refundEmailInput("es", {
    key: operationKey,
    movementCount: 2,
    approvedMovementCount: 2,
    requestedAmount: "145.00",
  });
  const email = await buildAdminRefundProcessedEmail(input);

  assert.ok(email.text.includes(operationKey));
  assert.ok(email.text.includes("145.00"));
  assert.ok(email.text.includes("2 / 2"));
});

test("A.5 English split-refund guest copy remains aligned and hides internal key", async () => {
  const operationKey = "standard/cancellation-final-a/request-195";
  const input = refundEmailInput("en", {
    key: operationKey,
    movementCount: 2,
    approvedMovementCount: 1,
    requestedAmount: "195.00",
  });
  const email = await buildRefundProcessedEmail(input);

  assert.ok(
    email.text.includes(enMessages.admin.reservationsPage.refunds.notes.splitOperationEmail),
  );
  assert.ok(
    email.text.includes(
      enMessages.admin.reservationsPage.refunds.success.reconciledMovementApproved,
    ),
  );
  assert.ok(email.text.includes("1 / 2"));
  assert.equal(email.text.includes(operationKey), false);
});

test("A.5 single-child refund email preserves normal completed-refund copy", async () => {
  const email = await buildRefundProcessedEmail(refundEmailInput("es", null));

  assert.ok(
    email.text.includes(
      esMessages.admin.reservationsPage.refunds.success.reconciledApproved,
    ),
  );
  assert.equal(
    email.text.includes(esMessages.admin.reservationsPage.refunds.notes.splitOperationEmail),
    false,
  );
});

test("A.5 negative DATE_CHANGE completion email represents the complete logical USD 145 refund", async () => {
  const input = negativeDateChangeEmailInput("es");
  const view = buildReservationDatesUpdatedEmailView(input);
  const email = await buildReservationDatesUpdatedEmail(input);

  assert.equal(view.financialBranch, "NEGATIVE");
  assert.ok(view.refundAmount?.includes("145.00"));
  assert.ok(email.text.includes("145.00"));
  assert.equal(email.text.includes("130.00"), false);
});

test("A.5 ES and EN message trees remain structurally aligned", () => {
  const esShape = collectMessageShape(esMessages).sort();
  const enShape = collectMessageShape(enMessages).sort();

  assert.deepEqual(enShape, esShape);
  assert.ok(esShape.length > 1_000);
});

test("A.5 new refund-operation copy exists in both locales", () => {
  const esRefunds = esMessages.admin.reservationsPage.refunds;
  const enRefunds = enMessages.admin.reservationsPage.refunds;

  assert.ok(esRefunds.labels.refundOperation.trim());
  assert.ok(enRefunds.labels.refundOperation.trim());
  assert.ok(esRefunds.labels.operationAmount.trim());
  assert.ok(enRefunds.labels.operationAmount.trim());
  assert.ok(esRefunds.labels.approvedMovements.trim());
  assert.ok(enRefunds.labels.approvedMovements.trim());
  assert.ok(esRefunds.notes.splitOperationEmail.trim());
  assert.ok(enRefunds.notes.splitOperationEmail.trim());
});
