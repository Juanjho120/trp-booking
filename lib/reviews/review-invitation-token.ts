import { createHash, randomBytes } from "node:crypto";

import {
  decryptExternalCalendarSecret,
  encryptExternalCalendarSecret,
} from "@/lib/external-calendars/secret-crypto";

const ACCESS_TOKEN_LENGTH_BYTES = 32;
const ACCESS_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export type ReviewInvitationTokenMaterial = Readonly<{
  rawToken: string;
  tokenHash: string;
  encryptedToken: string;
}>;

export function generateReviewInvitationAccessToken(): string {
  return randomBytes(ACCESS_TOKEN_LENGTH_BYTES).toString("hex");
}

export function isReviewInvitationAccessToken(value: string): boolean {
  return ACCESS_TOKEN_PATTERN.test(value.trim());
}

export function hashReviewInvitationAccessToken(rawToken: string): string {
  const normalizedToken = rawToken.trim();

  if (!isReviewInvitationAccessToken(normalizedToken)) {
    throw new Error(
      "Review invitation token must contain exactly 256 bits encoded as lowercase hexadecimal.",
    );
  }

  return createHash("sha256").update(normalizedToken, "utf8").digest("hex");
}

export function createReviewInvitationTokenMaterial(
  reservationId: string,
  rawToken: string = generateReviewInvitationAccessToken(),
): ReviewInvitationTokenMaterial {
  const normalizedToken = rawToken.trim();

  if (!isReviewInvitationAccessToken(normalizedToken)) {
    throw new Error(
      "Review invitation token must contain exactly 256 bits encoded as lowercase hexadecimal.",
    );
  }

  return {
    rawToken: normalizedToken,
    tokenHash: hashReviewInvitationAccessToken(normalizedToken),
    encryptedToken: encryptExternalCalendarSecret({
      plaintext: normalizedToken,
      propertyId: reservationId,
      purpose: "REVIEW_INVITATION",
    }),
  };
}

export function decryptReviewInvitationAccessToken(
  reservationId: string,
  encryptedToken: string,
): string {
  return decryptExternalCalendarSecret({
    encryptedValue: encryptedToken,
    propertyId: reservationId,
    purpose: "REVIEW_INVITATION",
  });
}
