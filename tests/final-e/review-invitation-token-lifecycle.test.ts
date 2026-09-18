import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import {
  ReviewInvitationStatus,
  type Prisma,
} from "@prisma/client";

import {
  cancelReviewInvitationInTransaction,
  createReviewInvitationTokenMaterial,
  decryptReviewInvitationAccessToken,
  expireReviewInvitationIfOverdueInTransaction,
  generateReviewInvitationAccessToken,
  getReviewInvitationEffectiveStatus,
  hashReviewInvitationAccessToken,
  isReviewInvitationAccessToken,
  type ReviewInvitationLifecycleRecord,
} from "@/lib/reviews";
import {
  decryptExternalCalendarSecret,
  ExternalCalendarSecretCryptoError,
} from "@/lib/external-calendars/secret-crypto";

import { test } from "./harness";

const knownToken = "0123456789abcdef".repeat(4);
const now = new Date("2026-09-20T12:00:00.000Z");

function preserveReviewTokenEnv(): () => void {
  const keys = [
    "TRP_ENVIRONMENT",
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_SECRET",
    "AUTH_TRUST_HOST",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_ALLOWED_ADMIN_EMAILS",
    "EXTERNAL_CALENDAR_ENCRYPTION_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_FOLDER",
    "TILOPAY_ENVIRONMENT",
    "TILOPAY_API_KEY",
    "TILOPAY_API_USER",
    "TILOPAY_API_PASSWORD",
    "TILOPAY_REDIRECT_URL",
    "TILOPAY_SUCCESS_URL",
    "TILOPAY_CANCEL_URL",
    "TILOPAY_ERROR_URL",
    "TILOPAY_WEBHOOK_URL",
    "EMAIL_DELIVERY_MODE",
    "VERCEL_ENV",
  ] as const;
  const previous = new Map<string, string | undefined>();

  for (const key of keys) {
    previous.set(key, process.env[key]);
  }

  process.env.TRP_ENVIRONMENT = "local";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.DIRECT_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.AUTH_SECRET = "final-e3-test-auth-secret-at-least-32-chars";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.AUTH_GOOGLE_ID = "final-e3-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-e3-google-secret";
  process.env.AUTH_ALLOWED_ADMIN_EMAILS = "admin@juantzun.dev";
  process.env.EXTERNAL_CALENDAR_ENCRYPTION_KEY =
    Buffer.alloc(32, 9).toString("base64");
  process.env.CLOUDINARY_CLOUD_NAME = "trpbookingtest";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "final-e3-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-e3";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-e3-api-key";
  process.env.TILOPAY_API_USER = "final-e3-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-e3-api-password";
  process.env.TILOPAY_REDIRECT_URL =
    "http://localhost:3000/api/payments/tilopay/redirect";
  process.env.TILOPAY_SUCCESS_URL =
    "http://localhost:3000/reservas/pago/exitoso";
  process.env.TILOPAY_CANCEL_URL =
    "http://localhost:3000/reservas/pago/cancelado";
  process.env.TILOPAY_ERROR_URL =
    "http://localhost:3000/reservas/pago/error";
  process.env.TILOPAY_WEBHOOK_URL =
    "http://localhost:3000/api/payments/tilopay/webhook";
  process.env.EMAIL_DELIVERY_MODE = "disabled";
  process.env.VERCEL_ENV = "development";

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function buildInvitation(
  status: ReviewInvitationStatus,
  overrides: Partial<ReviewInvitationLifecycleRecord> = {},
): ReviewInvitationLifecycleRecord {
  return {
    id: `invitation-${status.toLowerCase()}`,
    reservationId: "reservation-token-lifecycle",
    status,
    accessTokenHash: hashReviewInvitationAccessToken(knownToken),
    accessTokenEncrypted: "encrypted-token",
    checkoutAtSnapshot: new Date("2026-09-18T17:00:00.000Z"),
    eligibleAt: new Date("2026-09-18T19:00:00.000Z"),
    expiresAt: new Date("2026-09-19T12:00:00.000Z"),
    consumedAt:
      status === ReviewInvitationStatus.CONSUMED
        ? new Date("2026-09-19T10:00:00.000Z")
        : null,
    createdAt: new Date("2026-09-18T19:00:00.000Z"),
    updatedAt: new Date("2026-09-18T19:00:00.000Z"),
    ...overrides,
  };
}

function createLifecycleTx(invitation: ReviewInvitationLifecycleRecord) {
  const updateCalls: unknown[] = [];
  const tx = {
    reviewInvitation: {
      async updateMany(args: {
        where: {
          id: string;
          status: ReviewInvitationStatus;
          expiresAt?: { lte: Date };
        };
        data: Partial<ReviewInvitationLifecycleRecord>;
      }) {
        updateCalls.push(args);

        const matchesId = args.where.id === invitation.id;
        const matchesStatus = args.where.status === invitation.status;
        const matchesExpiry =
          !args.where.expiresAt ||
          invitation.expiresAt.getTime() <= args.where.expiresAt.lte.getTime();

        if (!matchesId || !matchesStatus || !matchesExpiry) {
          return { count: 0 };
        }

        Object.assign(invitation, args.data);

        return { count: 1 };
      },
    },
  };

  return {
    tx: tx as unknown as Prisma.TransactionClient,
    invitation,
    updateCalls,
  };
}

test("E.3 review invitation tokens are lowercase 64-char hex and hash deterministically", () => {
  const generatedToken = generateReviewInvitationAccessToken();
  const expectedHash = createHash("sha256")
    .update(knownToken, "utf8")
    .digest("hex");

  assert.match(generatedToken, /^[a-f0-9]{64}$/);
  assert.equal(isReviewInvitationAccessToken(generatedToken), true);
  assert.equal(hashReviewInvitationAccessToken(knownToken), expectedHash);
  assert.match(hashReviewInvitationAccessToken(knownToken), /^[a-f0-9]{64}$/);
  assert.equal(isReviewInvitationAccessToken("ABCDEF".repeat(10) + "abcd"), false);
  assert.throws(() => hashReviewInvitationAccessToken("not-a-token"));
});

test("E.3 token material uses REVIEW_INVITATION purpose and reservation-bound AAD", () => {
  const restoreEnv = preserveReviewTokenEnv();

  try {
    const material = createReviewInvitationTokenMaterial(
      "reservation-review-token-purpose",
      knownToken,
    );

    assert.equal(material.rawToken, knownToken);
    assert.equal(material.tokenHash, hashReviewInvitationAccessToken(knownToken));
    assert.equal(
      decryptReviewInvitationAccessToken(
        "reservation-review-token-purpose",
        material.encryptedToken,
      ),
      knownToken,
    );

    assert.throws(
      () =>
        decryptExternalCalendarSecret({
          encryptedValue: material.encryptedToken,
          propertyId: "reservation-review-token-purpose",
          purpose: "GUEST_PAYMENT_REQUEST",
        }),
      (error: unknown) =>
        error instanceof ExternalCalendarSecretCryptoError &&
        error.code === "EXTERNAL_CALENDAR_SECRET_DECRYPTION_FAILED",
    );
  } finally {
    restoreEnv();
  }
});

test("E.3 effective lifecycle status treats overdue ACTIVE invitations as expired without mutation", () => {
  assert.equal(
    getReviewInvitationEffectiveStatus(
      buildInvitation(ReviewInvitationStatus.ACTIVE),
      now,
    ),
    ReviewInvitationStatus.EXPIRED,
  );
  assert.equal(
    getReviewInvitationEffectiveStatus(
      buildInvitation(ReviewInvitationStatus.ACTIVE, {
        expiresAt: new Date(now.getTime() + 1),
      }),
      now,
    ),
    ReviewInvitationStatus.ACTIVE,
  );

  for (const status of [
    ReviewInvitationStatus.EXPIRED,
    ReviewInvitationStatus.CANCELLED,
    ReviewInvitationStatus.CONSUMED,
  ] as const) {
    assert.equal(
      getReviewInvitationEffectiveStatus(buildInvitation(status), now),
      status,
    );
  }
});

test("E.3 expiration convergence only transitions overdue ACTIVE invitations", async () => {
  const active = createLifecycleTx(buildInvitation(ReviewInvitationStatus.ACTIVE));
  const activeResult = await expireReviewInvitationIfOverdueInTransaction(
    active.tx,
    active.invitation.id,
    now,
  );

  assert.equal(activeResult.transitioned, true);
  assert.equal(active.invitation.status, ReviewInvitationStatus.EXPIRED);
  assert.equal(active.invitation.accessTokenEncrypted, null);
  assert.equal(active.invitation.consumedAt, null);

  const notOverdue = createLifecycleTx(
    buildInvitation(ReviewInvitationStatus.ACTIVE, {
      expiresAt: new Date(now.getTime() + 1),
    }),
  );
  const notOverdueResult = await expireReviewInvitationIfOverdueInTransaction(
    notOverdue.tx,
    notOverdue.invitation.id,
    now,
  );

  assert.equal(notOverdueResult.transitioned, false);
  assert.equal(notOverdue.invitation.status, ReviewInvitationStatus.ACTIVE);
  assert.equal(notOverdue.invitation.accessTokenEncrypted, "encrypted-token");

  for (const status of [
    ReviewInvitationStatus.EXPIRED,
    ReviewInvitationStatus.CANCELLED,
    ReviewInvitationStatus.CONSUMED,
  ] as const) {
    const terminal = createLifecycleTx(buildInvitation(status));
    const result = await expireReviewInvitationIfOverdueInTransaction(
      terminal.tx,
      terminal.invitation.id,
      now,
    );

    assert.equal(result.transitioned, false);
    assert.equal(terminal.invitation.status, status);
  }
});

test("E.3 cancellation primitive only transitions ACTIVE invitations and clears encrypted token", async () => {
  const active = createLifecycleTx(buildInvitation(ReviewInvitationStatus.ACTIVE));
  const activeResult = await cancelReviewInvitationInTransaction(
    active.tx,
    active.invitation.id,
    now,
  );

  assert.equal(activeResult.transitioned, true);
  assert.equal(active.invitation.status, ReviewInvitationStatus.CANCELLED);
  assert.equal(active.invitation.accessTokenEncrypted, null);
  assert.equal(active.invitation.consumedAt, null);

  for (const status of [
    ReviewInvitationStatus.EXPIRED,
    ReviewInvitationStatus.CANCELLED,
    ReviewInvitationStatus.CONSUMED,
  ] as const) {
    const terminal = createLifecycleTx(buildInvitation(status));
    const result = await cancelReviewInvitationInTransaction(
      terminal.tx,
      terminal.invitation.id,
      now,
    );

    assert.equal(result.transitioned, false);
    assert.equal(terminal.invitation.status, status);
  }
});
