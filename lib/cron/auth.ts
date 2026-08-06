import { timingSafeEqual } from "crypto";

const CRON_SECRET_HEADER = "x-cron-secret";

export type CronAuthorizationResult =
  | "AUTHORIZED"
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED";

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function timingSafeStringEquals(firstValue: string, secondValue: string): boolean {
  const firstBuffer = Buffer.from(firstValue);
  const secondBuffer = Buffer.from(secondValue);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}

export function authorizeCronRequest(request: Request): CronAuthorizationResult {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return "NOT_CONFIGURED";
  }

  const providedSecret =
    getBearerToken(request) ??
    request.headers.get(CRON_SECRET_HEADER)?.trim() ??
    "";

  if (!providedSecret) {
    return "UNAUTHORIZED";
  }

  return timingSafeStringEquals(providedSecret, expectedSecret)
    ? "AUTHORIZED"
    : "UNAUTHORIZED";
}
