const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const FORBIDDEN_KEY_MARKERS = [
  "attachment",
  "attachments",
  "body",
  "content",
  "fullheaders",
  "header",
  "headers",
  "html",
  "mailbody",
  "messageid",
  "messagebody",
  "folder",
  "raw",
  "rawpayload",
  "summary",
  "thread",
] as const;
const FORBIDDEN_EXACT_KEYS = new Set(["bcc", "cc"]);
const SUBJECT_KEYS = new Set([
  "subject",
  "mailsubject",
  "emailsubject",
  "messageSubject",
].map(normalizePayloadKey));
const FROM_KEYS = new Set([
  "from",
  "fromaddress",
  "sender",
  "senderaddress",
  "mailfrom",
].map(normalizePayloadKey));
const TO_KEYS = new Set([
  "to",
  "toaddress",
  "recipient",
  "recipients",
  "mailto",
].map(normalizePayloadKey));
const RECEIVED_AT_KEYS = new Set([
  "receivedat",
  "receivedtime",
  "receiveddate",
  "sentat",
  "senttime",
  "sentdate",
  "time",
  "date",
  "timestamp",
].map(normalizePayloadKey));

export type ZohoLimitedInboundEmail = Readonly<{
  fromAddress: string;
  toAddresses: readonly string[];
  toAddress: string;
  subject: string;
  receivedAt: Date;
}>;

export type ZohoLimitedDataErrorCode =
  | "ZOHO_MAIL_FULL_CONTENT_PAYLOAD"
  | "ZOHO_MAIL_LIMITED_DATA_MALFORMED";

export class ZohoLimitedDataError extends Error {
  constructor(readonly code: ZohoLimitedDataErrorCode) {
    super(code);
    this.name = "ZohoLimitedDataError";
  }
}

function normalizePayloadKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoFullContentKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoFullContentKeys(item);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizePayloadKey(key);

    if (
      FORBIDDEN_EXACT_KEYS.has(normalizedKey) ||
      FORBIDDEN_KEY_MARKERS.some((marker) => normalizedKey.includes(marker))
    ) {
      throw new ZohoLimitedDataError("ZOHO_MAIL_FULL_CONTENT_PAYLOAD");
    }

    assertNoFullContentKeys(child);
  }
}

function findPayloadValue(
  value: unknown,
  keys: ReadonlySet<string>,
): unknown | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    if (keys.has(normalizePayloadKey(key))) {
      return child;
    }
  }

  for (const child of Object.values(value)) {
    const found = findPayloadValue(child, keys);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function extractEmailAddresses(value: unknown): string[] {
  if (typeof value === "string") {
    return Array.from(value.matchAll(EMAIL_PATTERN), ([match]) =>
      match.toLowerCase(),
    );
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractEmailAddresses(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => extractEmailAddresses(item));
  }

  return [];
}

function uniqueEmails(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.toLowerCase())));
}

function normalizeSubject(value: unknown): string {
  if (typeof value !== "string") {
    throw new ZohoLimitedDataError("ZOHO_MAIL_LIMITED_DATA_MALFORMED");
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 500);
}

function parseLimitedDataDate(value: unknown): Date {
  let candidate: Date | null = null;

  if (value instanceof Date) {
    candidate = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    candidate = new Date(value > 10_000_000_000 ? value : value * 1000);
  } else if (typeof value === "string" && value.trim()) {
    candidate = new Date(value);
  }

  if (!candidate || Number.isNaN(candidate.getTime())) {
    throw new ZohoLimitedDataError("ZOHO_MAIL_LIMITED_DATA_MALFORMED");
  }

  return candidate;
}

function normalizeBoundedToAddress(toAddresses: readonly string[]): string {
  const joined = toAddresses.join(", ");

  if (!joined || joined.length > 1000) {
    return joined.slice(0, 1000);
  }

  return joined;
}

export function parseZohoLimitedInboundEmailPayload(
  payload: unknown,
): ZohoLimitedInboundEmail {
  if (!isRecord(payload)) {
    throw new ZohoLimitedDataError("ZOHO_MAIL_LIMITED_DATA_MALFORMED");
  }

  assertNoFullContentKeys(payload);

  const fromAddress = extractEmailAddresses(
    findPayloadValue(payload, FROM_KEYS),
  )[0];
  const toAddresses = uniqueEmails(
    extractEmailAddresses(findPayloadValue(payload, TO_KEYS)),
  );

  if (!fromAddress || fromAddress.length > 320 || toAddresses.length === 0) {
    throw new ZohoLimitedDataError("ZOHO_MAIL_LIMITED_DATA_MALFORMED");
  }

  const toAddress = normalizeBoundedToAddress(toAddresses);

  if (!toAddress) {
    throw new ZohoLimitedDataError("ZOHO_MAIL_LIMITED_DATA_MALFORMED");
  }

  return {
    fromAddress,
    toAddresses,
    toAddress,
    subject: normalizeSubject(findPayloadValue(payload, SUBJECT_KEYS)),
    receivedAt: parseLimitedDataDate(findPayloadValue(payload, RECEIVED_AT_KEYS)),
  };
}
