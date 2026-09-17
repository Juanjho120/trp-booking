import { isGuestPaymentRequestAccessToken } from "@/lib/payments/guest-payment-request-token";

const PAYMENT_LINK_PATH_PREFIX = "/reservas/cargos";

function normalizeGuestPaymentRequestAccessToken(rawToken: string): string {
  const normalizedToken = rawToken.trim();

  if (!isGuestPaymentRequestAccessToken(normalizedToken)) {
    throw new TypeError("Invalid guest payment request access token.");
  }

  return normalizedToken;
}

export function buildGuestPaymentRequestPaymentPath(rawToken: string): string {
  const token = normalizeGuestPaymentRequestAccessToken(rawToken);
  return `${PAYMENT_LINK_PATH_PREFIX}/${encodeURIComponent(token)}`;
}
