import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import {
  decryptExternalCalendarSecret,
  encryptExternalCalendarSecret,
  ExternalCalendarSecretCryptoError,
} from "@/lib/external-calendars/secret-crypto";

import { test } from "./harness";

const encryptionKey = Buffer.alloc(32, 0x7e);
const reservationId = "reservation-review-invitation-1";
const reviewInvitationToken = "0123456789abcdef".repeat(4);

function encryptReviewInvitationToken() {
  return encryptExternalCalendarSecret(
    {
      plaintext: reviewInvitationToken,
      propertyId: reservationId,
      purpose: "REVIEW_INVITATION",
    },
    { encryptionKey },
  );
}

function assertDecryptFailure(run: () => unknown): void {
  assert.throws(run, (error: unknown) => {
    return (
      error instanceof ExternalCalendarSecretCryptoError &&
      error.code === "EXTERNAL_CALENDAR_SECRET_DECRYPTION_FAILED"
    );
  });
}

test("REVIEW_INVITATION crypto purpose round-trips with reservation-bound AAD", () => {
  const encryptedValue = encryptReviewInvitationToken();

  const decryptedValue = decryptExternalCalendarSecret(
    {
      encryptedValue,
      propertyId: reservationId,
      purpose: "REVIEW_INVITATION",
    },
    { encryptionKey },
  );

  assert.equal(decryptedValue, reviewInvitationToken);
});

test("REVIEW_INVITATION ciphertext cannot be decrypted as a guest payment token", () => {
  const encryptedValue = encryptReviewInvitationToken();

  assertDecryptFailure(() =>
    decryptExternalCalendarSecret(
      {
        encryptedValue,
        propertyId: reservationId,
        purpose: "GUEST_PAYMENT_REQUEST",
      },
      { encryptionKey },
    ),
  );
});

test("REVIEW_INVITATION ciphertext cannot be decrypted for another reservation", () => {
  const encryptedValue = encryptReviewInvitationToken();

  assertDecryptFailure(() =>
    decryptExternalCalendarSecret(
      {
        encryptedValue,
        propertyId: "reservation-review-invitation-2",
        purpose: "REVIEW_INVITATION",
      },
      { encryptionKey },
    ),
  );
});
