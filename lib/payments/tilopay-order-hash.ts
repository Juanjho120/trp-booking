import { createHmac, timingSafeEqual } from "crypto";

import { getTilopayEnv } from "@/lib/env/server";

export type TilopayOrderHashInput = Readonly<{
  orderHash: string;
  orderId: string;
  externalOrderId: string;
  amount: string;
  currency: string;
  responseCode: string;
  auth: string;
  email: string;
}>;

function buildSigningKey(input: Readonly<{
  orderId: string;
  apiKey: string;
  apiPassword: string;
}>): string {
  return [input.orderId, input.apiKey, input.apiPassword].join("|");
}

function buildSigningMessage(input: Readonly<{
  apiKey: string;
  apiUser: string;
  orderId: string;
  externalOrderId: string;
  amount: string;
  currency: string;
  responseCode: string;
  auth: string;
  email: string;
}>): string {
  return [
    input.apiKey,
    input.apiUser,
    input.orderId,
    input.externalOrderId,
    input.amount,
    input.currency,
    input.responseCode,
    input.auth,
    input.email,
  ].join("|");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createTilopayOrderHash(input: TilopayOrderHashInput): Readonly<{
  hex: string;
  base64: string;
}> {
  const env = getTilopayEnv();
  const signingKey = buildSigningKey({
    orderId: input.orderId,
    apiKey: env.TILOPAY_API_KEY,
    apiPassword: env.TILOPAY_API_PASSWORD,
  });
  const signingMessage = buildSigningMessage({
    apiKey: env.TILOPAY_API_KEY,
    apiUser: env.TILOPAY_API_USER,
    orderId: input.orderId,
    externalOrderId: input.externalOrderId,
    amount: input.amount,
    currency: input.currency,
    responseCode: input.responseCode,
    auth: input.auth,
    email: input.email,
  });
  const digest = createHmac("sha256", signingKey).update(signingMessage).digest();

  return {
    hex: digest.toString("hex"),
    base64: digest.toString("base64"),
  };
}

export function verifyTilopayOrderHash(input: TilopayOrderHashInput): boolean {
  const expected = createTilopayOrderHash(input);
  const received = input.orderHash.trim();

  return (
    safeCompare(received.toLowerCase(), expected.hex.toLowerCase()) ||
    safeCompare(received, expected.base64)
  );
}
