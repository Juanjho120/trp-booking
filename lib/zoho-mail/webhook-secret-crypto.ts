import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { getZohoMailWebhookEnv } from "@/lib/env/server";

const ZOHO_MAIL_WEBHOOK_SECRET_VERSION = "v1";

export class ZohoMailWebhookSecretCryptoError extends Error {
  constructor() {
    super("ZOHO_MAIL_WEBHOOK_SECRET_CRYPTO_ERROR");
    this.name = "ZohoMailWebhookSecretCryptoError";
  }
}

function aadForBusinessEnvironment(businessEnvironment: string): Buffer {
  return Buffer.from(
    `TRP Booking / Zoho Mail webhook / business environment / ${businessEnvironment}`,
    "utf8",
  );
}

function readEncryptionKey(source: NodeJS.ProcessEnv): Buffer {
  const env = getZohoMailWebhookEnv(source);

  if (!env.configured || !env.encryptionKeyBase64) {
    throw new ZohoMailWebhookSecretCryptoError();
  }

  const key = Buffer.from(env.encryptionKeyBase64, "base64");

  if (key.length !== 32 || key.toString("base64") !== env.encryptionKeyBase64) {
    throw new ZohoMailWebhookSecretCryptoError();
  }

  return key;
}

function normalizeHookSecret(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ZohoMailWebhookSecretCryptoError();
  }

  return normalized;
}

export function encryptZohoMailWebhookSecret(
  input: Readonly<{
    hookSecret: string;
    businessEnvironment: string;
    source?: NodeJS.ProcessEnv;
  }>,
): string {
  try {
    const source = input.source ?? process.env;
    const key = readEncryptionKey(source);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aadForBusinessEnvironment(input.businessEnvironment));

    const ciphertext = Buffer.concat([
      cipher.update(normalizeHookSecret(input.hookSecret), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      ZOHO_MAIL_WEBHOOK_SECRET_VERSION,
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(":");
  } catch (error) {
    if (error instanceof ZohoMailWebhookSecretCryptoError) {
      throw error;
    }

    throw new ZohoMailWebhookSecretCryptoError();
  }
}

export function decryptZohoMailWebhookSecret(
  input: Readonly<{
    encryptedSecret: string;
    businessEnvironment: string;
    source?: NodeJS.ProcessEnv;
  }>,
): string {
  try {
    const [version, ivBase64, tagBase64, ciphertextBase64] =
      input.encryptedSecret.split(":");

    if (
      version !== ZOHO_MAIL_WEBHOOK_SECRET_VERSION ||
      !ivBase64 ||
      !tagBase64 ||
      !ciphertextBase64
    ) {
      throw new ZohoMailWebhookSecretCryptoError();
    }

    const source = input.source ?? process.env;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      readEncryptionKey(source),
      Buffer.from(ivBase64, "base64"),
    );
    decipher.setAAD(aadForBusinessEnvironment(input.businessEnvironment));
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextBase64, "base64")),
      decipher.final(),
    ]).toString("utf8");

    return normalizeHookSecret(plaintext);
  } catch (error) {
    if (error instanceof ZohoMailWebhookSecretCryptoError) {
      throw error;
    }

    throw new ZohoMailWebhookSecretCryptoError();
  }
}
