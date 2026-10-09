import assert from "node:assert/strict";

import {
  buildAdditionalChargeAdminPaymentRequiredEmail,
  buildAdditionalChargePaymentRequiredEmail,
  buildAdminDateChangePaymentLinkDeliveryStatusEmail,
  buildAdminStayExtensionPaymentLinkDeliveryStatusEmail,
  buildArrivalInstructionsEmail,
  buildDateChangePaymentRequiredEmail,
  buildReservationConfirmedEmail,
  buildReviewInvitationEmail,
  buildStayExtensionPaymentRequiredEmail,
} from "@/emails";
import type { TransactionalEmailLocale } from "@/types/email-provider";

import { test } from "./harness";

const PUBLIC_BASE_URL = "https://trp-booking.juantzun.dev";
const BRAND_LOGO_URL = "https://trp-booking.juantzun.dev/logo-email.png";
const MAP_URL =
  "https://maps.example.com/directions/final-i4-long-visible-map-token";
const REVIEW_TOKEN =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REVIEW_URL = `${PUBLIC_BASE_URL}/resenas/${REVIEW_TOKEN}`;
const PAYMENT_URL =
  "https://trp-booking.juantzun.dev/pagos/final-i4-payment-token";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function visibleTextFromHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function expectHtmlHrefOnly(
  content: {
    readonly html: string;
    readonly text: string;
  },
  url: string,
): void {
  assert.ok(
    content.html.includes(`href="${url}"`),
    `Expected HTML href to preserve ${url}`,
  );
  assert.ok(
    !visibleTextFromHtml(content.html).includes(url),
    `Expected visible HTML text to omit ${url}`,
  );
  assert.ok(
    content.text.includes(url),
    `Expected plaintext fallback to preserve ${url}`,
  );
}

function expectVisibleHtmlUrl(
  content: {
    readonly html: string;
    readonly text: string;
  },
  url: string,
): void {
  assert.ok(content.html.includes(`href="${url}"`));
  assert.ok(visibleTextFromHtml(content.html).includes(url));
  assert.ok(content.text.includes(url));
}

function reservation(locale: TransactionalEmailLocale) {
  return {
    id: `final-i4-${locale}`,
    reservationCode: locale === "es" ? "TR8K3Q7Z" : "TR9M4R8X",
    guestName: locale === "es" ? "Huesped Final I4" : "Final I4 Guest",
    guestEmail: `guest-final-i4-${locale}@example.com`,
    guestPhone: "+50255551234",
    guestCountry: "GT",
    preferredLocale: locale,
    propertyNameEs: "Bungalow Lago",
    propertyNameEn: "Lake Bungalow",
    houseRules: [],
    checkInDate: "2026-10-10" as const,
    checkOutDate: "2026-10-12" as const,
    checkOutTime: "11:00",
    guestCount: 2,
    arrivalTimeEstimate: "15:30",
    total: "180.00",
    currency: "USD",
    confirmedAt: "2026-09-29T16:00:00.000-06:00",
    appliedPricingSummary: null,
  };
}

function emailBase(locale: TransactionalEmailLocale) {
  return {
    locale,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    reservation: reservation(locale),
  };
}

function additionalChargeReservation(locale: TransactionalEmailLocale) {
  const current = reservation(locale);

  return {
    id: current.id,
    guestName: current.guestName,
    guestEmail: current.guestEmail,
    preferredLocale: current.preferredLocale,
    propertyNameEs: current.propertyNameEs,
    propertyNameEn: current.propertyNameEn,
    currency: current.currency,
  };
}

function additionalChargeBase(locale: TransactionalEmailLocale) {
  return {
    locale,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    reservation: additionalChargeReservation(locale),
  };
}

function lifecycleBase(locale: TransactionalEmailLocale) {
  return additionalChargeBase(locale);
}

test("I.4 guest arrival-instructions HTML keeps map CTA href but hides raw visible URL", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildArrivalInstructionsEmail({
      ...emailBase(locale),
      arrival: {
        checkInTime: "15:00",
        exactAddress: "Calle del Lago 1, Panajachel, Solola",
        mapUrl: MAP_URL,
        instructions:
          "Please use the main gate and message us when you are nearby.",
      },
    });

    expectHtmlHrefOnly(content, MAP_URL);
  }
});

test("I.4 guest review-invitation HTML keeps review CTA href but hides raw visible URL", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildReviewInvitationEmail({
      locale,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      guestName: reservation(locale).guestName,
      propertyNameEs: "Bungalow Lago",
      propertyNameEn: "Lake Bungalow",
      checkoutAt: "2026-10-12T11:00:00.000-06:00",
      expiresAt: "2026-11-11T11:00:00.000-06:00",
      reviewUrl: REVIEW_URL,
    });

    expectHtmlHrefOnly(content, REVIEW_URL);
  }
});

test("I.4 guest additional-charge payment HTML keeps payment CTA href but hides raw visible URL", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildAdditionalChargePaymentRequiredEmail({
      ...additionalChargeBase(locale),
      paymentRequest: {
        id: `gpr-final-i4-${locale}`,
        totalAmount: "42.00",
        currency: "USD",
        expiresAt: "2026-10-01T12:00:00.000-06:00",
        paymentUrl: PAYMENT_URL,
        items: [
          {
            category: "TRANSPORT",
            description: "Airport pickup",
            amount: "42.00",
            currency: "USD",
          },
        ],
      },
    });

    expectHtmlHrefOnly(content, PAYMENT_URL);
  }
});

test("I.4 guest lifecycle payment HTML keeps payment CTA href but hides raw visible URL", async () => {
  for (const locale of ["es", "en"] as const) {
    for (const builder of [
      buildDateChangePaymentRequiredEmail,
      buildStayExtensionPaymentRequiredEmail,
    ]) {
      const content = await builder({
        ...lifecycleBase(locale),
        paymentRequest: {
          requestType:
            builder === buildDateChangePaymentRequiredEmail
              ? "DATE_CHANGE"
              : "STAY_EXTENSION",
          originalCheckInDate: "2026-10-10",
          originalCheckOutDate: "2026-10-12",
          requestedCheckInDate: "2026-10-11",
          requestedCheckOutDate: "2026-10-13",
          amount: "35.00",
          holdExpiresAt: "2026-10-01T12:00:00.000-06:00",
          paymentUrl: PAYMENT_URL,
        },
      });

      expectHtmlHrefOnly(content, PAYMENT_URL);
    }
  }
});

test("I.4 preserves Admin visible action URL fallbacks in shared payment templates", async () => {
  for (const locale of ["es", "en"] as const) {
    const adminAdditionalCharge =
      await buildAdditionalChargeAdminPaymentRequiredEmail({
        ...additionalChargeBase(locale),
        paymentRequest: {
          id: `gpr-admin-final-i4-${locale}`,
          totalAmount: "42.00",
          currency: "USD",
          createdAt: "2026-09-29T12:00:00.000-06:00",
          expiresAt: "2026-10-01T12:00:00.000-06:00",
          status: "PENDING",
          createdByAdminName: "Admin Final I4",
          createdByAdminEmail: "admin@juantzun.dev",
          intendedGuestRecipient: `guest-final-i4-${locale}@example.com`,
          items: [
            {
              category: "TRANSPORT",
              description: "Airport pickup",
              amount: "42.00",
              currency: "USD",
              status: "PENDING",
            },
          ],
        },
      });
    const adminReservationUrl = `${PUBLIC_BASE_URL}/admin/reservations/final-i4-${locale}`;

    expectVisibleHtmlUrl(adminAdditionalCharge, adminReservationUrl);

    for (const builder of [
      buildAdminDateChangePaymentLinkDeliveryStatusEmail,
      buildAdminStayExtensionPaymentLinkDeliveryStatusEmail,
    ]) {
      const content = await builder({
        ...lifecycleBase(locale),
        delivery: {
          requestType:
            builder === buildAdminDateChangePaymentLinkDeliveryStatusEmail
              ? "DATE_CHANGE"
              : "STAY_EXTENSION",
          outcome: "SENT",
          intendedGuestRecipient: `guest-final-i4-${locale}@example.com`,
          sourceNotificationId: `email-final-i4-${locale}`,
          attemptCount: 1,
          observedAt: "2026-09-29T12:00:00.000-06:00",
          errorCode: null,
        },
      });

      expectVisibleHtmlUrl(content, adminReservationUrl);
    }
  }
});

test("I.4 keeps reservation-confirmed rendering stable as a no-action-url control", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildReservationConfirmedEmail(emailBase(locale));

    assert.ok(content.subject.length > 0);
    assert.ok(content.html.includes("Tu Refugio Perfecto"));
    assert.ok(content.text.includes(reservation(locale).reservationCode));
    assert.ok(
      !visibleTextFromHtml(content.html).includes(reservation(locale).id),
    );
    assert.ok(!visibleTextFromHtml(content.html).includes(REVIEW_URL));
    assert.ok(!visibleTextFromHtml(content.html).includes(PAYMENT_URL));
  }
});
