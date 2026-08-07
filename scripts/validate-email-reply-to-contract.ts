import assert from "node:assert/strict";

import {
  formatEnvValidationError,
  validateServerEnv,
} from "../lib/env/server";
import {
  getTransactionalEmailSubjectPrefix,
  resolveEmailDeliveryRecipient,
} from "../lib/email/resend-provider";

type EnvOverrides = Record<string, string | undefined>;

const BRAND_LOGO_URL =
  "https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png";

function createBaseEnv(overrides: EnvOverrides = {}): NodeJS.ProcessEnv {
  return {
    TRP_ENVIRONMENT: "test",
    DATABASE_URL:
      "postgresql://trp_user:trp_password@localhost:5432/postgres?schema=trp_booking",
    DIRECT_URL:
      "postgresql://trp_user:trp_password@localhost:5432/postgres?schema=trp_booking",
    AUTH_SECRET: "f3-contract-auth-secret-value-1234567890",
    AUTH_TRUST_HOST: "true",
    AUTH_GOOGLE_ID: "f3-google-client-id",
    AUTH_GOOGLE_SECRET: "f3-google-client-secret",
    AUTH_ALLOWED_ADMIN_EMAILS: "admin@juantzun.dev",
    CLOUDINARY_CLOUD_NAME: "trpf3",
    CLOUDINARY_API_KEY: "abc12345",
    CLOUDINARY_API_SECRET: "f3-cloudinary-secret",
    CLOUDINARY_UPLOAD_FOLDER: "trp-booking/f3-contract",
    TILOPAY_ENVIRONMENT: "sandbox",
    TILOPAY_API_KEY: "f3-tilopay-key",
    TILOPAY_API_USER: "f3-tilopay-user",
    TILOPAY_API_PASSWORD: "f3-tilopay-password",
    TILOPAY_REDIRECT_URL:
      "https://trp-booking.juantzun.dev/api/payments/tilopay/redirect",
    TILOPAY_SUCCESS_URL:
      "https://trp-booking.juantzun.dev/reservas/pago/exitoso",
    TILOPAY_CANCEL_URL:
      "https://trp-booking.juantzun.dev/reservas/pago/cancelado",
    TILOPAY_ERROR_URL:
      "https://trp-booking.juantzun.dev/reservas/pago/error",
    TILOPAY_WEBHOOK_URL:
      "https://trp-booking.juantzun.dev/api/payments/tilopay/webhook",
    EMAIL_DELIVERY_MODE: "test",
    RESEND_API_KEY: "re_f3contract1234567890",
    EMAIL_FROM_ES:
      "Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>",
    EMAIL_FROM_EN:
      "Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>",
    EMAIL_REPLY_TO_ES: "reservas@juantzun.dev",
    EMAIL_REPLY_TO_EN: "reservations@juantzun.dev",
    EMAIL_ADMIN_RECIPIENTS: "admin@juantzun.dev",
    EMAIL_ADMIN_LOCALE: "es",
    EMAIL_PUBLIC_BASE_URL: "https://trp-booking.juantzun.dev",
    EMAIL_BRAND_LOGO_URL: BRAND_LOGO_URL,
    EMAIL_TEST_RECIPIENT: undefined,
    VERCEL_ENV: "production",
    NODE_ENV: "production",
    ...overrides,
  };
}

function createLocalEnv(overrides: EnvOverrides = {}): NodeJS.ProcessEnv {
  return createBaseEnv({
    TRP_ENVIRONMENT: "local",
    TILOPAY_REDIRECT_URL: "http://localhost:3000/api/payments/tilopay/redirect",
    TILOPAY_SUCCESS_URL: "http://localhost:3000/reservas/pago/exitoso",
    TILOPAY_CANCEL_URL: "http://localhost:3000/reservas/pago/cancelado",
    TILOPAY_ERROR_URL: "http://localhost:3000/reservas/pago/error",
    TILOPAY_WEBHOOK_URL: "http://localhost:3000/api/payments/tilopay/webhook",
    EMAIL_PUBLIC_BASE_URL: "http://localhost:3000",
    EMAIL_TEST_RECIPIENT: "local-guest-inbox@example.net",
    VERCEL_ENV: "development",
    NODE_ENV: "development",
    ...overrides,
  });
}

function createProductionEnv(overrides: EnvOverrides = {}): NodeJS.ProcessEnv {
  return createBaseEnv({
    TRP_ENVIRONMENT: "production",
    TILOPAY_ENVIRONMENT: "production",
    TILOPAY_REDIRECT_URL:
      "https://turefugioperfecto.com/api/payments/tilopay/redirect",
    TILOPAY_SUCCESS_URL:
      "https://turefugioperfecto.com/reservas/pago/exitoso",
    TILOPAY_CANCEL_URL:
      "https://turefugioperfecto.com/reservas/pago/cancelado",
    TILOPAY_ERROR_URL: "https://turefugioperfecto.com/reservas/pago/error",
    TILOPAY_WEBHOOK_URL:
      "https://turefugioperfecto.com/api/payments/tilopay/webhook",
    EMAIL_DELIVERY_MODE: "production",
    EMAIL_FROM_ES:
      "Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>",
    EMAIL_FROM_EN:
      "Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>",
    EMAIL_REPLY_TO_ES: "reservas@turefugioperfecto.com",
    EMAIL_REPLY_TO_EN: "reservations@turefugioperfecto.com",
    EMAIL_ADMIN_RECIPIENTS: "admin@turefugioperfecto.com",
    EMAIL_PUBLIC_BASE_URL: "https://turefugioperfecto.com",
    EMAIL_BRAND_LOGO_URL: BRAND_LOGO_URL,
    EMAIL_TEST_RECIPIENT: undefined,
    VERCEL_ENV: "production",
    NODE_ENV: "production",
    ...overrides,
  });
}

function expectValid(label: string, env: NodeJS.ProcessEnv): void {
  validateServerEnv(env);
  console.info(`PASS: ${label}`);
}

function expectInvalid(
  label: string,
  env: NodeJS.ProcessEnv,
  expectedKey: string,
  expectedText: string,
): void {
  try {
    validateServerEnv(env);
  } catch (error) {
    const formatted = formatEnvValidationError(error);
    const escapedExpectedText = expectedText.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    assert.match(formatted, new RegExp(`- ${expectedKey}:`));
    assert.match(formatted, new RegExp(escapedExpectedText));
    console.info(`PASS: ${label}`);
    return;
  }

  assert.fail(`${label}: validation unexpectedly succeeded.`);
}

expectValid(
  "local keeps test Resend From, Zoho Reply-To, and a guest safety recipient",
  createLocalEnv(),
);
expectValid(
  "test sends to intended recipients while keeping Zoho admin and Reply-To addresses",
  createBaseEnv(),
);
expectValid(
  "production preserves production sending and human correspondence domains",
  createProductionEnv(),
);

expectInvalid(
  "local requires EMAIL_TEST_RECIPIENT when email delivery is enabled",
  createLocalEnv({ EMAIL_TEST_RECIPIENT: undefined }),
  "EMAIL_TEST_RECIPIENT",
  "Required for local guest-delivery isolation",
);
expectInvalid(
  "test rejects a leftover EMAIL_TEST_RECIPIENT override",
  createBaseEnv({ EMAIL_TEST_RECIPIENT: "old-test-override@example.net" }),
  "EMAIL_TEST_RECIPIENT",
  "Must be empty outside TRP_ENVIRONMENT=local",
);
expectInvalid(
  "production rejects EMAIL_TEST_RECIPIENT",
  createProductionEnv({ EMAIL_TEST_RECIPIENT: "old-test-override@example.net" }),
  "EMAIL_TEST_RECIPIENT",
  "Must be empty outside TRP_ENVIRONMENT=local",
);
expectInvalid(
  "test rejects the pre-F.3 technical Reply-To address",
  createBaseEnv({
    EMAIL_REPLY_TO_ES: "reservas@mail.trp-booking.juantzun.dev",
  }),
  "EMAIL_REPLY_TO_ES",
  "reservas@juantzun.dev",
);
expectInvalid(
  "test rejects a production Reply-To address",
  createBaseEnv({
    EMAIL_REPLY_TO_EN: "reservations@turefugioperfecto.com",
  }),
  "EMAIL_REPLY_TO_EN",
  "reservations@juantzun.dev",
);
expectInvalid(
  "test rejects From on the human correspondence domain",
  createBaseEnv({
    EMAIL_FROM_ES: "Tu Refugio Perfecto Test <reservas@juantzun.dev>",
  }),
  "EMAIL_FROM_ES",
  "mail.trp-booking.juantzun.dev",
);
expectInvalid(
  "test rejects an admin recipient outside juantzun.dev",
  createBaseEnv({ EMAIL_ADMIN_RECIPIENTS: "admin@example.net" }),
  "EMAIL_ADMIN_RECIPIENTS",
  "juantzun.dev",
);
expectInvalid(
  "production rejects an admin recipient outside turefugioperfecto.com",
  createProductionEnv({ EMAIL_ADMIN_RECIPIENTS: "admin@juantzun.dev" }),
  "EMAIL_ADMIN_RECIPIENTS",
  "turefugioperfecto.com",
);

assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "local",
    audience: "guest",
    intendedRecipient: "guest@example.org",
    testRecipient: "local-guest-inbox@example.net",
  }),
  "local-guest-inbox@example.net",
);
assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "local",
    audience: "admin",
    intendedRecipient: "admin@juantzun.dev",
    testRecipient: "local-guest-inbox@example.net",
  }),
  "admin@juantzun.dev",
);
assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "test",
    audience: "guest",
    intendedRecipient: "guest@example.org",
  }),
  "guest@example.org",
);
assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "test",
    audience: "admin",
    intendedRecipient: "admin@juantzun.dev",
  }),
  "admin@juantzun.dev",
);
assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "production",
    audience: "guest",
    intendedRecipient: "guest@example.org",
  }),
  "guest@example.org",
);
assert.equal(
  resolveEmailDeliveryRecipient({
    trpEnvironment: "production",
    audience: "admin",
    intendedRecipient: "admin@turefugioperfecto.com",
  }),
  "admin@turefugioperfecto.com",
);
console.info("PASS: audience-aware local/test/production recipient routing");

assert.equal(getTransactionalEmailSubjectPrefix("local"), "[LOCAL] ");
assert.equal(getTransactionalEmailSubjectPrefix("test"), "[TEST] ");
assert.equal(getTransactionalEmailSubjectPrefix("production"), "");
console.info("PASS: local/test/production subject prefixes");

console.info("Transactional email routing contract validation passed.");
