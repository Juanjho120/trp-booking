import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { getExternalCalendarEncryptionKeyBase64 } from "@/lib/env/server";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENVELOPE_VERSION = "v1";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const EXPECTED_KEY_LENGTH_BYTES = 32;

export const externalCalendarSecretPurposes = [
  "AIRBNB_IMPORT",
  "TRP_EXPORT_TOKEN",
  "GUEST_PAYMENT_REQUEST",
] as const;

export type ExternalCalendarSecretPurpose =
  (typeof externalCalendarSecretPurposes)[number];

export type ExternalCalendarSecretCryptoErrorCode =
  | "EXTERNAL_CALENDAR_SECRET_INVALID_INPUT"
  | "EXTERNAL_CALENDAR_SECRET_INVALID_ENVELOPE"
  | "EXTERNAL_CALENDAR_SECRET_DECRYPTION_FAILED"
  | "EXTERNAL_CALENDAR_SECRET_INVALID_KEY";

export class ExternalCalendarSecretCryptoError extends Error {
  constructor(public readonly code: ExternalCalendarSecretCryptoErrorCode) {
    super(code);
    this.name = "ExternalCalendarSecretCryptoError";
  }
}

type ExternalCalendarSecretCryptoOptions = Readonly<{
  encryptionKey?: Buffer;
}>;

type EncryptExternalCalendarSecretInput = Readonly<{
  plaintext: string;
  propertyId: string;
  purpose: ExternalCalendarSecretPurpose;
}>;

type DecryptExternalCalendarSecretInput = Readonly<{
  encryptedValue: string;
  propertyId: string;
  purpose: ExternalCalendarSecretPurpose;
}>;

function assertServerSideSecretCrypto(): void {
  if (typeof window !== "undefined") {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_INPUT",
    );
  }
}

function normalizePropertyId(propertyId: string): string {
  const normalized = propertyId.trim();

  if (!normalized) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_INPUT",
    );
  }

  return normalized;
}

function getAdditionalAuthenticatedData(
  purpose: ExternalCalendarSecretPurpose,
  propertyId: string,
): Buffer {
  const normalizedId = normalizePropertyId(propertyId);

  if (purpose === "GUEST_PAYMENT_REQUEST") {
    return Buffer.from(
      `trp-booking:guest-payment-request:${normalizedId}`,
      "utf8",
    );
  }

  const purposeSegment =
    purpose === "AIRBNB_IMPORT" ? "airbnb-import" : "trp-export-token";

  return Buffer.from(
    `trp-booking:external-calendar:${purposeSegment}:${normalizedId}`,
    "utf8",
  );
}

function resolveEncryptionKey(
  options: ExternalCalendarSecretCryptoOptions,
): Buffer {
  const key = options.encryptionKey
    ? Buffer.from(options.encryptionKey)
    : Buffer.from(getExternalCalendarEncryptionKeyBase64(), "base64");

  if (key.length !== EXPECTED_KEY_LENGTH_BYTES) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_KEY",
    );
  }

  return key;
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function decodeBase64Url(
  value: string,
  expectedLength?: number,
): Buffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_ENVELOPE",
    );
  }

  const decoded = Buffer.from(value, "base64url");

  if (
    decoded.length === 0 ||
    (expectedLength !== undefined && decoded.length !== expectedLength)
  ) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_ENVELOPE",
    );
  }

  if (encodeBase64Url(decoded) !== value) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_ENVELOPE",
    );
  }

  return decoded;
}

export function encryptExternalCalendarSecret(
  input: EncryptExternalCalendarSecretInput,
  options: ExternalCalendarSecretCryptoOptions = {},
): string {
  assertServerSideSecretCrypto();

  const plaintext = input.plaintext.trim();

  if (!plaintext) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_INPUT",
    );
  }

  const encryptionKey = resolveEncryptionKey(options);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  cipher.setAAD(getAdditionalAuthenticatedData(input.purpose, input.propertyId));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    encodeBase64Url(iv),
    encodeBase64Url(authTag),
    encodeBase64Url(ciphertext),
  ].join(":");
}

export function decryptExternalCalendarSecret(
  input: DecryptExternalCalendarSecretInput,
  options: ExternalCalendarSecretCryptoOptions = {},
): string {
  assertServerSideSecretCrypto();

  const parts = input.encryptedValue.trim().split(":");

  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_INVALID_ENVELOPE",
    );
  }

  const iv = decodeBase64Url(parts[1] ?? "", IV_LENGTH_BYTES);
  const authTag = decodeBase64Url(parts[2] ?? "", AUTH_TAG_LENGTH_BYTES);
  const ciphertext = decodeBase64Url(parts[3] ?? "");
  const encryptionKey = resolveEncryptionKey(options);

  try {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      encryptionKey,
      iv,
      { authTagLength: AUTH_TAG_LENGTH_BYTES },
    );

    decipher.setAAD(
      getAdditionalAuthenticatedData(input.purpose, input.propertyId),
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ExternalCalendarSecretCryptoError(
      "EXTERNAL_CALENDAR_SECRET_DECRYPTION_FAILED",
    );
  }
}
