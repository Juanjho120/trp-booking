import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("D.4 keeps GuestPaymentRequest raw tokens hash-only in storage and out of normal guest DTOs", () => {
  const tokenService = source("lib/payments/guest-payment-request-token.ts");
  const paymentService = source(
    "lib/payments/guest-payment-request-payment.ts",
  );
  const guestPage = source(
    "features/payments/components/additional-charge-payment-page.tsx",
  );

  assert.match(tokenService, /hashGuestPaymentRequestAccessToken/);
  assert.match(paymentService, /where:\s*\{\s*accessTokenHash:\s*token\.tokenHash/);
  assert.match(paymentService, /decryptGuestPaymentRequestAccessToken/);
  assert.match(guestPage, /window\.location\.pathname/);

  for (const forbiddenGuestDtoField of [
    "requestId:",
    "reservationId:",
    "additionalChargeId:",
    "guestName:",
  ]) {
    assert.equal(
      /GuestPaymentRequestPaymentSummary[\s\S]*?}>\;/.test(paymentService) &&
        new RegExp(forbiddenGuestDtoField).test(
          paymentService.match(
            /export type GuestPaymentRequestPaymentSummary[\s\S]*?}>\;/,
          )?.[0] ?? "",
        ),
      false,
      forbiddenGuestDtoField,
    );
  }
});

test("D.4 Tilopay session and preflight classify the private token without returning it in session DTOs or returnData", () => {
  const session = source("lib/payments/tilopay-sdk-session.ts");
  const preflight = source("lib/payments/tilopay-payment-preflight.ts");
  const checkout = source(
    "features/payments/components/tilopay-sdk-checkout.tsx",
  );

  assert.match(session, /isGuestPaymentRequestAccessToken/);
  assert.match(session, /prepareGuestPaymentRequestPayment/);
  assert.match(session, /ADDITIONAL_CHARGE_CHECKOUT_READY/);
  const additionalSessionBlock =
    session.match(
      /async function createGuestPaymentRequestTilopaySdkSession[\s\S]*?phaseBoundary: "ADDITIONAL_CHARGE_CHECKOUT_READY"/,
    )?.[0] ?? "";
  assert.match(additionalSessionBlock, /reservationId:\s*"guest-payment-request"/);
  assert.equal(additionalSessionBlock.includes("reservationId: prepared.token"), false);

  assert.match(preflight, /isGuestPaymentRequestAccessToken/);
  assert.match(preflight, /ADDITIONAL_CHARGE_PREFLIGHT_READY/);
  const additionalPreflightBlock =
    preflight.match(
      /async function validateGuestPaymentRequestPreflight[\s\S]*?phaseBoundary: "ADDITIONAL_CHARGE_PREFLIGHT_READY"/,
    )?.[0] ?? "";
  assert.match(additionalPreflightBlock, /reservationId:\s*"guest-payment-request"/);
  assert.equal(additionalPreflightBlock.includes("reservationId: prepared.token"), false);

  assert.match(checkout, /reservationId,\s*paymentId:\s*activeSession\.paymentId/);
  assert.equal(checkout.includes("reservationId: activeSession.reservationId"), false);
});

test("D.4 payment submission attempts allow and validate the ADDITIONAL_CHARGE source", () => {
  const typeFile = source("types/payment-submission-attempt.ts");
  const attempts = source("lib/payments/payment-submission-attempts.ts");

  assert.match(typeFile, /PaymentSubmissionAttemptSource\s*;/);
  assert.match(attempts, /PaymentPurpose\.ADDITIONAL_CHARGE/);
  assert.match(attempts, /PaymentSubmissionSource\.ADDITIONAL_CHARGE/);
  assert.match(attempts, /hashGuestPaymentRequestAccessToken/);
  assert.match(attempts, /GuestPaymentRequestStatus\.PENDING/);
});

test("D.4 approved ancillary collection marks request and charges paid without reservation confirmation or stay-value mutation", () => {
  const paymentService = source(
    "lib/payments/guest-payment-request-payment.ts",
  );
  const result = source("lib/payments/tilopay-payment-result.ts");

  assert.match(paymentService, /PaymentPurpose\.ADDITIONAL_CHARGE/);
  assert.match(paymentService, /GuestPaymentRequestStatus\.PAID/);
  assert.match(paymentService, /AdditionalChargeStatus\.PAID/);
  assert.match(paymentService, /reservationTotalMutated:\s*false/);
  assert.match(paymentService, /reservationPricingSnapshotMutated:\s*false/);
  assert.match(paymentService, /reservationConfirmationAttempted:\s*false/);
  assert.equal(paymentService.includes("ReservationStatus.PENDING_PAYMENT"), false);
  assert.equal(paymentService.includes("confirmReservationAfterApprovedPayment"), false);

  assert.match(result, /payment\.purpose === PaymentPurpose\.ADDITIONAL_CHARGE/);
  assert.match(result, /markGuestPaymentRequestPaidFromApprovedPayment/);
  assert.match(result, /ADDITIONAL_CHARGE_PAYMENT_REQUEST_PAID/);
});

test("D.4 rejected ancillary collection keeps the request pending and routes back to the private page", () => {
  const result = source("lib/payments/tilopay-payment-result.ts");
  const redirect = source("app/api/payments/tilopay/redirect/route.ts");

  assert.match(result, /PaymentStatus\.REJECTED/);
  assert.match(result, /ADDITIONAL_CHARGE_PAYMENT_REQUEST_PENDING/);
  assert.match(redirect, /getGuestPaymentRequestPaymentPathForPayment/);
  assert.match(redirect, /isGuestPaymentRequestTarget/);
  assert.match(redirect, /isPrivatePaymentTarget/);
  assert.match(redirect, /!privateTarget[\s\S]*reservationId/);
  assert.match(redirect, /if \(!privateTarget\) \{\s*url\.searchParams\.set\("reservationConfirmed",/);
});

test("D.4 admin copy action is protected and never stores the private URL in component state", () => {
  const route = source(
    "app/api/admin/guest-payment-requests/[requestId]/payment-link/route.ts",
  );
  const component = source(
    "features/admin/components/admin-additional-charges-section.tsx",
  );
  const paymentService = source(
    "lib/payments/guest-payment-request-payment.ts",
  );

  assert.match(route, /getAdminSessionActor/);
  assert.match(route, /isValidAdminMutationOrigin/);
  assert.match(route, /cache-control":\s*"private, no-store, max-age=0"/);
  assert.match(paymentService, /GUEST_PAYMENT_REQUEST_LINK_COPIED/);
  assert.match(paymentService, /hashGuestPaymentRequestAccessToken\(rawToken\)/);
  assert.match(component, /navigator\.clipboard\.writeText\(payload\.paymentUrl\)/);
  assert.equal(component.includes("setPaymentUrl"), false);
  assert.equal(component.includes("paymentUrl,"), false);
});

test("D.4 public page uses centralized copy and stays within the private charge payment scope", () => {
  const page = source(
    "features/payments/components/additional-charge-payment-page.tsx",
  );
  const messagesEs = source("messages/es.ts");
  const messagesEn = source("messages/en.ts");

  assert.match(page, /messages\.payments\.additionalCharge/);
  assert.match(page, /TilopaySdkCheckout/);
  assert.match(page, /const paid = summary\?\.requestStatus === "PAID"/);
  assert.match(page, /approvedButNotApplied/);
  assert.equal(/const paid =[\s\S]*PaymentStatus/.test(page), false);
  assert.match(messagesEs, /additionalCharge:\s*\{/);
  assert.match(messagesEn, /additionalCharge:\s*\{/);
  assert.match(page, /ADDITIONAL_CHARGE_PAYMENT_APPLICATION_FAILED/);
  assert.equal(page.includes("refund"), false);
  assert.equal(page.includes("RESERVATION_CONFIRMED"), false);
});

test("D.4 public page formats visible request timestamps in a fixed property time zone", () => {
  const page = source(
    "features/payments/components/additional-charge-payment-page.tsx",
  );

  assert.match(page, /TRP_PAYMENT_TIME_ZONE\s*=\s*"America\/Guatemala"/);
  assert.match(
    page,
    /function AdditionalChargePaymentPage[\s\S]*formatDateTime[\s\S]*timeZone:\s*TRP_PAYMENT_TIME_ZONE/,
  );
  assert.equal(page.includes("suppressHydrationWarning"), false);
});

test("D.4 admin detail places additional charges in their own tab between lifecycle and refunds", () => {
  const detailPage = source(
    "features/admin/components/admin-reservation-detail-page.tsx",
  );
  const attemptHistory = source(
    "features/admin/components/admin-payment-submission-attempt-history.tsx",
  );
  const lifecycleTabIndex = detailPage.indexOf('value="lifecycle"');
  const additionalChargesTabIndex = detailPage.indexOf(
    'value="additionalCharges"',
  );
  const refundsTabIndex = detailPage.indexOf('value="refunds"');

  assert.match(detailPage, /import \{ AdminAdditionalChargesSection \}/);
  assert.match(detailPage, /ReceiptText/);
  assert.ok(lifecycleTabIndex >= 0);
  assert.ok(additionalChargesTabIndex > lifecycleTabIndex);
  assert.ok(refundsTabIndex > additionalChargesTabIndex);
  assert.match(
    detailPage,
    /AdminAdditionalChargesSection reservationId=\{reservation\.id\}/,
  );
  assert.equal(
    attemptHistory.includes("AdminAdditionalChargesSection"),
    false,
  );
  assert.equal(attemptHistory.includes("useParams"), false);
});
