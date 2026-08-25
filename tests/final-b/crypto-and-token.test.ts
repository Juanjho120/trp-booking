import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import {
  buildAirbnbIcalExportEventUid,
  isTrpOwnedCalendarBlockForAirbnbExport,
} from "@/lib/airbnb-ical/export-policy";
import { normalizeAirbnbIcalExportPathToken } from "@/lib/airbnb-ical/export-path";
import {
  decryptExternalCalendarSecret,
  encryptExternalCalendarSecret,
  ExternalCalendarSecretCryptoError,
} from "@/lib/external-calendars/secret-crypto";
import { generateExternalCalendarExportToken } from "@/lib/external-calendars/export-token";
import { hashExternalCalendarExportToken } from "@/lib/external-calendars/token-hash";

import { test } from "./harness";

const encryptionKey = Buffer.alloc(32, 0x5a);
const propertyId = "black-white-apartment";
const plaintext =
  "https://www.airbnb.com/calendar/ical/example.ics?s=CaseSensitiveSecret";

function encryptForTest(purpose: "AIRBNB_IMPORT" | "TRP_EXPORT_TOKEN" = "AIRBNB_IMPORT") {
  return encryptExternalCalendarSecret(
    { plaintext, propertyId, purpose },
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

test("AES-GCM external-calendar secret round trip", () => {
  const encryptedValue = encryptForTest();
  const decryptedValue = decryptExternalCalendarSecret(
    {
      encryptedValue,
      propertyId,
      purpose: "AIRBNB_IMPORT",
    },
    { encryptionKey },
  );

  assert.equal(decryptedValue, plaintext);
});

test("AES-GCM envelope is versioned and structurally bounded", () => {
  const parts = encryptForTest().split(":");
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "v1");
  assert.ok(parts.slice(1).every((part) => /^[A-Za-z0-9_-]+$/.test(part)));
});

test("tampered external-calendar ciphertext fails closed", () => {
  const parts = encryptForTest().split(":");
  const ciphertext = Buffer.from(parts[3] ?? "", "base64url");

  ciphertext[0] = (ciphertext[0] ?? 0) ^ 0x01;
  parts[3] = ciphertext.toString("base64url");

  assertDecryptFailure(() =>
    decryptExternalCalendarSecret(
      {
        encryptedValue: parts.join(":"),
        propertyId,
        purpose: "AIRBNB_IMPORT",
      },
      { encryptionKey },
    ),
  );
});

test("wrong property AAD fails closed", () => {
  const encryptedValue = encryptForTest();

  assertDecryptFailure(() =>
    decryptExternalCalendarSecret(
      {
        encryptedValue,
        propertyId: "perfect-retreat-bungalow",
        purpose: "AIRBNB_IMPORT",
      },
      { encryptionKey },
    ),
  );
});

test("wrong secret-purpose AAD fails closed", () => {
  const encryptedValue = encryptForTest();

  assertDecryptFailure(() =>
    decryptExternalCalendarSecret(
      {
        encryptedValue,
        propertyId,
        purpose: "TRP_EXPORT_TOKEN",
      },
      { encryptionKey },
    ),
  );
});

test("external-calendar encryption rejects keys that are not 32 bytes", () => {
  assert.throws(
    () =>
      encryptExternalCalendarSecret(
        { plaintext, propertyId, purpose: "AIRBNB_IMPORT" },
        { encryptionKey: Buffer.alloc(31, 0x01) },
      ),
    (error: unknown) =>
      error instanceof ExternalCalendarSecretCryptoError &&
      error.code === "EXTERNAL_CALENDAR_SECRET_INVALID_KEY",
  );
});

test("outbound tokens are 256-bit lowercase hexadecimal values", () => {
  const tokens = Array.from({ length: 32 }, () =>
    generateExternalCalendarExportToken(),
  );

  assert.equal(new Set(tokens).size, tokens.length);
  for (const token of tokens) {
    assert.match(token, /^[a-f0-9]{64}$/);
  }
});

test("outbound token hashing stays SHA-256 lookup compatible", () => {
  const token = "0123456789abcdef".repeat(4);
  const expected = createHash("sha256").update(token, "utf8").digest("hex");

  assert.equal(hashExternalCalendarExportToken(token), expected);
});

test("rotated outbound hash invalidates the old token and accepts the new token", () => {
  const oldToken = generateExternalCalendarExportToken();
  let newToken = generateExternalCalendarExportToken();
  while (newToken === oldToken) {
    newToken = generateExternalCalendarExportToken();
  }

  const storedHashAfterRotation = hashExternalCalendarExportToken(newToken);
  assert.notEqual(hashExternalCalendarExportToken(oldToken), storedHashAfterRotation);
  assert.equal(hashExternalCalendarExportToken(newToken), storedHashAfterRotation);
});

test("Airbnb-compatible .ics path normalization preserves the raw token", () => {
  const token = "a".repeat(64);
  assert.equal(normalizeAirbnbIcalExportPathToken(`${token}.ics`), token);
  assert.equal(normalizeAirbnbIcalExportPathToken(token), token);
});

test("provider-origin calendar blocks stay excluded from TRP outbound feeds", () => {
  assert.equal(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "AIRBNB",
      externalCalendarEventId: "provider-event",
    }),
    false,
  );
  assert.equal(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "PREPARATION_BUFFER",
      externalCalendarEventId: "provider-event",
    }),
    false,
  );
  assert.equal(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "MANUAL_BLOCK",
      externalCalendarEventId: null,
    }),
    true,
  );
});

test("TRP outbound VEVENT identity is stable and uses the permanent UID host", () => {
  const input = {
    externalCalendarId: "calendar-1",
    range: { startDate: "2026-09-01", endDate: "2026-09-03" },
  } as const;
  const first = buildAirbnbIcalExportEventUid(input);
  const second = buildAirbnbIcalExportEventUid(input);

  assert.equal(first, second);
  assert.equal(
    first,
    "trp-booking-calendar-1-2026-09-01-2026-09-03@turefugioperfecto.com",
  );
});
