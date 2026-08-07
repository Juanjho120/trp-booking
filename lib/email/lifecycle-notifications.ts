import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";
import { z } from "zod";

import {
  buildAdminRefundProcessedEmail,
  buildAdminReservationCancelledEmail,
  buildAdminReservationDatesUpdatedEmail,
  buildAdminStayExtensionConfirmedEmail,
  buildRefundProcessedEmail,
  buildReservationCancelledEmail,
  buildReservationDatesUpdatedEmail,
  buildStayExtensionConfirmedEmail,
  EmailTemplateDataError,
} from "@/emails";
import { environmentConfig } from "@/config/site";
import { prisma } from "@/lib/db/prisma";
import { getEmailEnv } from "@/lib/env/server";
import type { EmailProvider } from "@/types/email-provider";
import type {
  ClaimedEmailNotificationDeliveryOutcome,
  EmailNotificationClaim,
  EmailNotificationDeliveryErrorCode,
  ImmediateEmailDeliverySummary,
  LifecycleNotificationType,
} from "@/types/email-notification";
import type {
  LifecycleEmailAdminContext,
  RefundProcessedEmailTemplateInput,
  ReservationCancelledEmailTemplateInput,
  ReservationDatesUpdatedEmailTemplateInput,
  StayExtensionConfirmedEmailTemplateInput,
} from "@/types/lifecycle-email-template";
import type { TransactionalEmailContent } from "@/types/email-template";

import {
  buildLifecycleNotificationDeduplicationKey,
  getLifecycleNotificationConfiguration,
  isLifecycleNotificationType,
  normalizeLifecycleNotificationRecipient,
} from "./lifecycle-notification-contract";
import { EmailProviderError } from "./provider";
import { createResendEmailProvider } from "./resend-provider";
import {
  calculateNextEmailNotificationAttemptAt,
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
} from "./retry-policy";

type LifecycleEmailNotificationDeliveryErrorCode =
  | EmailNotificationDeliveryErrorCode
  | "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED";

const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

const SAFE_LIFECYCLE_DELIVERY_ERROR_MESSAGES = {
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
  EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED:
    "The lifecycle result no longer matches this email notification.",
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
} as const satisfies Readonly<
  Record<LifecycleEmailNotificationDeliveryErrorCode, string>
>;

const lifecycleRequestNotificationTypeValues = [
  EmailNotificationType.RESERVATION_CANCELLED,
  EmailNotificationType.ADMIN_RESERVATION_CANCELLED,
  EmailNotificationType.RESERVATION_DATES_UPDATED,
  EmailNotificationType.ADMIN_RESERVATION_DATES_UPDATED,
  EmailNotificationType.STAY_EXTENSION_CONFIRMED,
  EmailNotificationType.ADMIN_STAY_EXTENSION_CONFIRMED,
] as const;
const refundNotificationTypeValues = [
  EmailNotificationType.REFUND_PROCESSED,
  EmailNotificationType.ADMIN_REFUND_PROCESSED,
] as const;
const lifecycleNotificationTypeValues = [
  ...lifecycleRequestNotificationTypeValues,
  ...refundNotificationTypeValues,
] as const;
const lifecycleRequestNotificationTypes = new Set<EmailNotificationType>(
  lifecycleRequestNotificationTypeValues,
);
const refundNotificationTypes = new Set<EmailNotificationType>(
  refundNotificationTypeValues,
);

const requestTypeNotificationPair = {
  CANCELLATION: {
    guest: "RESERVATION_CANCELLED",
    admin: "ADMIN_RESERVATION_CANCELLED",
  },
  DATE_CHANGE: {
    guest: "RESERVATION_DATES_UPDATED",
    admin: "ADMIN_RESERVATION_DATES_UPDATED",
  },
  STAY_EXTENSION: {
    guest: "STAY_EXTENSION_CONFIRMED",
    admin: "ADMIN_STAY_EXTENSION_CONFIRMED",
  },
} as const satisfies Readonly<
  Record<
    ReservationLifecycleRequestType,
    Readonly<{
      guest: LifecycleNotificationType;
      admin: LifecycleNotificationType;
    }>
  >
>;

type LifecycleNotificationIntent = Readonly<{
  id: string;
  type: LifecycleNotificationType;
  recipient: string;
  locale: "es" | "en";
  status: EmailNotificationStatus;
}>;

type LifecycleNotificationRouting = Readonly<{
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
}>;

type ImmediateDeliveryOptions = Readonly<{
  source?: NodeJS.ProcessEnv;
  provider?: EmailProvider;
  now?: () => Date;
}>;

const claimedLifecycleNotificationSelect = {
  id: true,
  type: true,
  recipient: true,
  locale: true,
  deduplicationKey: true,
  status: true,
  attemptCount: true,
  reservation: {
    select: {
      id: true,
      status: true,
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
  lifecycleRequest: {
    select: {
      id: true,
      reservationId: true,
      requestType: true,
      status: true,
      channel: true,
      requestNote: true,
      originalCheckInDate: true,
      originalCheckOutDate: true,
      originalTotal: true,
      requestedCheckInDate: true,
      requestedCheckOutDate: true,
      requestedTotal: true,
      financialDifference: true,
      policyReasonCode: true,
      standardRefundPercentage: true,
      standardRefundAmount: true,
      completedAt: true,
      decisionNote: true,
      createdByAdmin: {
        select: { name: true, email: true },
      },
      reviewedByAdmin: {
        select: { name: true, email: true },
      },
      adjustmentPayments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { status: true },
      },
      refunds: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { status: true, amount: true },
      },
      hold: {
        select: { status: true },
      },
    },
  },
  refund: {
    select: {
      id: true,
      lifecycleRequestId: true,
      authorizationType: true,
      amount: true,
      currency: true,
      reason: true,
      status: true,
      processingMode: true,
      providerRefundId: true,
      approvedAt: true,
      requestedByAdmin: {
        select: { name: true, email: true },
      },
      payment: {
        select: {
          reservationId: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type ClaimedLifecycleNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof claimedLifecycleNotificationSelect;
}>;

class LifecycleNotificationDeliveryError extends Error {
  readonly code: LifecycleEmailNotificationDeliveryErrorCode;
  readonly retryable: boolean;

  constructor(
    code: LifecycleEmailNotificationDeliveryErrorCode,
    retryable: boolean,
  ) {
    super(SAFE_LIFECYCLE_DELIVERY_ERROR_MESSAGES[code]);
    this.name = "LifecycleNotificationDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

function normalizeLocale(value: string): "es" | "en" | null {
  return value === "es" || value === "en" ? value : null;
}

function normalizeAdminName(
  admin: Readonly<{ name: string | null; email: string }> | null,
): string | null {
  if (!admin) {
    return null;
  }

  return admin.name?.trim() || admin.email.trim().toLowerCase();
}

function getConfiguredAdminRecipients(source: NodeJS.ProcessEnv): string[] {
  const configuredRecipients = source.EMAIL_ADMIN_RECIPIENTS?.split(",") ?? [];
  const validRecipients = configuredRecipients.flatMap((recipient) => {
    const parsed = recipientSchema.safeParse(recipient);
    return parsed.success ? [parsed.data] : [];
  });

  return Array.from(new Set(validRecipients));
}

function getEnvironmentAdminFallback(source: NodeJS.ProcessEnv): string {
  return source.TRP_ENVIRONMENT === "production"
    ? environmentConfig.production.adminEmail
    : environmentConfig.test.adminEmail;
}

function resolveLifecycleNotificationRouting(
  source: NodeJS.ProcessEnv = process.env,
): LifecycleNotificationRouting {
  const configuredRecipients = getConfiguredAdminRecipients(source);

  return {
    adminRecipients:
      configuredRecipients.length > 0
        ? configuredRecipients
        : [getEnvironmentAdminFallback(source)],
    adminLocale: source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es",
  };
}

async function upsertLifecycleNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    lifecycleRequestId?: string | null;
    refundId?: string | null;
    type: LifecycleNotificationType;
    recipient: string;
    locale: "es" | "en";
  }>,
): Promise<LifecycleNotificationIntent> {
  const recipient = normalizeLifecycleNotificationRecipient(input.recipient);
  const configuration = getLifecycleNotificationConfiguration(input.type);
  const deduplicationKey =
    configuration.relationKind === "refund"
      ? buildLifecycleNotificationDeduplicationKey({
          type: input.type as "REFUND_PROCESSED" | "ADMIN_REFUND_PROCESSED",
          refundId: input.refundId ?? "",
          recipient,
        })
      : buildLifecycleNotificationDeduplicationKey({
          type: input.type as Exclude<
            LifecycleNotificationType,
            "REFUND_PROCESSED" | "ADMIN_REFUND_PROCESSED"
          >,
          lifecycleRequestId: input.lifecycleRequestId ?? "",
          recipient,
        });
  const notification = await transaction.emailNotification.upsert({
    where: { deduplicationKey },
    update: {},
    create: {
      reservationId: input.reservationId,
      lifecycleRequestId: input.lifecycleRequestId ?? null,
      refundId: input.refundId ?? null,
      type: configuration.prismaType,
      recipient,
      locale: input.locale,
      deduplicationKey,
      origin: EmailNotificationOrigin.AUTOMATIC,
      status: EmailNotificationStatus.PENDING,
    },
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      refundId: true,
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  if (
    notification.reservationId !== input.reservationId ||
    notification.lifecycleRequestId !== (input.lifecycleRequestId ?? null) ||
    notification.refundId !== (input.refundId ?? null) ||
    notification.type !== configuration.prismaType ||
    notification.recipient !== recipient ||
    notification.locale !== input.locale
  ) {
    throw new TypeError("Lifecycle notification deduplication conflict.");
  }

  return {
    id: notification.id,
    type: input.type,
    recipient: notification.recipient,
    locale: normalizeLocale(notification.locale) ?? input.locale,
    status: notification.status,
  };
}

export async function createLifecycleRequestNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    lifecycleRequestId: string;
    requestType: ReservationLifecycleRequestType;
    guestEmail: string;
    preferredLocale: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly LifecycleNotificationIntent[]> {
  const pair = requestTypeNotificationPair[input.requestType];
  const routing = resolveLifecycleNotificationRouting(source);
  const guestLocale = normalizeLocale(input.preferredLocale) ?? "es";
  const intents: LifecycleNotificationIntent[] = [];

  intents.push(
    await upsertLifecycleNotificationIntent(transaction, {
      reservationId: input.reservationId,
      lifecycleRequestId: input.lifecycleRequestId,
      type: pair.guest,
      recipient: input.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const recipient of routing.adminRecipients) {
    intents.push(
      await upsertLifecycleNotificationIntent(transaction, {
        reservationId: input.reservationId,
        lifecycleRequestId: input.lifecycleRequestId,
        type: pair.admin,
        recipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

export async function createRefundNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    lifecycleRequestId: string | null;
    refundId: string;
    guestEmail: string;
    preferredLocale: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly LifecycleNotificationIntent[]> {
  const routing = resolveLifecycleNotificationRouting(source);
  const guestLocale = normalizeLocale(input.preferredLocale) ?? "es";
  const intents: LifecycleNotificationIntent[] = [];

  intents.push(
    await upsertLifecycleNotificationIntent(transaction, {
      reservationId: input.reservationId,
      lifecycleRequestId: input.lifecycleRequestId,
      refundId: input.refundId,
      type: "REFUND_PROCESSED",
      recipient: input.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const recipient of routing.adminRecipients) {
    intents.push(
      await upsertLifecycleNotificationIntent(transaction, {
        reservationId: input.reservationId,
        lifecycleRequestId: input.lifecycleRequestId,
        refundId: input.refundId,
        type: "ADMIN_REFUND_PROCESSED",
        recipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

async function claimPendingLifecycleNotification(
  notificationId: string,
  processingStartedAt: Date,
): Promise<EmailNotificationClaim | null> {
  const candidate = await prisma.emailNotification.findFirst({
    where: {
      id: notificationId,
      type: { in: [...lifecycleNotificationTypeValues] },
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

  if (!candidate) {
    return null;
  }

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

async function readClaimedLifecycleNotification(
  claim: EmailNotificationClaim,
): Promise<ClaimedLifecycleNotification | null> {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: claimedLifecycleNotificationSelect,
  });
}

function toDateOnlyString(value: Date): `${number}-${number}-${number}` {
  return value.toISOString().slice(0, 10) as `${number}-${number}-${number}`;
}

function calculateNights(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

function buildBaseInput(
  notification: ClaimedLifecycleNotification,
  locale: "es" | "en",
  publicBaseUrl: string,
  brandLogoUrl: string,
) {
  const preferredLocale = normalizeLocale(
    notification.reservation.preferredLocale,
  );

  if (!preferredLocale) {
    throw new LifecycleNotificationDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }

  return {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: {
      id: notification.reservation.id,
      guestName: notification.reservation.guestName,
      guestEmail: notification.reservation.guestEmail,
      preferredLocale,
      propertyNameEs: notification.reservation.property.nameEs,
      propertyNameEn: notification.reservation.property.nameEn,
      currency: notification.reservation.currency,
    },
  } as const;
}

function buildAdminContext(
  request: NonNullable<ClaimedLifecycleNotification["lifecycleRequest"]>,
): LifecycleEmailAdminContext {
  return {
    channel: request.channel,
    requestNote: request.requestNote,
    createdByAdminName: normalizeAdminName(request.createdByAdmin),
    reviewedByAdminName: normalizeAdminName(request.reviewedByAdmin),
    decisionNote: request.decisionNote,
  };
}

async function readReconciledByAdminName(
  refundId: string,
): Promise<string | null> {
  const audit = await prisma.adminAuditLog.findFirst({
    where: {
      entityType: "Refund",
      entityId: refundId,
      action: "REFUND_RECONCILED_APPROVED",
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      user: { select: { name: true, email: true } },
    },
  });

  return normalizeAdminName(audit?.user ?? null);
}

function assertLifecycleNotificationCurrent(
  notification: ClaimedLifecycleNotification,
): void {
  if (lifecycleRequestNotificationTypes.has(notification.type)) {
    const request = notification.lifecycleRequest;

    if (
      !request ||
      request.reservationId !== notification.reservation.id ||
      request.status !== ReservationLifecycleRequestStatus.COMPLETED
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED",
        false,
      );
    }

    if (
      (request.requestType === ReservationLifecycleRequestType.CANCELLATION &&
        notification.reservation.status !== ReservationStatus.CANCELLED) ||
      (request.requestType !== ReservationLifecycleRequestType.CANCELLATION &&
        notification.reservation.status !== ReservationStatus.CONFIRMED)
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED",
        false,
      );
    }

    const pair = requestTypeNotificationPair[request.requestType];

    if (notification.type !== pair.guest && notification.type !== pair.admin) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED",
        false,
      );
    }

    return;
  }

  if (refundNotificationTypes.has(notification.type)) {
    const refund = notification.refund;

    if (
      !refund ||
      refund.payment.reservationId !== notification.reservation.id ||
      refund.status !== RefundStatus.APPROVED ||
      !refund.approvedAt ||
      (refund.payment.status !== PaymentStatus.PARTIALLY_REFUNDED &&
        refund.payment.status !== PaymentStatus.REFUNDED)
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED",
        false,
      );
    }

    return;
  }

  throw new LifecycleNotificationDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

function isSupportedRefundAuthorizationType(
  value: string,
): value is "STANDARD_POLICY" | "EXTRAORDINARY" | "LIFECYCLE_ADJUSTMENT" {
  return (
    value === "STANDARD_POLICY" ||
    value === "EXTRAORDINARY" ||
    value === "LIFECYCLE_ADJUSTMENT"
  );
}

function isSupportedRefundProcessingMode(
  value: string,
): value is "TILOPAY_API" | "TILOPAY_PORTAL_FALLBACK" | "LEGACY_UNSPECIFIED" {
  return (
    value === "TILOPAY_API" ||
    value === "TILOPAY_PORTAL_FALLBACK" ||
    value === "LEGACY_UNSPECIFIED"
  );
}

async function buildLifecycleNotificationContent(
  notification: ClaimedLifecycleNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const locale = normalizeLocale(notification.locale);

  if (!locale || !isLifecycleNotificationType(notification.type)) {
    throw new LifecycleNotificationDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }

  const base = buildBaseInput(notification, locale, publicBaseUrl, brandLogoUrl);

  if (
    notification.type === EmailNotificationType.RESERVATION_CANCELLED ||
    notification.type === EmailNotificationType.ADMIN_RESERVATION_CANCELLED
  ) {
    const request = notification.lifecycleRequest;

    if (
      !request?.completedAt ||
      request.requestType !== ReservationLifecycleRequestType.CANCELLATION ||
      request.standardRefundPercentage === null ||
      !request.standardRefundAmount
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const input: ReservationCancelledEmailTemplateInput = {
      ...base,
      cancellation: {
        checkInDate: toDateOnlyString(request.originalCheckInDate),
        checkOutDate: toDateOnlyString(request.originalCheckOutDate),
        cancelledAt: request.completedAt.toISOString(),
        policyReasonCode: request.policyReasonCode,
        refundPercentage: request.standardRefundPercentage,
        refundAmount: request.standardRefundAmount.toFixed(2),
        refundExpected: request.standardRefundAmount.greaterThan(0),
      },
      admin:
        notification.type === EmailNotificationType.ADMIN_RESERVATION_CANCELLED
          ? buildAdminContext(request)
          : undefined,
    };

    return notification.type === EmailNotificationType.ADMIN_RESERVATION_CANCELLED
      ? buildAdminReservationCancelledEmail(input)
      : buildReservationCancelledEmail(input);
  }

  if (
    notification.type === EmailNotificationType.RESERVATION_DATES_UPDATED ||
    notification.type === EmailNotificationType.ADMIN_RESERVATION_DATES_UPDATED
  ) {
    const request = notification.lifecycleRequest;

    if (
      !request?.completedAt ||
      request.requestType !== ReservationLifecycleRequestType.DATE_CHANGE ||
      !request.requestedCheckInDate ||
      !request.requestedCheckOutDate ||
      !request.requestedTotal ||
      !request.financialDifference
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const refund = request.refunds[0] ?? null;
    const input: ReservationDatesUpdatedEmailTemplateInput = {
      ...base,
      dateChange: {
        originalCheckInDate: toDateOnlyString(request.originalCheckInDate),
        originalCheckOutDate: toDateOnlyString(request.originalCheckOutDate),
        requestedCheckInDate: toDateOnlyString(request.requestedCheckInDate),
        requestedCheckOutDate: toDateOnlyString(request.requestedCheckOutDate),
        originalTotal: request.originalTotal.toFixed(2),
        requestedTotal: request.requestedTotal.toFixed(2),
        financialDifference: request.financialDifference.toFixed(2),
        completedAt: request.completedAt.toISOString(),
        adjustmentPaymentStatus: request.adjustmentPayments[0]?.status ?? null,
        refundStatus: refund?.status ?? null,
        refundAmount: refund?.amount.toFixed(2) ?? null,
      },
      admin:
        notification.type === EmailNotificationType.ADMIN_RESERVATION_DATES_UPDATED
          ? buildAdminContext(request)
          : undefined,
    };

    return notification.type === EmailNotificationType.ADMIN_RESERVATION_DATES_UPDATED
      ? buildAdminReservationDatesUpdatedEmail(input)
      : buildReservationDatesUpdatedEmail(input);
  }

  if (
    notification.type === EmailNotificationType.STAY_EXTENSION_CONFIRMED ||
    notification.type === EmailNotificationType.ADMIN_STAY_EXTENSION_CONFIRMED
  ) {
    const request = notification.lifecycleRequest;

    if (
      !request?.completedAt ||
      request.requestType !== ReservationLifecycleRequestType.STAY_EXTENSION ||
      !request.requestedCheckInDate ||
      !request.requestedCheckOutDate ||
      !request.requestedTotal ||
      !request.financialDifference
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const addedNights = calculateNights(
      request.originalCheckOutDate,
      request.requestedCheckOutDate,
    );

    if (addedNights < 1) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const input: StayExtensionConfirmedEmailTemplateInput = {
      ...base,
      extension: {
        checkInDate: toDateOnlyString(request.requestedCheckInDate),
        originalCheckOutDate: toDateOnlyString(request.originalCheckOutDate),
        requestedCheckOutDate: toDateOnlyString(request.requestedCheckOutDate),
        addedNights,
        originalTotal: request.originalTotal.toFixed(2),
        additionalAmount: request.financialDifference.toFixed(2),
        requestedTotal: request.requestedTotal.toFixed(2),
        completedAt: request.completedAt.toISOString(),
        adjustmentPaymentStatus: request.adjustmentPayments[0]?.status ?? null,
        holdStatus: request.hold?.status ?? null,
      },
      admin:
        notification.type === EmailNotificationType.ADMIN_STAY_EXTENSION_CONFIRMED
          ? buildAdminContext(request)
          : undefined,
    };

    return notification.type === EmailNotificationType.ADMIN_STAY_EXTENSION_CONFIRMED
      ? buildAdminStayExtensionConfirmedEmail(input)
      : buildStayExtensionConfirmedEmail(input);
  }

  if (
    notification.type === EmailNotificationType.REFUND_PROCESSED ||
    notification.type === EmailNotificationType.ADMIN_REFUND_PROCESSED
  ) {
    const refund = notification.refund;

    if (
      !refund?.approvedAt ||
      refund.status !== RefundStatus.APPROVED ||
      !isSupportedRefundAuthorizationType(refund.authorizationType) ||
      !isSupportedRefundProcessingMode(refund.processingMode) ||
      (refund.payment.status !== PaymentStatus.PARTIALLY_REFUNDED &&
        refund.payment.status !== PaymentStatus.REFUNDED)
    ) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const input: RefundProcessedEmailTemplateInput = {
      ...base,
      refund: {
        amount: refund.amount.toFixed(2),
        approvedAt: refund.approvedAt.toISOString(),
        authorizationType: refund.authorizationType,
        processingMode: refund.processingMode,
        paymentStatus: refund.payment.status,
        providerRefundId: refund.providerRefundId,
        reason: refund.reason,
      },
      admin:
        notification.type === EmailNotificationType.ADMIN_REFUND_PROCESSED
          ? {
              requestedByAdminName: normalizeAdminName(refund.requestedByAdmin),
              reconciledByAdminName: await readReconciledByAdminName(refund.id),
            }
          : undefined,
    };

    return notification.type === EmailNotificationType.ADMIN_REFUND_PROCESSED
      ? buildAdminRefundProcessedEmail(input)
      : buildRefundProcessedEmail(input);
  }

  throw new LifecycleNotificationDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

function normalizeLifecycleDeliveryError(
  error: unknown,
): LifecycleNotificationDeliveryError {
  if (error instanceof LifecycleNotificationDeliveryError) {
    return error;
  }

  if (error instanceof EmailProviderError) {
    return new LifecycleNotificationDeliveryError(error.code, error.retryable);
  }

  if (error instanceof EmailTemplateDataError) {
    return new LifecycleNotificationDeliveryError(
      "EMAIL_TEMPLATE_INVALID_DATA",
      false,
    );
  }

  return new LifecycleNotificationDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markLifecycleNotificationSkipped(
  claim: EmailNotificationClaim,
  error: LifecycleNotificationDeliveryError,
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

async function markLifecycleNotificationSent(
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
    throw new LifecycleNotificationDeliveryError(
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
      true,
    );
  }
}

async function markLifecycleNotificationFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: LifecycleNotificationDeliveryError,
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

export async function deliverClaimedLifecycleEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimedLifecycleNotification(input.claim);

  if (!notification) {
    return { outcome: "skipped", retryScheduled: false };
  }

  try {
    assertLifecycleNotificationCurrent(notification);
    const locale = normalizeLocale(notification.locale);

    if (!locale || !isLifecycleNotificationType(notification.type)) {
      throw new LifecycleNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const content = await buildLifecycleNotificationContent(
      notification,
      input.publicBaseUrl,
      input.brandLogoUrl,
    );
    const sent = await input.provider.send({
      intendedRecipient: notification.recipient,
      audience: getLifecycleNotificationConfiguration(notification.type).audience,
      locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });

    await markLifecycleNotificationSent(
      input.claim,
      sent.providerMessageId,
      input.now(),
    );

    return { outcome: "sent", retryScheduled: false };
  } catch (error) {
    const normalized = normalizeLifecycleDeliveryError(error);

    if (normalized.code === "EMAIL_LIFECYCLE_NOTIFICATION_SUPERSEDED") {
      await markLifecycleNotificationSkipped(input.claim, normalized);
      return { outcome: "skipped", retryScheduled: false };
    }

    const nextAttemptAt = await markLifecycleNotificationFailed(
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

export async function deliverLifecycleNotificationsBestEffort(
  notificationIds: readonly string[],
  options: ImmediateDeliveryOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  const uniqueIds = Array.from(
    new Set(notificationIds.map((id) => id.trim()).filter(Boolean)),
  );
  const empty = {
    requested: uniqueIds.length,
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

  for (const id of uniqueIds) {
    try {
      const claim = await claimPendingLifecycleNotification(id, now());

      if (!claim) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const outcome = await deliverClaimedLifecycleEmailNotification({
        claim,
        provider,
        publicBaseUrl: emailEnv.publicBaseUrl,
        brandLogoUrl: emailEnv.brandLogoUrl,
        now,
      });

      if (outcome.outcome === "sent") {
        sent += 1;
      } else if (outcome.outcome === "failed") {
        failed += 1;
        if (outcome.retryScheduled) retryScheduled += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    deliveryMode: emailEnv.deliveryMode,
    requested: uniqueIds.length,
    attempted,
    sent,
    failed,
    retryScheduled,
    skipped,
  };
}

function unavailableDeliverySummary(): ImmediateEmailDeliverySummary {
  return {
    deliveryMode: "unavailable",
    requested: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  };
}

export async function deliverLifecycleRequestNotificationsBestEffort(
  lifecycleRequestId: string,
  options: ImmediateDeliveryOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  try {
    const notifications = await prisma.emailNotification.findMany({
      where: {
        lifecycleRequestId: lifecycleRequestId.trim(),
        type: { in: [...lifecycleRequestNotificationTypeValues] },
      },
      select: { id: true },
    });

    return deliverLifecycleNotificationsBestEffort(
      notifications.map(({ id }: Readonly<{ id: string }>) => id),
      options,
    );
  } catch {
    return unavailableDeliverySummary();
  }
}

export async function deliverRefundNotificationsBestEffort(
  refundId: string,
  options: ImmediateDeliveryOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  try {
    const notifications = await prisma.emailNotification.findMany({
      where: {
        refundId: refundId.trim(),
        type: { in: [...refundNotificationTypeValues] },
      },
      select: { id: true },
    });

    return deliverLifecycleNotificationsBestEffort(
      notifications.map(({ id }: Readonly<{ id: string }>) => id),
      options,
    );
  } catch {
    return unavailableDeliverySummary();
  }
}
