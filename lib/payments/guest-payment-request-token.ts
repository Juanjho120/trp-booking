import { createHash, randomBytes } from "node:crypto";

import {
  decryptExternalCalendarSecret,
  encryptExternalCalendarSecret,
} from "@/lib/external-calendars/secret-crypto";

const ACCESS_TOKEN_LENGTH_BYTES = 32;
const ACCESS_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export type GuestPaymentRequestTokenMaterial = Readonly<{
  rawToken: string;
  tokenHash: string;
  encryptedToken: string;
}>;

export function generateGuestPaymentRequestAccessToken(): string {
  return randomBytes(ACCESS_TOKEN_LENGTH_BYTES).toString("hex");
}

export function hashGuestPaymentRequestAccessToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function createGuestPaymentRequestTokenMaterial(
  reservationId: string,
  rawToken: string = generateGuestPaymentRequestAccessToken(),
): GuestPaymentRequestTokenMaterial {
  const normalizedToken = rawToken.trim();

  if (!ACCESS_TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error(
      "Guest payment request token must contain exactly 256 bits encoded as lowercase hexadecimal.",
    );
  }

  return {
    rawToken: normalizedToken,
    tokenHash: hashGuestPaymentRequestAccessToken(normalizedToken),
    encryptedToken: encryptExternalCalendarSecret({
      plaintext: normalizedToken,
      propertyId: reservationId,
      purpose: "GUEST_PAYMENT_REQUEST",
    }),
  };
}

export function decryptGuestPaymentRequestAccessToken(
  reservationId: string,
  encryptedToken: string,
): string {
  return decryptExternalCalendarSecret({
    encryptedValue: encryptedToken,
    propertyId: reservationId,
    purpose: "GUEST_PAYMENT_REQUEST",
  });
}
