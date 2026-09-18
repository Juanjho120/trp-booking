import {
  AdditionalChargeStatus,
  EmailNotificationStatus,
  EmailNotificationType,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundAuthorizationType,
  RefundStatus,
  ReservationStatus,
} from "@prisma/client";

import {
  buildAdditionalChargeAdminPaymentApprovedEmail,
  buildAdditionalChargeAdminPaymentRequiredEmail,
  buildAdditionalChargeAdminRefundProcessedEmail,
  buildAdditionalChargePaymentApprovedEmail,
  buildAdditionalChargePaymentRequiredEmail,
  buildAdditionalChargeRefundProcessedEmail,
  EmailTemplateDataError,
} from "@/emails";
import { prisma } from "@/lib/db/prisma";
import { getEmailEnv } from "@/lib/env/server";
import {
  additionalChargeNotificationTypeValues,
  buildAdditionalChargePaymentRequiredNotificationKey,
  createAdditionalChargePaymentRequiredNotificationIntent,
} from "@/lib/email/additional-charge-notification-intents";
import { buildGuestPaymentRequestPaymentPath } from "@/lib/payments/guest-payment-request-link";
import {
  decryptGuestPaymentRequestAccessToken,
  hashGuestPaymentRequestAccessToken,
} from "@/lib/payments/guest-payment-request-token";
import type { AdditionalChargeCategory } from "@/types/additional-charge";
import type {
  AdditionalChargeAdminPaymentApprovedEmailTemplateInput,
  AdditionalChargeAdminPaymentRequiredEmailTemplateInput,
  AdditionalChargeAdminRefundProcessedEmailTemplateInput,
  AdditionalChargePaymentApprovedEmailTemplateInput,
  AdditionalChargePaymentRequiredEmailTemplateInput,
  AdditionalChargeRefundProcessedEmailTemplateInput,
} from "@/types/additional-charge-email-template";
import type { EmailProvider } from "@/types/email-provider";
import type {
  ClaimedEmailNotificationDeliveryOutcome,
  EmailNotificationClaim,
  EmailNotificationDeliveryErrorCode,
  ImmediateEmailDeliverySummary,
} from "@/types/email-notification";
import type { TransactionalEmailContent } from "@/types/email-template";

import { EmailProviderError } from "./provider";
import { createResendEmailProvider } from "./resend-provider";
import {
  calculateNextEmailNotificationAttemptAt,
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
} from "./retry-policy";

const notificationTypeValues = additionalChargeNotificationTypeValues;
const TRP_CURRENCY = "USD";
const completedRefundStatuses = [RefundStatus.APPROVED, RefundStatus.MANUAL] as const;

type DeliveryErrorCode =
  | EmailNotificationDeliveryErrorCode
  | "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED";

const SAFE_ERROR_MESSAGES = {
  EMAIL_PROVIDER_DISABLED: "Email delivery is disabled.",
  EMAIL_PROVIDER_CONFIGURATION_ERROR:
    "Email provider configuration is invalid.",
  EMAIL_PROVIDER_INVALID_REQUEST: "The email request is invalid.",
  EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT:
    "The email idempotency request conflicts with a previous request.",
  EMAIL_PROVIDER_RATE_LIMITED: "The email provider rate limit was reached.",
  EMAIL_PROVIDER_TEMPORARY_FAILURE:
    "The email provider is temporarily unavailable.",
  EMAIL_PROVIDER_REJECTED: "The email provider rejected the request.",
  EMAIL_PROVIDER_UNEXPECTED_ERROR:
    "The email provider returned an unexpected error.",
  EMAIL_TEMPLATE_INVALID_DATA: "The email template data is invalid.",
  EMAIL_NOTIFICATION_DATA_INCOMPLETE:
    "The email notification data is incomplete.",
  EMAIL_NOTIFICATION_UNSUPPORTED_TYPE:
    "The email notification type is not supported by this dispatcher.",
  EMAIL_NOTIFICATION_RETRY_LIMIT_REACHED:
    "The email notification reached the maximum delivery attempt count.",
  EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED:
    "Arrival instructions were superseded before delivery.",
  EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED:
    "Arrival instructions are no longer enabled for this accommodation.",
  EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED:
    "The additional-charge payment evidence is no longer deliverable.",
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
} as const satisfies Readonly<Record<DeliveryErrorCode, string>>;

class AdditionalChargePaymentEmailDeliveryError extends Error {
  constructor(
    readonly code: DeliveryErrorCode,
    readonly retryable: boolean,
  ) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = "AdditionalChargePaymentEmailDeliveryError";
  }
}

type ImmediateOptions = Readonly<{
  source?: NodeJS.ProcessEnv;
  provider?: EmailProvider;
  now?: () => Date;
}>;

export type AdditionalChargePaymentRequestEmailEligibilityRecord = Readonly<{
  id: string;
  reservationId: string;
  status: GuestPaymentRequestStatus;
  totalAmount: Prisma.Decimal;
  currency: string;
  accessTokenHash: string;
  accessTokenEncrypted: string;
  expiresAt: Date;
  reservation: Readonly<{
    id: string;
    status: ReservationStatus;
    confirmedAt: Date | null;
  }>;
  items: readonly Readonly<{
    additionalChargeId: string;
    categorySnapshot: string;
    descriptionSnapshot: string;
    amountSnapshot: Prisma.Decimal;
    currencySnapshot: string;
    additionalCharge: Readonly<{
      id: string;
      reservationId: string;
      status: AdditionalChargeStatus;
      amount: Prisma.Decimal;
      currency: string;
    }>;
  }>[];
  payment: Readonly<{
    purpose: PaymentPurpose;
    status: PaymentStatus;
    amount: Prisma.Decimal;
    currency: string;
  }> | null;
}>;

const claimedSelect = {
  id: true,
  reservationId: true,
  guestPaymentRequestId: true,
  refundId: true,
  type: true,
  recipient: true,
  locale: true,
  deduplicationKey: true,
  attemptCount: true,
  guestPaymentRequest: {
    select: {
      id: true,
      reservationId: true,
      status: true,
      totalAmount: true,
      currency: true,
      accessTokenHash: true,
      accessTokenEncrypted: true,
      expiresAt: true,
      paidAt: true,
      createdAt: true,
      createdByAdmin: {
        select: {
          name: true,
          email: true,
        },
      },
      reservation: {
        select: {
          id: true,
          status: true,
          confirmedAt: true,
          guestName: true,
          guestEmail: true,
          preferredLocale: true,
          currency: true,
          property: {
            select: {
              nameEs: true,
              nameEn: true,
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          additionalChargeId: true,
          categorySnapshot: true,
          descriptionSnapshot: true,
          amountSnapshot: true,
          currencySnapshot: true,
          additionalCharge: {
            select: {
              id: true,
              reservationId: true,
              status: true,
              amount: true,
              currency: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
      payment: {
        select: {
          id: true,
          purpose: true,
          status: true,
          amount: true,
          currency: true,
          providerReference: true,
          paidAt: true,
        },
      },
    },
  },
  refund: {
    select: {
      id: true,
      paymentId: true,
      authorizationType: true,
      status: true,
      amount: true,
      currency: true,
      processingMode: true,
      providerRefundId: true,
      reason: true,
      approvedAt: true,
      requestedByAdmin: {
        select: {
          name: true,
          email: true,
        },
      },
      payment: {
        select: {
          id: true,
          purpose: true,
          status: true,
          amount: true,
          currency: true,
          guestPaymentRequestId: true,
          reservationId: true,
        },
      },
      additionalChargeAllocations: {
        select: {
          additionalChargeId: true,
          allocatedAmount: true,
          additionalCharge: {
            select: {
              id: true,
              category: true,
              description: true,
              amount: true,
              currency: true,
              status: true,
              refundAllocations: {
                where: {
                  refund: {
                    authorizationType: RefundAuthorizationType.ADDITIONAL_CHARGE,
                    status: { in: [...completedRefundStatuses] },
                  },
                },
                select: {
                  allocatedAmount: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type ClaimedNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof claimedSelect;
}>;

export function isAdditionalChargePaymentNotificationType(
  value: EmailNotificationType,
): boolean {
  return (notificationTypeValues as readonly EmailNotificationType[]).includes(
    value,
  );
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function assertRequestIntegrity(
  request: AdditionalChargePaymentRequestEmailEligibilityRecord,
): void {
  if (
    request.currency !== TRP_CURRENCY ||
    request.items.length === 0 ||
    request.totalAmount.lessThanOrEqualTo(0)
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  const itemTotal = request.items.reduce(
    (total, item) => total.add(item.amountSnapshot),
    new Prisma.Decimal(0),
  );

  if (itemTotal.comparedTo(request.totalAmount) !== 0) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  for (const item of request.items) {
    if (
      item.additionalCharge.id !== item.additionalChargeId ||
      item.additionalCharge.reservationId !== request.reservationId ||
      item.additionalCharge.status !== AdditionalChargeStatus.PENDING ||
      item.additionalCharge.currency !== request.currency ||
      item.additionalCharge.amount.comparedTo(item.amountSnapshot) !== 0 ||
      item.currencySnapshot !== request.currency ||
      item.amountSnapshot.lessThanOrEqualTo(0)
    ) {
      throw new AdditionalChargePaymentEmailDeliveryError(
        "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
        false,
      );
    }
  }

  if (
    request.payment &&
    (request.payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
      request.payment.currency !== request.currency ||
      request.payment.amount.comparedTo(request.totalAmount) !== 0 ||
      request.payment.status === PaymentStatus.APPROVED ||
      request.payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
      request.payment.status === PaymentStatus.REFUNDED)
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }
}

export function validateAdditionalChargePaymentRequestEmailEligibility(
  request: AdditionalChargePaymentRequestEmailEligibilityRecord,
  now: Date,
): string {
  if (
    request.reservation.id !== request.reservationId ||
    !request.reservation.confirmedAt ||
    (request.reservation.status !== ReservationStatus.CONFIRMED &&
      request.reservation.status !== ReservationStatus.CANCELLED) ||
    request.status !== GuestPaymentRequestStatus.PENDING ||
    request.expiresAt <= now
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  assertRequestIntegrity(request);

  let rawToken: string;

  try {
    rawToken = decryptGuestPaymentRequestAccessToken(
      request.reservationId,
      request.accessTokenEncrypted,
    );
    if (
      hashGuestPaymentRequestAccessToken(rawToken) !== request.accessTokenHash
    ) {
      throw new Error("Guest payment request token hash mismatch");
    }
  } catch {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  return rawToken;
}

async function expireOverdueRequest(
  request: AdditionalChargePaymentRequestEmailEligibilityRecord,
  now: Date,
): Promise<void> {
  if (
    request.status === GuestPaymentRequestStatus.PENDING &&
    request.expiresAt <= now
  ) {
    await prisma.guestPaymentRequest.updateMany({
      where: {
        id: request.id,
        status: GuestPaymentRequestStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: GuestPaymentRequestStatus.EXPIRED,
      },
    });
  }
}

async function readClaimed(
  claim: EmailNotificationClaim,
): Promise<ClaimedNotification | null> {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      type: { in: [...notificationTypeValues] },
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: claimedSelect,
  });
}

async function claimPending(
  notificationId: string,
  processingStartedAt: Date,
): Promise<EmailNotificationClaim | null> {
  const candidate = await prisma.emailNotification.findFirst({
    where: {
      id: notificationId,
      type: { in: [...notificationTypeValues] },
      status: EmailNotificationStatus.PENDING,
      manualResends: { none: {} },
      attemptCount: { lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: processingStartedAt } },
      ],
    },
    select: { updatedAt: true },
  });

  if (!candidate) return null;

  const updated = await prisma.emailNotification.updateMany({
    where: {
      id: notificationId,
      updatedAt: candidate.updatedAt,
      status: EmailNotificationStatus.PENDING,
      manualResends: { none: {} },
      attemptCount: { lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: processingStartedAt } },
      ],
    },
    data: {
      status: EmailNotificationStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastAttemptAt: processingStartedAt,
      processingStartedAt,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  return updated.count === 1
    ? { notificationId, processingStartedAt }
    : null;
}

function buildPaymentUrl(rawToken: string, publicBaseUrl: string): string {
  return new URL(
    buildGuestPaymentRequestPaymentPath(rawToken),
    publicBaseUrl,
  ).toString();
}

function reservationInput(request: NonNullable<ClaimedNotification["guestPaymentRequest"]>) {
  return {
    id: request.reservation.id,
    guestName: request.reservation.guestName,
    guestEmail: request.reservation.guestEmail,
    preferredLocale: normalizeLocale(request.reservation.preferredLocale),
    propertyNameEs: request.reservation.property.nameEs,
    propertyNameEn: request.reservation.property.nameEn,
    currency: request.reservation.currency,
  } as const;
}

function requestItems(
  request: NonNullable<ClaimedNotification["guestPaymentRequest"]>,
) {
  return request.items.map((item) => ({
    category: item.categorySnapshot as AdditionalChargeCategory,
    description: item.descriptionSnapshot,
    amount: item.amountSnapshot.toFixed(2),
    currency: item.currencySnapshot,
    status: item.additionalCharge.status,
  }));
}

function assertNotificationRequest(
  notification: ClaimedNotification,
) {
  const request = notification.guestPaymentRequest;

  if (
    !request ||
    !notification.guestPaymentRequestId ||
    notification.guestPaymentRequestId !== request.id ||
    notification.reservationId !== request.reservationId
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  return request;
}

async function buildPendingGuestContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
  now: Date,
): Promise<TransactionalEmailContent> {
  const request = assertNotificationRequest(notification);

  await expireOverdueRequest(request, now);
  const rawToken = validateAdditionalChargePaymentRequestEmailEligibility(
    request,
    now,
  );
  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargePaymentRequiredEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: reservationInput(request),
    paymentRequest: {
      id: request.id,
      totalAmount: request.totalAmount.toFixed(2),
      currency: request.currency,
      expiresAt: request.expiresAt.toISOString(),
      paymentUrl: buildPaymentUrl(rawToken, publicBaseUrl),
      items: requestItems(request),
    },
  };

  return buildAdditionalChargePaymentRequiredEmail(input);
}

async function buildPendingAdminContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const request = assertNotificationRequest(notification);
  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargeAdminPaymentRequiredEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: {
      ...reservationInput(request),
      preferredLocale: locale,
    },
    paymentRequest: {
      id: request.id,
      totalAmount: request.totalAmount.toFixed(2),
      currency: request.currency,
      createdAt: request.createdAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
      status: request.status,
      createdByAdminName: request.createdByAdmin.name,
      createdByAdminEmail: request.createdByAdmin.email,
      intendedGuestRecipient: request.reservation.guestEmail,
      items: requestItems(request),
    },
  };

  return buildAdditionalChargeAdminPaymentRequiredEmail(input);
}

async function buildPaymentApprovedGuestContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const request = assertNotificationRequest(notification);
  const payment = request.payment;

  if (
    request.status !== GuestPaymentRequestStatus.PAID ||
    !request.paidAt ||
    !payment ||
    payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    payment.currency !== request.currency ||
    payment.amount.comparedTo(request.totalAmount) !== 0
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargePaymentApprovedEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: reservationInput(request),
    payment: {
      paidAt: (payment.paidAt ?? request.paidAt).toISOString(),
      totalAmount: request.totalAmount.toFixed(2),
      currency: request.currency,
      items: requestItems(request),
    },
  };

  return buildAdditionalChargePaymentApprovedEmail(input);
}

async function buildPaymentApprovedAdminContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const request = assertNotificationRequest(notification);
  const payment = request.payment;

  if (
    request.status !== GuestPaymentRequestStatus.PAID ||
    !request.paidAt ||
    !payment ||
    payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    payment.currency !== request.currency ||
    payment.amount.comparedTo(request.totalAmount) !== 0
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargeAdminPaymentApprovedEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: {
      ...reservationInput(request),
      preferredLocale: locale,
    },
    paymentRequest: {
      id: request.id,
      status: request.status,
    },
    payment: {
      id: payment.id,
      providerReference: payment.providerReference,
      paidAt: (payment.paidAt ?? request.paidAt).toISOString(),
      status: payment.status,
      totalAmount: request.totalAmount.toFixed(2),
      currency: request.currency,
      items: requestItems(request),
    },
  };

  return buildAdditionalChargeAdminPaymentApprovedEmail(input);
}

function refundAllocations(refund: NonNullable<ClaimedNotification["refund"]>) {
  return refund.additionalChargeAllocations.map((allocation) => {
    const approvedTotal = allocation.additionalCharge.refundAllocations.reduce(
      (total, approvedAllocation) =>
        total.add(approvedAllocation.allocatedAmount),
      new Prisma.Decimal(0),
    );
    const remaining = allocation.additionalCharge.amount.sub(approvedTotal);

    return {
      additionalChargeId: allocation.additionalChargeId,
      category: allocation.additionalCharge.category,
      description: allocation.additionalCharge.description,
      originalAmount: allocation.additionalCharge.amount.toFixed(2),
      allocatedAmount: allocation.allocatedAmount.toFixed(2),
      cumulativeRefundedAmount: approvedTotal.toFixed(2),
      remainingAmount: remaining.greaterThan(0) ? remaining.toFixed(2) : "0.00",
      currency: allocation.additionalCharge.currency,
      resultingStatus: allocation.additionalCharge.status,
    };
  });
}

function assertRefundNotification(
  notification: ClaimedNotification,
) {
  const request = assertNotificationRequest(notification);
  const refund = notification.refund;

  if (
    !refund ||
    !notification.refundId ||
    notification.refundId !== refund.id ||
    refund.authorizationType !== RefundAuthorizationType.ADDITIONAL_CHARGE ||
    refund.status !== RefundStatus.APPROVED ||
    !refund.approvedAt ||
    refund.currency !== request.currency ||
    refund.payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    refund.payment.guestPaymentRequestId !== request.id ||
    refund.payment.reservationId !== request.reservationId ||
    refund.additionalChargeAllocations.length === 0
  ) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
      false,
    );
  }

  return { request, refund };
}

async function buildRefundProcessedGuestContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const { request, refund } = assertRefundNotification(notification);
  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargeRefundProcessedEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: reservationInput(request),
    refund: {
      id: refund.id,
      totalAmount: refund.amount.toFixed(2),
      currency: refund.currency,
      approvedAt: refund.approvedAt!.toISOString(),
      allocations: refundAllocations(refund),
    },
  };

  return buildAdditionalChargeRefundProcessedEmail(input);
}

async function buildRefundProcessedAdminContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const { request, refund } = assertRefundNotification(notification);
  const locale = normalizeLocale(notification.locale);
  const input: AdditionalChargeAdminRefundProcessedEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: {
      ...reservationInput(request),
      preferredLocale: locale,
    },
    guestPaymentRequestId: request.id,
    refund: {
      id: refund.id,
      paymentId: refund.paymentId,
      paymentStatus: refund.payment.status,
      processingMode: refund.processingMode,
      providerRefundId: refund.providerRefundId,
      reason: refund.reason,
      requestedByAdminName: refund.requestedByAdmin?.name ?? null,
      requestedByAdminEmail: refund.requestedByAdmin?.email ?? null,
      totalAmount: refund.amount.toFixed(2),
      currency: refund.currency,
      approvedAt: refund.approvedAt!.toISOString(),
      allocations: refundAllocations(refund),
    },
  };

  return buildAdditionalChargeAdminRefundProcessedEmail(input);
}

async function buildContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
  now: Date,
): Promise<Readonly<{
  content: TransactionalEmailContent;
  locale: "es" | "en";
  audience: "guest" | "admin";
}>> {
  const type = notification.type;
  const locale = normalizeLocale(notification.locale);

  switch (type) {
    case EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED:
      return {
        content: await buildPendingGuestContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
          now,
        ),
        locale,
        audience: "guest",
      };
    case EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED:
      return {
        content: await buildPendingAdminContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
        ),
        locale,
        audience: "admin",
      };
    case EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_APPROVED:
      return {
        content: await buildPaymentApprovedGuestContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
        ),
        locale,
        audience: "guest",
      };
    case EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED:
      return {
        content: await buildPaymentApprovedAdminContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
        ),
        locale,
        audience: "admin",
      };
    case EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED:
      return {
        content: await buildRefundProcessedGuestContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
        ),
        locale,
        audience: "guest",
      };
    case EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED:
      return {
        content: await buildRefundProcessedAdminContent(
          notification,
          publicBaseUrl,
          brandLogoUrl,
        ),
        locale,
        audience: "admin",
      };
    default:
      throw new AdditionalChargePaymentEmailDeliveryError(
        "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
        false,
      );
  }
}

function normalizeError(error: unknown): AdditionalChargePaymentEmailDeliveryError {
  if (error instanceof AdditionalChargePaymentEmailDeliveryError) {
    return error;
  }
  if (error instanceof EmailProviderError) {
    return new AdditionalChargePaymentEmailDeliveryError(
      error.code,
      error.retryable,
    );
  }
  if (error instanceof EmailTemplateDataError) {
    return new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_TEMPLATE_INVALID_DATA",
      false,
    );
  }
  return new AdditionalChargePaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markSkipped(
  claim: EmailNotificationClaim,
  error: AdditionalChargePaymentEmailDeliveryError,
): Promise<void> {
  await prisma.emailNotification.updateMany({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: EmailNotificationStatus.SKIPPED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: error.code,
      errorMessage: error.message,
    },
  });
}

async function markSent(
  claim: EmailNotificationClaim,
  providerMessageId: string,
  sentAt: Date,
): Promise<void> {
  const updated = await prisma.emailNotification.updateMany({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: EmailNotificationStatus.SENT,
      providerMessageId,
      sentAt,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  if (updated.count !== 1) {
    throw new AdditionalChargePaymentEmailDeliveryError(
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
      true,
    );
  }
}

async function markFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: AdditionalChargePaymentEmailDeliveryError,
  failedAt: Date,
): Promise<Date | null> {
  const nextAttemptAt = error.retryable
    ? calculateNextEmailNotificationAttemptAt(attemptCount, failedAt)
    : null;

  try {
    const updated = await prisma.emailNotification.updateMany({
      where: {
        id: claim.notificationId,
        status: EmailNotificationStatus.PROCESSING,
        processingStartedAt: claim.processingStartedAt,
      },
      data: {
        status: EmailNotificationStatus.FAILED,
        processingStartedAt: null,
        errorCode: error.code,
        errorMessage: error.message,
        nextAttemptAt,
      },
    });

    return updated.count === 1 ? nextAttemptAt : null;
  } catch {
    return null;
  }
}

export async function deliverClaimedAdditionalChargePaymentEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimed(input.claim);
  if (!notification) return { outcome: "skipped", retryScheduled: false };

  try {
    const { content, locale, audience } = await buildContent(
      notification,
      input.publicBaseUrl,
      input.brandLogoUrl,
      input.now(),
    );
    const sent = await input.provider.send({
      intendedRecipient: notification.recipient,
      audience,
      locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });

    await markSent(input.claim, sent.providerMessageId, input.now());
    return { outcome: "sent", retryScheduled: false };
  } catch (error) {
    const normalized = normalizeError(error);

    if (normalized.code === "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED") {
      await markSkipped(input.claim, normalized);
      return { outcome: "skipped", retryScheduled: false };
    }

    const nextAttemptAt = await markFailed(
      input.claim,
      notification.attemptCount,
      normalized,
      input.now(),
    );

    return {
      outcome: "failed",
      retryScheduled: nextAttemptAt !== null,
    };
  }
}

export async function deliverAdditionalChargePaymentNotificationsBestEffort(
  notificationIds: readonly string[],
  options: ImmediateOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  const ids = Array.from(
    new Set(notificationIds.map((value) => value.trim()).filter(Boolean)),
  );
  const empty = {
    requested: ids.length,
    attempted: 0,
    sent: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  } as const;
  const source = options.source ?? process.env;
  const now = options.now ?? (() => new Date());

  let emailEnv: ReturnType<typeof getEmailEnv>;
  try {
    emailEnv = getEmailEnv(source);
  } catch {
    return { deliveryMode: "unavailable", ...empty };
  }

  if (emailEnv.deliveryMode === "disabled") {
    return { deliveryMode: "disabled", ...empty };
  }

  let provider: EmailProvider;
  try {
    provider = options.provider ?? createResendEmailProvider(source);
  } catch {
    return { deliveryMode: "unavailable", ...empty };
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const id of ids) {
    try {
      const claim = await claimPending(id, now());
      if (!claim) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const outcome = await deliverClaimedAdditionalChargePaymentEmailNotification({
        claim,
        provider,
        publicBaseUrl: emailEnv.publicBaseUrl,
        brandLogoUrl: emailEnv.brandLogoUrl,
        now,
      });

      if (outcome.outcome === "sent") sent += 1;
      else if (outcome.outcome === "failed") {
        failed += 1;
        if (outcome.retryScheduled) retryScheduled += 1;
      } else skipped += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    deliveryMode: emailEnv.deliveryMode,
    requested: ids.length,
    attempted,
    sent,
    failed,
    retryScheduled,
    skipped,
  };
}

export {
  buildAdditionalChargePaymentRequiredNotificationKey,
  createAdditionalChargePaymentRequiredNotificationIntent,
};
export const additionalChargePaymentNotificationTypes = notificationTypeValues;
