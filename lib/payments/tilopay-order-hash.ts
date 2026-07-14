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

export type TilopayOrderHashCandidate = Readonly<{
  name: string;
  externalOrderId: string | null | undefined;
}>;

export type TilopayOrderHashDiagnosis = Readonly<{
  valid: boolean;
  matchedVariant: string | null;
  attemptedVariants: readonly string[];
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
  const params = new URLSearchParams();

  params.append("api_Key", input.apiKey);
  params.append("api_user", input.apiUser);
  params.append("orderId", input.orderId);
  params.append("external_orden_id", input.externalOrderId);
  params.append("amount", input.amount);
  params.append("currency", input.currency);
  params.append("responseCode", input.responseCode);
  params.append("auth", input.auth);
  params.append("email", input.email);

  return params.toString();
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeCandidate(candidate: TilopayOrderHashCandidate): TilopayOrderHashCandidate | null {
  const externalOrderId = candidate.externalOrderId?.trim();

  if (!externalOrderId) {
    return null;
  }

  return {
    name: candidate.name,
    externalOrderId,
  };
}

function uniqueCandidates(
  candidates: readonly TilopayOrderHashCandidate[],
): TilopayOrderHashCandidate[] {
  const seen = new Set<string>();
  const result: TilopayOrderHashCandidate[] = [];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeCandidate(candidate);

    if (!normalizedCandidate || seen.has(normalizedCandidate.externalOrderId ?? "")) {
      continue;
    }

    seen.add(normalizedCandidate.externalOrderId ?? "");
    result.push(normalizedCandidate);
  }

  return result;
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

export function diagnoseTilopayOrderHash(input: Readonly<{
  orderHash: string;
  orderId: string;
  externalOrderIds: readonly TilopayOrderHashCandidate[];
  amount: string;
  currency: string;
  responseCode: string;
  auth: string;
  email: string;
}>): TilopayOrderHashDiagnosis {
  const received = input.orderHash.trim();
  const candidates = uniqueCandidates(input.externalOrderIds);
  const attemptedVariants = candidates.map((candidate) => candidate.name);

  for (const candidate of candidates) {
    const expected = createTilopayOrderHash({
      orderHash: input.orderHash,
      orderId: input.orderId,
      externalOrderId: candidate.externalOrderId ?? "",
      amount: input.amount,
      currency: input.currency,
      responseCode: input.responseCode,
      auth: input.auth,
      email: input.email,
    });

    if (safeCompare(received.toLowerCase(), expected.hex.toLowerCase())) {
      return {
        valid: true,
        matchedVariant: candidate.name,
        attemptedVariants,
      };
    }
  }

  return {
    valid: false,
    matchedVariant: null,
    attemptedVariants,
  };
}

export function verifyTilopayOrderHash(input: TilopayOrderHashInput): boolean {
  return diagnoseTilopayOrderHash({
    orderHash: input.orderHash,
    orderId: input.orderId,
    externalOrderIds: [
      {
        name: "external_order_id",
        externalOrderId: input.externalOrderId,
      },
    ],
    amount: input.amount,
    currency: input.currency,
    responseCode: input.responseCode,
    auth: input.auth,
    email: input.email,
  }).valid;
}
