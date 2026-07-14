import { PaymentProvider, PaymentStatus, Prisma, ReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { consultTilopayTransaction, TilopayApiClientError } from "@/lib/payments/tilopay-api-client";
import { diagnoseTilopayOrderHash } from "@/lib/payments/tilopay-order-hash";
import {
  confirmReservationAfterApprovedPayment,
  ReservationConfirmationError,
} from "@/lib/reservations/confirmation";
import type {
  ProcessedTilopayPaymentResult,
  TilopayPaymentResultErrorCode,
  TilopayRedirectParams,
  TilopayReturnData,
} from "@/types/tilopay-payment-result";

type StoredPaymentAmount = Readonly<{
  toString: () => string;
}>;

type PaymentForValidation = Readonly<{
  id: string;
  reservationId: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amount: StoredPaymentAmount;
  currency: string;
  reservation: Readonly<{
    guestEmail: string;
    status: ReservationStatus;
  }>;
}>;

type OrderHashValidationStatus = "valid" | "invalid";

export class TilopayPaymentResultError extends Error {
  readonly code: TilopayPaymentResultErrorCode;
  readonly paymentId?: string;
  readonly reservationId?: string;

  constructor(
    code: TilopayPaymentResultErrorCode,
    options: Readonly<{
      paymentId?: string;
      reservationId?: string;
    }> = {},
  ) {
    super(code);
    this.name = "TilopayPaymentResultError";
    this.code = code;
    this.paymentId = options.paymentId;
    this.reservationId = options.reservationId;
  }
}

function getSearchParam(searchParams: URLSearchParams, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

function parseRedirectParams(requestUrl: string): TilopayRedirectParams {
  const url = new URL(requestUrl);
  const searchParams = url.searchParams;

  return {
    responseCode: getSearchParam(searchParams, ["responseCode", "code"]),
    description: getSearchParam(searchParams, ["description", "message"]),
    auth: getSearchParam(searchParams, ["auth"]),
    orderNumber: getSearchParam(searchParams, ["external_order_id", "order", "orderNumber"]),
    transactionId: getSearchParam(searchParams, ["orderId", "tpt", "tilopay-transaction"]),
    orderHash: getSearchParam(searchParams, ["OrderHash", "orderHash"]),
    returnData: getSearchParam(searchParams, ["returnData"]),
    amount: getSearchParam(searchParams, ["amount"]),
    currency: getSearchParam(searchParams, ["currency"]),
    email: getSearchParam(searchParams, ["email", "billToEmail"]),
    formUpdate: getSearchParam(searchParams, ["form_update"]),
  };
}

function decodeReturnData(value: string | null): TilopayReturnData | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    return {
      paymentId: typeof record.paymentId === "string" ? record.paymentId : undefined,
      reservationId: typeof record.reservationId === "string" ? record.reservationId : undefined,
      orderNumber: typeof record.orderNumber === "string" ? record.orderNumber : undefined,
      locale: record.locale === "en" || record.locale === "es" ? record.locale : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeAmount(value: string | StoredPaymentAmount | null): string | null {
  if (!value) {
    return null;
  }

  const stringValue = typeof value === "string" ? value : value.toString();
  const numericValue = Number(stringValue);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue.toFixed(2);
}

function toAmountCents(value: string | StoredPaymentAmount | null): number | null {
  const normalizedAmount = normalizeAmount(value);

  if (!normalizedAmount) {
    return null;
  }

  const amountCents = Math.round(Number(normalizedAmount) * 100);

  return Number.isSafeInteger(amountCents) ? amountCents : null;
}

function isApprovedResponseCode(value: string | null): boolean {
  return value === "1" || value === "00";
}

function toInputJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | null {
  return value ? JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue : null;
}

function buildRawPayload(input: Readonly<{
  redirect: TilopayRedirectParams;
  consult: Record<string, unknown> | null;
  validation: Record<string, unknown>;
}>): Prisma.InputJsonObject {
  return {
    provider: "TILOPAY",
    source: "redirect_consult_orderhash_v2",
    redirect: {
      responseCode: input.redirect.responseCode,
      description: input.redirect.description,
      auth: input.redirect.auth,
      orderNumber: input.redirect.orderNumber,
      transactionId: input.redirect.transactionId,
      orderHashReceived: Boolean(input.redirect.orderHash),
      returnDataReceived: Boolean(input.redirect.returnData),
      amount: input.redirect.amount,
      currency: input.redirect.currency,
      email: input.redirect.email,
      formUpdate: input.redirect.formUpdate,
    },
    consult: toInputJson(input.consult),
    validation: toInputJson(input.validation),
  };
}

function buildProviderReferenceCandidates(value: string | null | undefined): string[] {
  const rawValue = value?.trim();

  if (!rawValue) {
    return [];
  }

  const matches = rawValue.match(/TRP-[A-Za-z0-9]+/g) ?? [];

  return Array.from(new Set([rawValue, ...matches]));
}

async function findPaymentByProviderReferences(
  providerReferences: readonly string[],
): Promise<PaymentForValidation | null> {
  if (providerReferences.length === 0) {
    return null;
  }

  return prisma.payment.findFirst({
    where: {
      provider: PaymentProvider.TILOPAY,
      providerReference: {
        in: [...providerReferences],
      },
    },
    select: {
      id: true,
      reservationId: true,
      providerReference: true,
      providerTransactionId: true,
      status: true,
      amount: true,
      currency: true,
      reservation: {
        select: {
          guestEmail: true,
          status: true,
        },
      },
    },
  });
}

async function markPaymentFailed(
  payment: PaymentForValidation,
  input: Readonly<{
    code: TilopayPaymentResultErrorCode;
    redirect: TilopayRedirectParams;
    consult: Record<string, unknown> | null;
    transactionId: string | null;
    validation?: Record<string, unknown>;
  }>,
): Promise<never> {
  await prisma.payment.update({
    data: {
      failedAt: new Date(),
      providerTransactionId: input.transactionId,
      rawPayload: buildRawPayload({
        redirect: input.redirect,
        consult: input.consult,
        validation: {
          status: "FAILED",
          code: input.code,
          reservationConfirmation: "not_attempted",
          ...(input.validation ?? {}),
        },
      }),
      status: PaymentStatus.FAILED,
    },
    where: {
      id: payment.id,
    },
  });

  throw new TilopayPaymentResultError(input.code, {
    paymentId: payment.id,
    reservationId: payment.reservationId,
  });
}

function providerOrderNumberMatches(input: Readonly<{
  providerOrderNumber: string;
  providerReference: string;
}>): boolean {
  const providerOrderNumber = input.providerOrderNumber.trim();
  const providerReference = input.providerReference.trim();

  return (
    providerOrderNumber === providerReference ||
    providerOrderNumber.endsWith(`-${providerReference}`)
  );
}

function assertConsultMatchesPayment(input: Readonly<{
  payment: PaymentForValidation;
  redirect: TilopayRedirectParams;
  consultAmount: string | null;
  consultCurrency: string | null;
  consultOrderNumber: string | null;
  consultEmail: string | null;
}>): void {
  const providerAmount = input.consultAmount ?? input.redirect.amount;

  if (providerAmount) {
    const paymentAmountCents = toAmountCents(input.payment.amount);
    const providerAmountCents = toAmountCents(providerAmount);

    if (
      paymentAmountCents === null ||
      providerAmountCents === null ||
      paymentAmountCents !== providerAmountCents
    ) {
      throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
        paymentId: input.payment.id,
        reservationId: input.payment.reservationId,
      });
    }
  }

  const providerCurrency = input.consultCurrency ?? input.redirect.currency;

  if (providerCurrency && providerCurrency !== input.payment.currency) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }

  const providerOrderNumber = input.consultOrderNumber ?? input.redirect.orderNumber;

  if (
    providerOrderNumber &&
    input.payment.providerReference &&
    !providerOrderNumberMatches({
      providerOrderNumber,
      providerReference: input.payment.providerReference,
    })
  ) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }

  if (
    input.consultEmail &&
    input.consultEmail.toLowerCase() !== input.payment.reservation.guestEmail.toLowerCase()
  ) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }
}

async function mapExistingResult(
  payment: PaymentForValidation,
): Promise<ProcessedTilopayPaymentResult | null> {
  if (payment.status === PaymentStatus.APPROVED) {
    const confirmedReservation = await confirmReservationAfterApprovedPayment(payment.id);

    return {
      paymentId: payment.id,
      reservationId: payment.reservationId,
      providerReference: payment.providerReference ?? "",
      providerTransactionId: payment.providerTransactionId,
      paymentStatus: "APPROVED",
      reservationStatus: confirmedReservation.reservationStatus,
      reservationConfirmed: true,
      redirectTarget: "success",
      phaseBoundary: "PAYMENT_VALIDATED_RESERVATION_CONFIRMED",
    };
  }

  return null;
}

async function confirmReservationForApprovedPayment(input: Readonly<{
  paymentId: string;
  payment: PaymentForValidation;
  redirect: TilopayRedirectParams;
  consult: Record<string, unknown>;
  transactionId: string;
  orderHashValidation: OrderHashValidationStatus;
  orderHashMatchedVariant: string | null;
  orderHashAttemptedVariants: readonly string[];
}>): Promise<Readonly<{
  reservationStatus: ProcessedTilopayPaymentResult["reservationStatus"];
  reservationConfirmed: boolean;
  phaseBoundary: ProcessedTilopayPaymentResult["phaseBoundary"];
}>> {
  try {
    const confirmedReservation = await confirmReservationAfterApprovedPayment(input.paymentId);

    return {
      reservationStatus: confirmedReservation.reservationStatus,
      reservationConfirmed: true,
      phaseBoundary: "PAYMENT_VALIDATED_RESERVATION_CONFIRMED",
    };
  } catch (error) {
    if (error instanceof ReservationConfirmationError) {
      await prisma.payment.update({
        data: {
          rawPayload: buildRawPayload({
            redirect: input.redirect,
            consult: input.consult,
            validation: {
              status: "APPROVED",
              amountMatched: true,
              currencyMatched: true,
              orderHash: input.orderHashValidation,
              orderHashMatchedVariant: input.orderHashMatchedVariant,
              orderHashAttemptedVariants: input.orderHashAttemptedVariants,
              reservationConfirmation: "failed",
              reservationConfirmationErrorCode: error.code,
            },
          }),
        },
        where: {
          id: input.payment.id,
        },
      });

      throw new TilopayPaymentResultError("RESERVATION_CONFIRMATION_FAILED", {
        paymentId: input.payment.id,
        reservationId: input.payment.reservationId,
      });
    }

    throw error;
  }
}

export async function processTilopayPaymentRedirect(
  requestUrl: string,
): Promise<ProcessedTilopayPaymentResult> {
  const redirect = parseRedirectParams(requestUrl);
  const returnData = decodeReturnData(redirect.returnData);
  const providerReferenceCandidates = [
    ...buildProviderReferenceCandidates(redirect.orderNumber),
    ...buildProviderReferenceCandidates(returnData?.orderNumber),
  ];

  if (providerReferenceCandidates.length === 0) {
    throw new TilopayPaymentResultError("INVALID_TILOPAY_REDIRECT_REQUEST");
  }

  const payment = await findPaymentByProviderReferences(providerReferenceCandidates);

  if (!payment || !payment.providerReference) {
    throw new TilopayPaymentResultError("TILOPAY_PAYMENT_NOT_FOUND");
  }

  const providerReference = payment.providerReference;

  const existingResult = await mapExistingResult(payment);

  if (existingResult) {
    return existingResult;
  }

  let consult;

  try {
    consult = await consultTilopayTransaction(providerReference);
  } catch (error) {
    if (error instanceof TilopayApiClientError) {
      await markPaymentFailed(payment, {
        code: "TILOPAY_CONSULT_UNAVAILABLE",
        redirect,
        consult: null,
        transactionId: redirect.transactionId,
      });
    }

    throw error;
  }

  try {
    assertConsultMatchesPayment({
      payment,
      redirect,
      consultAmount: consult.amount,
      consultCurrency: consult.currency,
      consultEmail: consult.email,
      consultOrderNumber: consult.orderNumber,
    });
  } catch (error) {
    if (error instanceof TilopayPaymentResultError) {
      await markPaymentFailed(payment, {
        code: error.code,
        redirect,
        consult: consult.rawPayload,
        transactionId: redirect.transactionId ?? consult.transactionId,
      });
    }

    throw error;
  }

  const responseCode = redirect.responseCode ?? consult.responseCode;
  const transactionId = redirect.transactionId ?? consult.transactionId;
  const amount = normalizeAmount(consult.amount ?? redirect.amount ?? payment.amount);
  const currency = consult.currency ?? redirect.currency ?? payment.currency;
  const email = consult.email ?? redirect.email ?? payment.reservation.guestEmail;
  const auth = redirect.auth ?? consult.auth ?? "";
  const orderHash = redirect.orderHash;

  if (!orderHash || !transactionId || !responseCode || !amount || !currency || !email) {
    await markPaymentFailed(payment, {
      code: "TILOPAY_ORDER_HASH_INVALID",
      redirect,
      consult: consult.rawPayload,
      transactionId,
    });
  }

  const orderHashValue = orderHash as string;
  const transactionIdValue = transactionId as string;
  const responseCodeValue = responseCode as string;
  const amountValue = amount as string;
  const currencyValue = currency as string;
  const emailValue = email as string;

  const orderHashDiagnosis = diagnoseTilopayOrderHash({
    orderHash: orderHashValue,
    orderId: transactionIdValue,
    externalOrderIds: [
      {
        name: "payment_provider_reference",
        externalOrderId: providerReference,
      },
      {
        name: "redirect_order_number",
        externalOrderId: redirect.orderNumber,
      },
      {
        name: "consult_order_number",
        externalOrderId: consult.orderNumber,
      },
    ],
    amount: amountValue,
    currency: currencyValue,
    responseCode: responseCodeValue,
    auth,
    email: emailValue,
  });

  const orderHashValidation: OrderHashValidationStatus = orderHashDiagnosis.valid ? "valid" : "invalid";

  if (!orderHashDiagnosis.valid) {
    await markPaymentFailed(payment, {
      code: "TILOPAY_ORDER_HASH_INVALID",
      redirect,
      consult: consult.rawPayload,
      transactionId: transactionIdValue,
      validation: {
        orderHash: orderHashValidation,
        orderHashMatchedVariant: orderHashDiagnosis.matchedVariant,
        orderHashAttemptedVariants: orderHashDiagnosis.attemptedVariants,
      },
    });
  }

  const paymentApproved = isApprovedResponseCode(responseCode);
  const nextStatus = paymentApproved ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;
  const updatedPayment = await prisma.payment.update({
    data: {
      failedAt: paymentApproved ? null : new Date(),
      paidAt: paymentApproved ? new Date() : null,
      providerTransactionId: transactionIdValue,
      rawPayload: buildRawPayload({
        redirect,
        consult: consult.rawPayload,
        validation: {
          status: nextStatus,
          amountMatched: true,
          currencyMatched: true,
          providerOrderNumberMatched: true,
          consultOrderNumber: consult.orderNumber,
          orderHash: orderHashValidation,
          orderHashMatchedVariant: orderHashDiagnosis.matchedVariant,
          orderHashAttemptedVariants: orderHashDiagnosis.attemptedVariants,
          reservationConfirmation: paymentApproved
            ? "pending_phase_9_6_transition"
            : "not_attempted",
        },
      }),
      status: nextStatus,
    },
    where: {
      id: payment.id,
    },
    select: {
      id: true,
      reservationId: true,
      providerReference: true,
      providerTransactionId: true,
      status: true,
    },
  });

  if (updatedPayment.status === PaymentStatus.APPROVED) {
    const confirmation = await confirmReservationForApprovedPayment({
      paymentId: updatedPayment.id,
      payment,
      redirect,
      consult: consult.rawPayload,
      transactionId: transactionIdValue,
      orderHashValidation,
      orderHashMatchedVariant: orderHashDiagnosis.matchedVariant,
      orderHashAttemptedVariants: orderHashDiagnosis.attemptedVariants,
    });

    return {
      paymentId: updatedPayment.id,
      reservationId: updatedPayment.reservationId,
      providerReference: updatedPayment.providerReference ?? providerReference,
      providerTransactionId: updatedPayment.providerTransactionId,
      paymentStatus: "APPROVED",
      reservationStatus: confirmation.reservationStatus,
      reservationConfirmed: confirmation.reservationConfirmed,
      redirectTarget: "success",
      phaseBoundary: confirmation.phaseBoundary,
    };
  }

  return {
    paymentId: updatedPayment.id,
    reservationId: updatedPayment.reservationId,
    providerReference: updatedPayment.providerReference ?? providerReference,
    providerTransactionId: updatedPayment.providerTransactionId,
    paymentStatus: "REJECTED",
    reservationStatus: payment.reservation.status,
    reservationConfirmed: payment.reservation.status === ReservationStatus.CONFIRMED,
    redirectTarget: "cancel",
    phaseBoundary: "PAYMENT_VALIDATED_RESERVATION_NOT_CONFIRMED",
  };
}
