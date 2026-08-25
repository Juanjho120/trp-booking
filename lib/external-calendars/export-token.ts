import { randomBytes } from "node:crypto";

import {
  decryptExternalCalendarSecret,
  encryptExternalCalendarSecret,
} from "./secret-crypto";
import { hashExternalCalendarExportToken } from "./token-hash";

const EXPORT_TOKEN_LENGTH_BYTES = 32;
const EXPORT_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export type ExternalCalendarExportTokenMaterial = Readonly<{
  rawToken: string;
  tokenHash: string;
  encryptedToken: string;
}>;

export function generateExternalCalendarExportToken(): string {
  return randomBytes(EXPORT_TOKEN_LENGTH_BYTES).toString("hex");
}

export function createExternalCalendarExportTokenMaterial(
  propertyId: string,
  rawToken: string = generateExternalCalendarExportToken(),
): ExternalCalendarExportTokenMaterial {
  const normalizedToken = rawToken.trim();

  if (!EXPORT_TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error(
      "External calendar export token must contain exactly 256 bits encoded as lowercase hexadecimal.",
    );
  }

  return {
    rawToken: normalizedToken,
    tokenHash: hashExternalCalendarExportToken(normalizedToken),
    encryptedToken: encryptExternalCalendarSecret({
      plaintext: normalizedToken,
      propertyId,
      purpose: "TRP_EXPORT_TOKEN",
    }),
  };
}

export function decryptExternalCalendarExportToken(
  propertyId: string,
  encryptedToken: string,
): string {
  return decryptExternalCalendarSecret({
    encryptedValue: encryptedToken,
    propertyId,
    purpose: "TRP_EXPORT_TOKEN",
  });
}
