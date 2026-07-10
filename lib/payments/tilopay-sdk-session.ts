import { prisma } from "@/lib/db/prisma";
import { getTilopayEnv } from "@/lib/env/server";
import {
  createPaymentAttemptForPendingReservation,
  PaymentAttemptCreationError,
} from "@/lib/payments/payment-attempts";
import type {
  CreateTilopaySdkSessionInput,
  TilopaySdkInitConfig,
  TilopaySdkSession,
  TilopaySdkSessionErrorCode,
} from "@/types/tilopay-sdk-session";

const TILOPAY_API_BASE_URL = "https://app.tilopay.com/api/v1";
const TILOPAY_SDK_SCRIPT_URL = "https://app.tilopay.com/sdk/v2/sdk_tpay.min.js";

const defaultBillingAddress = {
  address: "Panajachel",
  address2: "Tu Refugio Perfecto",
  city: "Panajachel",
  state: "GT-SO",
  zipPostCode: "07010",
  country: "GT",
} as const;

export class TilopaySdkSessionError extends Error {
  readonly code: TilopaySdkSessionErrorCode;

  constructor(code: TilopaySdkSessionErrorCode) {
    super(code);
    this.name = "TilopaySdkSessionError";
    this.code = code;
  }
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAccessToken(payload: unknown): string {
  if (!isJsonRecord(payload) || typeof payload.access_token !== "string") {
    throw new TilopaySdkSessionError("TILOPAY_SDK_TOKEN_UNAVAILABLE");
  }

  const accessToken = payload.access_token.trim();

  if (!accessToken) {
    throw new TilopaySdkSessionError("TILOPAY_SDK_TOKEN_UNAVAILABLE");
  }

  return accessToken;
}

async function requestTilopaySdkToken(): Promise<string> {
  const env = getTilopayEnv();

  const response = await fetch(`${TILOPAY_API_BASE_URL}/loginSdk`, {
    body: JSON.stringify({
      apiuser: env.TILOPAY_API_USER,
      password: env.TILOPAY_API_PASSWORD,
      key: env.TILOPAY_API_KEY,
    }),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new TilopaySdkSessionError("TILOPAY_SDK_TOKEN_UNAVAILABLE");
  }

  const payload = (await response.json()) as unknown;

  return getAccessToken(payload);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function splitGuestName(guestName: string): Readonly<{
  firstName: string;
  lastName: string;
}> {
  const normalizedName = normalizeText(guestName);
  const [firstName, ...lastNameParts] = normalizedName.split(" ").filter(Boolean);
  const lastName = lastNameParts.join(" ");

  return {
    firstName: firstName || "Guest",
    lastName: lastName || "Tu Refugio Perfecto",
  };
}

function normalizeCountry(value: string | null | undefined): string {
  const normalizedCountry = normalizeText(value).toUpperCase();

  return /^[A-Z]{2}$/.test(normalizedCountry) ? normalizedCountry : defaultBillingAddress.country;
}

function buildProviderReference(paymentId: string): string {
  return `TRP-${paymentId}`;
}

function buildReturnData(input: Readonly<{
  paymentId: string;
  reservationId: string;
  orderNumber: string;
  locale: "es" | "en";
}>): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64");
}

async function ensurePaymentProviderReference(
  paymentId: string,
  existingProviderReference: string | null,
): Promise<string> {
  if (existingProviderReference) {
    return existingProviderReference;
  }

  const providerReference = buildProviderReference(paymentId);

  await prisma.payment.update({
    data: {
      providerReference,
    },
    where: {
      id: paymentId,
    },
  });

  return providerReference;
}

function buildSdkInitConfig(input: Readonly<{
  token: string;
  amount: TilopaySdkSession["amount"];
  currency: TilopaySdkSession["currency"];
  locale: "es" | "en";
  orderNumber: string;
  redirectUrl: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  returnData: string;
}>): TilopaySdkInitConfig {
  const guestName = splitGuestName(input.guestName);

  return {
    token: input.token,
    currency: input.currency,
    language: input.locale,
    amount: input.amount.amount,
    billToFirstName: guestName.firstName,
    billToLastName: guestName.lastName,
    billToAddress: defaultBillingAddress.address,
    billToAddress2: defaultBillingAddress.address2,
    billToCity: defaultBillingAddress.city,
    billToState: defaultBillingAddress.state,
    billToZipPostCode: defaultBillingAddress.zipPostCode,
    billToCountry: normalizeCountry(input.guestCountry),
    billToTelephone: normalizeText(input.guestPhone),
    billToEmail: input.guestEmail,
    orderNumber: input.orderNumber,
    capture: 1,
    redirect: input.redirectUrl,
    subscription: 0,
    hashVersion: "V2",
    returnData: input.returnData,
  };
}

export async function createTilopaySdkSession(
  input: CreateTilopaySdkSessionInput,
): Promise<TilopaySdkSession> {
  let paymentAttempt: Awaited<ReturnType<typeof createPaymentAttemptForPendingReservation>>;

  try {
    paymentAttempt = await createPaymentAttemptForPendingReservation(input);
  } catch (error) {
    if (error instanceof PaymentAttemptCreationError) {
      throw new TilopaySdkSessionError(error.code);
    }

    throw error;
  }

  const payment = await prisma.payment.findUnique({
    select: {
      id: true,
      providerReference: true,
      reservation: {
        select: {
          guestCountry: true,
          guestEmail: true,
          guestName: true,
          guestPhone: true,
        },
      },
    },
    where: {
      id: paymentAttempt.id,
    },
  });

  if (!payment) {
    throw new TilopaySdkSessionError("TILOPAY_SDK_SESSION_UNEXPECTED_ERROR");
  }

  const providerReference = await ensurePaymentProviderReference(
    payment.id,
    payment.providerReference,
  );
  const token = await requestTilopaySdkToken();
  const env = getTilopayEnv();
  const returnData = buildReturnData({
    locale: input.locale,
    orderNumber: providerReference,
    paymentId: paymentAttempt.id,
    reservationId: paymentAttempt.reservationId,
  });
  const initConfig = buildSdkInitConfig({
    amount: paymentAttempt.amount,
    currency: paymentAttempt.currency,
    guestCountry: payment.reservation.guestCountry,
    guestEmail: payment.reservation.guestEmail,
    guestName: payment.reservation.guestName,
    guestPhone: payment.reservation.guestPhone,
    locale: input.locale,
    orderNumber: providerReference,
    redirectUrl: env.TILOPAY_SUCCESS_URL,
    returnData,
    token,
  });

  return {
    paymentId: paymentAttempt.id,
    reservationId: paymentAttempt.reservationId,
    provider: "TILOPAY",
    providerReference,
    paymentStatus: paymentAttempt.status,
    amount: paymentAttempt.amount,
    currency: paymentAttempt.currency,
    expiresAt: paymentAttempt.expiresAt,
    existingPaymentAttempt: paymentAttempt.existing,
    environment: env.TILOPAY_ENVIRONMENT,
    sdkScriptUrl: TILOPAY_SDK_SCRIPT_URL,
    initConfig,
    phaseBoundary: "TILOPAY_SDK_V2_CHECKOUT_FOUNDATION",
  };
}
