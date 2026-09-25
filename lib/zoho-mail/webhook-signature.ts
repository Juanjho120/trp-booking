import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function asNonEmptyString(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function createZohoMailWebhookSignature(
  rawBody: string,
  hookSecret: string,
): string {
  return createHmac("sha256", hookSecret).update(rawBody, "utf8").digest("base64");
}

export function verifyZohoMailWebhookSignature(
  input: Readonly<{
    rawBody: string;
    hookSecret: string;
    signatureHeader: string | null | undefined;
  }>,
): boolean {
  const signatureHeader = asNonEmptyString(input.signatureHeader);

  if (!signatureHeader) {
    return false;
  }

  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }

  const expected = createHmac("sha256", input.hookSecret)
    .update(input.rawBody, "utf8")
    .digest();

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function constantTimeEqualString(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = asNonEmptyString(left);
  const normalizedRight = asNonEmptyString(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  const leftDigest = createHash("sha256").update(normalizedLeft, "utf8").digest();
  const rightDigest = createHash("sha256").update(normalizedRight, "utf8").digest();

  return timingSafeEqual(leftDigest, rightDigest);
}
