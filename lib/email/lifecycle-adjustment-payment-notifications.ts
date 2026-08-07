import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";
import { z } from "zod";

import {
  buildAdminDateChangePaymentLinkDeliveryStatusEmail,
  buildAdminStayExtensionPaymentLinkDeliveryStatusEmail,
  buildDateChangePaymentRequiredEmail,
  buildStayExtensionPaymentRequiredEmail,
  EmailTemplateDataError,
} from "@/emails";
import { environmentConfig } from "@/config/site";
import { prisma } from "@/lib/db/prisma";
import { getEmailEnv } from "@/lib/env/server";
import { createLifecycleAdjustmentHandoffToken } from "@/lib/payments/lifecycle-adjustment-handoff";
import type { EmailAudience, EmailProvider } from "@/types/email-provider";
import type {
  ClaimedEmailNotificationDeliveryOutcome,
  EmailNotificationClaim,
  EmailNotificationDeliveryErrorCode,
  ImmediateEmailDeliverySummary,
  LifecycleAdjustmentPaymentNotificationType,
} from "@/types/email-notification";
import type {
  AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
  LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
} from "@/types/lifecycle-email-template";
import type { TransactionalEmailContent } from "@/types/email-template";

import { EmailProviderError } from "./provider";
import { createResendEmailProvider } from "./resend-provider";
import {
  calculateNextEmailNotificationAttemptAt,
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
} from "./retry-policy";

const guestTypeValues = [
  EmailNotificationType.DATE_CHANGE_PAYMENT_REQUIRED,
  EmailNotificationType.STAY_EXTENSION_PAYMENT_REQUIRED,
] as const;
const adminTypeValues = [
  EmailNotificationType.ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS,
  EmailNotificationType.ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS,
] as const;
const allTypeValues = [...guestTypeValues, ...adminTypeValues] as const;
const guestTypes = new Set<EmailNotificationType>(guestTypeValues);
const adminTypes = new Set<EmailNotificationType>(adminTypeValues);
const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

type DeliveryErrorCode =
  | EmailNotificationDeliveryErrorCode
  | "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED";

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
  EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED:
    "The lifecycle adjustment payment request is no longer payable.",
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
} as const satisfies Readonly<Record<DeliveryErrorCode, string>>;

class PaymentEmailDeliveryError extends Error {
  constructor(
    readonly code: DeliveryErrorCode,
    readonly retryable: boolean,
  ) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = "PaymentEmailDeliveryError";
  }
}

type ImmediateOptions = Readonly<{
  source?: NodeJS.ProcessEnv;
  provider?: EmailProvider;
  now?: () => Date;
}>;

type Routing = Readonly<{
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
}>;

const claimedSelect = {
  id: true,
  reservationId: true,
  lifecycleRequestId: true,
  sourceNotificationId: true,
  type: true,
  recipient: true,
  locale: true,
  deduplicationKey: true,
  attemptCount: true,
  reservation: {
    select: {
      id: true,
      status: true,
      guestName: true,
      guestEmail: true,
      preferredLocale: true,
      currency: true,
      property: { select: { nameEs: true, nameEn: true } },
    },
  },
  lifecycleRequest: {
    select: {
      id: true,
      reservationId: true,
      requestType: true,
      status: true,
      financialDifference: true,
      currency: true,
      originalCheckInDate: true,
      originalCheckOutDate: true,
      requestedCheckInDate: true,
      requestedCheckOutDate: true,
      hold: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
      adjustmentPayments: {
        where: { purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          reservationId: true,
          lifecycleRequestId: true,
          purpose: true,
          status: true,
          amount: true,
          currency: true,
        },
      },
    },
  },
  sourceNotification: {
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      type: true,
      recipient: true,
      status: true,
      attemptCount: true,
      sentAt: true,
      lastAttemptAt: true,
      errorCode: true,
      nextAttemptAt: true,
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type ClaimedNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof claimedSelect;
}>;

const payableRequestSelect = {
  id: true,
  reservationId: true,
  requestType: true,
  status: true,
  financialDifference: true,
  currency: true,
  originalCheckInDate: true,
  originalCheckOutDate: true,
  requestedCheckInDate: true,
  requestedCheckOutDate: true,
  hold: {
    select: { id: true, status: true, expiresAt: true },
  },
  reservation: {
    select: {
      id: true,
      status: true,
      guestEmail: true,
      preferredLocale: true,
    },
  },
  adjustmentPayments: {
    where: { purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type PayableRequest = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof payableRequestSelect;
}>;

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function normalizeRecipient(value: string): string {
  const parsed = recipientSchema.safeParse(value);
  if (!parsed.success) {
    throw new PaymentEmailDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }
  return parsed.data;
}

function getConfiguredAdminRecipients(source: NodeJS.ProcessEnv): string[] {
  return Array.from(
    new Set(
      (source.EMAIL_ADMIN_RECIPIENTS?.split(",") ?? []).flatMap((value) => {
        const parsed = recipientSchema.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  );
}

function resolveRouting(source: NodeJS.ProcessEnv = process.env): Routing {
  const configured = getConfiguredAdminRecipients(source);
  return {
    adminRecipients:
      configured.length > 0
        ? configured
        : [
            source.TRP_ENVIRONMENT === "production"
              ? environmentConfig.production.adminEmail
              : environmentConfig.test.adminEmail,
          ],
    adminLocale: source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es",
  };
}

function guestTypeForRequest(
  requestType: ReservationLifecycleRequestType,
):
  | "DATE_CHANGE_PAYMENT_REQUIRED"
  | "STAY_EXTENSION_PAYMENT_REQUIRED" {
  if (requestType === ReservationLifecycleRequestType.DATE_CHANGE) {
    return "DATE_CHANGE_PAYMENT_REQUIRED";
  }
  if (requestType === ReservationLifecycleRequestType.STAY_EXTENSION) {
    return "STAY_EXTENSION_PAYMENT_REQUIRED";
  }
  throw new PaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
    false,
  );
}

function adminTypeForGuest(
  type: EmailNotificationType,
):
  | "ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS"
  | "ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS" {
  if (type === EmailNotificationType.DATE_CHANGE_PAYMENT_REQUIRED) {
    return "ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS";
  }
  if (type === EmailNotificationType.STAY_EXTENSION_PAYMENT_REQUIRED) {
    return "ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS";
  }
  throw new PaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

const prismaNotificationTypes = {
  DATE_CHANGE_PAYMENT_REQUIRED:
    EmailNotificationType.DATE_CHANGE_PAYMENT_REQUIRED,
  STAY_EXTENSION_PAYMENT_REQUIRED:
    EmailNotificationType.STAY_EXTENSION_PAYMENT_REQUIRED,
  ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS:
    EmailNotificationType.ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS,
  ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS:
    EmailNotificationType.ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS,
} satisfies Readonly<
  Record<LifecycleAdjustmentPaymentNotificationType, EmailNotificationType>
>;

function prismaType(
  type: LifecycleAdjustmentPaymentNotificationType,
): EmailNotificationType {
  return prismaNotificationTypes[type];
}

function automaticGuestKey(
  type: "DATE_CHANGE_PAYMENT_REQUIRED" | "STAY_EXTENSION_PAYMENT_REQUIRED",
  lifecycleRequestId: string,
  recipient: string,
): string {
  const prefix =
    type === "DATE_CHANGE_PAYMENT_REQUIRED"
      ? "date-change-payment-required"
      : "stay-extension-payment-required";
  return `${prefix}/${lifecycleRequestId.trim()}/${normalizeRecipient(recipient)}`;
}

function adminStatusKey(
  type:
    | "ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS"
    | "ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS",
  sourceNotificationId: string,
  recipient: string,
): string {
  const prefix =
    type === "ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS"
      ? "admin-date-change-payment-link-delivery-status"
      : "admin-stay-extension-payment-link-delivery-status";
  return `${prefix}/${sourceNotificationId.trim()}/${normalizeRecipient(recipient)}`;
}

function assertPayableRequest(request: PayableRequest, now: Date): void {
  const payment = request.adjustmentPayments[0];
  const difference = request.financialDifference;
  if (
    (request.requestType !== ReservationLifecycleRequestType.DATE_CHANGE &&
      request.requestType !== ReservationLifecycleRequestType.STAY_EXTENSION) ||
    request.status !==
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
    !difference ||
    !difference.greaterThan(0) ||
    !request.requestedCheckInDate ||
    !request.requestedCheckOutDate ||
    !request.hold ||
    request.hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
    request.hold.expiresAt <= now ||
    !payment ||
    payment.reservationId !== request.reservationId ||
    payment.lifecycleRequestId !== request.id ||
    payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
    payment.status !== PaymentStatus.PENDING ||
    payment.amount.comparedTo(difference) !== 0 ||
    payment.currency !== request.currency ||
    request.reservation.status !== ReservationStatus.CONFIRMED
  ) {
    throw new PaymentEmailDeliveryError(
      "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED",
      false,
    );
  }
}

export function isLifecycleAdjustmentPaymentNotificationType(
  value: EmailNotificationType,
): value is LifecycleAdjustmentPaymentNotificationType {
  return (allTypeValues as readonly EmailNotificationType[]).includes(value);
}

export function isLifecycleAdjustmentPaymentGuestNotificationType(
  value: EmailNotificationType,
): boolean {
  return guestTypes.has(value);
}

function getNotificationAudience(type: EmailNotificationType): EmailAudience {
  if (guestTypes.has(type)) {
    return "guest";
  }

  if (adminTypes.has(type)) {
    return "admin";
  }

  throw new PaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

type GuestIntentIdentity = Readonly<{
  deduplicationKey: string;
  reservationId: string;
  lifecycleRequestId: string;
  type: EmailNotificationType;
  recipient: string;
  locale: "es" | "en";
}>;

function guestIntentMatches(
  notification: Readonly<{
    reservationId: string;
    lifecycleRequestId: string | null;
    type: EmailNotificationType;
    recipient: string;
    locale: string;
  }>,
  identity: GuestIntentIdentity,
): boolean {
  return (
    notification.reservationId === identity.reservationId &&
    notification.lifecycleRequestId === identity.lifecycleRequestId &&
    notification.type === identity.type &&
    notification.recipient === identity.recipient &&
    notification.locale === identity.locale
  );
}

export async function ensureLifecycleAdjustmentPaymentRequiredNotification(
  lifecycleRequestId: string,
  source: NodeJS.ProcessEnv = process.env,
): Promise<Readonly<{ id: string; created: boolean }>> {
  const now = new Date();
  const recoveryIdentityRef: {
    current: GuestIntentIdentity | null;
  } = {
    current: null,
  };

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const request =
          await transaction.reservationLifecycleRequest.findUnique({
            where: { id: lifecycleRequestId.trim() },
            select: payableRequestSelect,
          });
        if (!request) {
          throw new PaymentEmailDeliveryError(
            "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
            false,
          );
        }
        assertPayableRequest(request, now);
        const type = guestTypeForRequest(request.requestType);
        const recipient = normalizeRecipient(request.reservation.guestEmail);
        const locale = normalizeLocale(request.reservation.preferredLocale);
        const identity: GuestIntentIdentity = {
          deduplicationKey: automaticGuestKey(type, request.id, recipient),
          reservationId: request.reservationId,
          lifecycleRequestId: request.id,
          type: prismaType(type),
          recipient,
          locale,
        };
        recoveryIdentityRef.current = identity;
        const existing = await transaction.emailNotification.findUnique({
          where: { deduplicationKey: identity.deduplicationKey },
          select: {
            id: true,
            reservationId: true,
            lifecycleRequestId: true,
            type: true,
            recipient: true,
            locale: true,
          },
        });
        if (existing) {
          if (!guestIntentMatches(existing, identity)) {
            throw new TypeError(
              "Payment notification deduplication conflict.",
            );
          }
          return { id: existing.id, created: false };
        }

        const notification = await transaction.emailNotification.create({
          data: {
            reservationId: identity.reservationId,
            lifecycleRequestId: identity.lifecycleRequestId,
            type: identity.type,
            recipient: identity.recipient,
            locale: identity.locale,
            deduplicationKey: identity.deduplicationKey,
            origin: EmailNotificationOrigin.AUTOMATIC,
            status: EmailNotificationStatus.PENDING,
          },
          select: { id: true },
        });
        await transaction.adminAuditLog.create({
          data: {
            action: "LIFECYCLE_ADJUSTMENT_PAYMENT_EMAIL_QUEUED",
            entityType: "EmailNotification",
            entityId: notification.id,
            metadata: {
              reservationId: request.reservationId,
              lifecycleRequestId: request.id,
              requestType: request.requestType,
              notificationType: type,
              intendedRecipient: recipient,
              locale,
              source: source.TRP_ENVIRONMENT ?? null,
            },
          },
        });
        return { id: notification.id, created: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const recoveryIdentity = recoveryIdentityRef.current;

    if (
      recoveryIdentity &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.emailNotification.findUnique({
        where: {
          deduplicationKey: recoveryIdentity.deduplicationKey,
        },
        select: {
          id: true,
          reservationId: true,
          lifecycleRequestId: true,
          type: true,
          recipient: true,
          locale: true,
        },
      });
      if (existing && guestIntentMatches(existing, recoveryIdentity)) {
        return { id: existing.id, created: false };
      }
    }
    throw error;
  }
}

export async function ensureAndDeliverLifecycleAdjustmentPaymentRequiredNotificationBestEffort(
  lifecycleRequestId: string,
  options: ImmediateOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  try {
    const intent = await ensureLifecycleAdjustmentPaymentRequiredNotification(
      lifecycleRequestId,
      options.source,
    );
    return deliverLifecycleAdjustmentPaymentNotificationsBestEffort(
      [intent.id],
      options,
    );
  } catch {
    return unavailableSummary();
  }
}

const adminStatusIntentSelect = {
  id: true,
  reservationId: true,
  lifecycleRequestId: true,
  sourceNotificationId: true,
  type: true,
  recipient: true,
  locale: true,
} satisfies Prisma.EmailNotificationSelect;

type AdminStatusIntent = Prisma.EmailNotificationGetPayload<{
  select: typeof adminStatusIntentSelect;
}>;

async function createAdminStatusIntents(
  transaction: Prisma.TransactionClient,
  sourceNotificationId: string,
  source: NodeJS.ProcessEnv,
): Promise<string[]> {
  const sourceNotification = await transaction.emailNotification.findUnique({
    where: { id: sourceNotificationId },
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      type: true,
      status: true,
      nextAttemptAt: true,
    },
  });
  if (
    !sourceNotification ||
    !sourceNotification.lifecycleRequestId ||
    !guestTypes.has(sourceNotification.type) ||
    (sourceNotification.status !== EmailNotificationStatus.SENT &&
      !(
        sourceNotification.status === EmailNotificationStatus.FAILED &&
        sourceNotification.nextAttemptAt === null
      ))
  ) {
    return [];
  }

  const type = adminTypeForGuest(sourceNotification.type);
  const routing = resolveRouting(source);
  const ids: string[] = [];
  for (const rawRecipient of routing.adminRecipients) {
    const recipient = normalizeRecipient(rawRecipient);
    const key = adminStatusKey(type, sourceNotification.id, recipient);
    const notification: AdminStatusIntent =
      await transaction.emailNotification.upsert({
        where: { deduplicationKey: key },
        update: {},
        create: {
          reservationId: sourceNotification.reservationId,
          lifecycleRequestId: sourceNotification.lifecycleRequestId,
          sourceNotificationId: sourceNotification.id,
          type: prismaType(type),
          recipient,
          locale: routing.adminLocale,
          deduplicationKey: key,
          origin: EmailNotificationOrigin.AUTOMATIC,
          status: EmailNotificationStatus.PENDING,
        },
        select: adminStatusIntentSelect,
      });
    if (
      notification.reservationId !== sourceNotification.reservationId ||
      notification.lifecycleRequestId !==
        sourceNotification.lifecycleRequestId ||
      notification.sourceNotificationId !== sourceNotification.id ||
      notification.type !== prismaType(type) ||
      notification.recipient !== recipient ||
      notification.locale !== routing.adminLocale
    ) {
      throw new TypeError(
        "Payment delivery-status notification deduplication conflict.",
      );
    }
    ids.push(notification.id);
  }
  return ids;
}

export async function reconcileLifecycleAdjustmentPaymentRequiredIntents(
  source: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): Promise<readonly string[]> {
  const candidates = await prisma.reservationLifecycleRequest.findMany({
    where: {
      requestType: {
        in: [
          ReservationLifecycleRequestType.DATE_CHANGE,
          ReservationLifecycleRequestType.STAY_EXTENSION,
        ],
      },
      status:
        ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT,
      financialDifference: { gt: 0 },
      reservation: { status: ReservationStatus.CONFIRMED },
      hold: {
        is: {
          status: LifecycleRequestHoldStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      },
      adjustmentPayments: {
        some: {
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          status: PaymentStatus.PENDING,
        },
      },
      emailNotifications: {
        none: { type: { in: [...guestTypeValues] } },
      },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 20,
    select: { id: true },
  });
  const ids: string[] = [];
  for (const candidate of candidates) {
    try {
      const intent = await ensureLifecycleAdjustmentPaymentRequiredNotification(
        candidate.id,
        source,
      );
      ids.push(intent.id);
    } catch {
      // A concurrent transition may have paid, expired, or completed the request.
    }
  }
  return ids;
}

export async function reconcileLifecycleAdjustmentPaymentDeliveryStatusIntents(
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly string[]> {
  const candidates = await prisma.emailNotification.findMany({
    where: {
      type: { in: [...guestTypeValues] },
      OR: [
        { status: EmailNotificationStatus.SENT },
        { status: EmailNotificationStatus.FAILED, nextAttemptAt: null },
      ],
      deliveryStatusNotifications: { none: {} },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 20,
    select: { id: true },
  });
  const ids: string[] = [];
  for (const candidate of candidates) {
    const created = await prisma.$transaction((transaction) =>
      createAdminStatusIntents(transaction, candidate.id, source),
    );
    ids.push(...created);
  }
  return ids;
}

async function claimPending(
  notificationId: string,
  processingStartedAt: Date,
): Promise<EmailNotificationClaim | null> {
  const candidate = await prisma.emailNotification.findFirst({
    where: {
      id: notificationId,
      type: { in: [...allTypeValues] },
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

async function readClaimed(
  claim: EmailNotificationClaim,
): Promise<ClaimedNotification | null> {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: claimedSelect,
  });
}

function assertCurrent(notification: ClaimedNotification, now: Date): void {
  if (guestTypes.has(notification.type)) {
    const request = notification.lifecycleRequest;
    if (!request) {
      throw new PaymentEmailDeliveryError(
        "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED",
        false,
      );
    }
    assertPayableRequest(
      {
        ...request,
        reservation: {
          id: notification.reservation.id,
          status: notification.reservation.status,
          guestEmail: notification.reservation.guestEmail,
          preferredLocale: notification.reservation.preferredLocale,
        },
      },
      now,
    );
    const expected = guestTypeForRequest(request.requestType);
    if (notification.type !== prismaType(expected)) {
      throw new PaymentEmailDeliveryError(
        "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED",
        false,
      );
    }
    return;
  }

  if (adminTypes.has(notification.type)) {
    const sourceNotification = notification.sourceNotification;
    if (
      !sourceNotification ||
      !guestTypes.has(sourceNotification.type) ||
      sourceNotification.reservationId !== notification.reservationId ||
      sourceNotification.lifecycleRequestId !== notification.lifecycleRequestId ||
      (sourceNotification.status !== EmailNotificationStatus.SENT &&
        !(
          sourceNotification.status === EmailNotificationStatus.FAILED &&
          sourceNotification.nextAttemptAt === null
        ))
    ) {
      throw new PaymentEmailDeliveryError(
        "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED",
        false,
      );
    }
    const expected = adminTypeForGuest(sourceNotification.type);
    if (notification.type !== prismaType(expected)) {
      throw new PaymentEmailDeliveryError(
        "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED",
        false,
      );
    }
    return;
  }

  throw new PaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

function toDateOnly(value: Date): `${number}-${number}-${number}` {
  return value.toISOString().slice(0, 10) as `${number}-${number}-${number}`;
}

function baseInput(
  notification: ClaimedNotification,
  locale: "es" | "en",
  publicBaseUrl: string,
  brandLogoUrl: string,
) {
  return {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: {
      id: notification.reservation.id,
      guestName: notification.reservation.guestName,
      guestEmail: notification.reservation.guestEmail,
      preferredLocale: normalizeLocale(notification.reservation.preferredLocale),
      propertyNameEs: notification.reservation.property.nameEs,
      propertyNameEn: notification.reservation.property.nameEn,
      currency: notification.reservation.currency,
    },
  } as const;
}

async function buildContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const locale = normalizeLocale(notification.locale);
  const base = baseInput(notification, locale, publicBaseUrl, brandLogoUrl);

  if (guestTypes.has(notification.type)) {
    const request = notification.lifecycleRequest!;
    const payment = request.adjustmentPayments[0]!;
    const hold = request.hold!;
    const token = createLifecycleAdjustmentHandoffToken({
      lifecycleRequestId: request.id,
      holdId: hold.id,
      paymentId: payment.id,
      expiresAt: hold.expiresAt.toISOString(),
    });
    const paymentUrl = new URL(
      `/reservas/ajuste/${token}`,
      publicBaseUrl,
    ).toString();
    const input: LifecycleAdjustmentPaymentRequiredEmailTemplateInput = {
      ...base,
      paymentRequest: {
        requestType:
          request.requestType === ReservationLifecycleRequestType.DATE_CHANGE
            ? "DATE_CHANGE"
            : "STAY_EXTENSION",
        originalCheckInDate: toDateOnly(request.originalCheckInDate),
        originalCheckOutDate: toDateOnly(request.originalCheckOutDate),
        requestedCheckInDate: toDateOnly(request.requestedCheckInDate!),
        requestedCheckOutDate: toDateOnly(request.requestedCheckOutDate!),
        amount: payment.amount.toFixed(2),
        holdExpiresAt: hold.expiresAt.toISOString(),
        paymentUrl,
      },
    };
    return notification.type === EmailNotificationType.DATE_CHANGE_PAYMENT_REQUIRED
      ? buildDateChangePaymentRequiredEmail(input)
      : buildStayExtensionPaymentRequiredEmail(input);
  }

  const source = notification.sourceNotification!;
  const request = notification.lifecycleRequest;
  if (!request) {
    throw new PaymentEmailDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }
  const outcome =
    source.status === EmailNotificationStatus.SENT ? "SENT" : "FAILED";
  const observedAt =
    outcome === "SENT"
      ? source.sentAt
      : source.lastAttemptAt;
  if (!observedAt) {
    throw new PaymentEmailDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }
  const input: AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput = {
    ...base,
    delivery: {
      requestType:
        request.requestType === ReservationLifecycleRequestType.DATE_CHANGE
          ? "DATE_CHANGE"
          : "STAY_EXTENSION",
      outcome,
      intendedGuestRecipient: source.recipient,
      sourceNotificationId: source.id,
      attemptCount: source.attemptCount,
      observedAt: observedAt.toISOString(),
      errorCode: outcome === "FAILED" ? source.errorCode : null,
    },
  };
  return notification.type ===
    EmailNotificationType.ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS
    ? buildAdminDateChangePaymentLinkDeliveryStatusEmail(input)
    : buildAdminStayExtensionPaymentLinkDeliveryStatusEmail(input);
}

function normalizeError(error: unknown): PaymentEmailDeliveryError {
  if (error instanceof PaymentEmailDeliveryError) return error;
  if (error instanceof EmailProviderError) {
    return new PaymentEmailDeliveryError(error.code, error.retryable);
  }
  if (error instanceof EmailTemplateDataError) {
    return new PaymentEmailDeliveryError("EMAIL_TEMPLATE_INVALID_DATA", false);
  }
  return new PaymentEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markSkipped(
  claim: EmailNotificationClaim,
  error: PaymentEmailDeliveryError,
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

async function markSentAndCreateStatuses(
  claim: EmailNotificationClaim,
  providerMessageId: string,
  sentAt: Date,
  source: NodeJS.ProcessEnv,
  createsAdminStatus: boolean,
): Promise<readonly string[]> {
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.emailNotification.updateMany({
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
      throw new PaymentEmailDeliveryError(
        "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
        true,
      );
    }
    return createsAdminStatus
      ? createAdminStatusIntents(transaction, claim.notificationId, source)
      : [];
  });
}

async function markFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: PaymentEmailDeliveryError,
  failedAt: Date,
  source: NodeJS.ProcessEnv,
  createsAdminStatus: boolean,
): Promise<Readonly<{ nextAttemptAt: Date | null; adminIds: readonly string[] }>> {
  const nextAttemptAt = error.retryable
    ? calculateNextEmailNotificationAttemptAt(attemptCount, failedAt)
    : null;
  try {
    return await prisma.$transaction(async (transaction) => {
      const updated = await transaction.emailNotification.updateMany({
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
      if (updated.count !== 1) return { nextAttemptAt: null, adminIds: [] };
      const adminIds =
        createsAdminStatus && nextAttemptAt === null
          ? await createAdminStatusIntents(
              transaction,
              claim.notificationId,
              source,
            )
          : [];
      return { nextAttemptAt, adminIds };
    });
  } catch {
    return { nextAttemptAt: null, adminIds: [] };
  }
}

export async function deliverClaimedLifecycleAdjustmentPaymentEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    source: NodeJS.ProcessEnv;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimed(input.claim);
  if (!notification) return { outcome: "skipped", retryScheduled: false };
  const createsAdminStatus = guestTypes.has(notification.type);
  try {
    assertCurrent(notification, input.now());
    const content = await buildContent(
      notification,
      input.publicBaseUrl,
      input.brandLogoUrl,
    );
    const sent = await input.provider.send({
      intendedRecipient: notification.recipient,
      audience: getNotificationAudience(notification.type),
      locale: normalizeLocale(notification.locale),
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });
    const adminIds = await markSentAndCreateStatuses(
      input.claim,
      sent.providerMessageId,
      input.now(),
      input.source,
      createsAdminStatus,
    );
    if (adminIds.length > 0) {
      await deliverLifecycleAdjustmentPaymentNotificationsBestEffort(adminIds, {
        source: input.source,
        provider: input.provider,
        now: input.now,
      });
    }
    return { outcome: "sent", retryScheduled: false };
  } catch (error) {
    const normalized = normalizeError(error);
    if (
      normalized.code ===
      "EMAIL_LIFECYCLE_ADJUSTMENT_PAYMENT_SUPERSEDED"
    ) {
      await markSkipped(input.claim, normalized);
      return { outcome: "skipped", retryScheduled: false };
    }
    const failed = await markFailed(
      input.claim,
      notification.attemptCount,
      normalized,
      input.now(),
      input.source,
      createsAdminStatus,
    );
    if (failed.adminIds.length > 0) {
      await deliverLifecycleAdjustmentPaymentNotificationsBestEffort(
        failed.adminIds,
        {
          source: input.source,
          provider: input.provider,
          now: input.now,
        },
      );
    }
    return {
      outcome: "failed",
      retryScheduled: failed.nextAttemptAt !== null,
    };
  }
}

export async function deliverLifecycleAdjustmentPaymentNotificationsBestEffort(
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
      const outcome =
        await deliverClaimedLifecycleAdjustmentPaymentEmailNotification({
          claim,
          provider,
          publicBaseUrl: emailEnv.publicBaseUrl,
          brandLogoUrl: emailEnv.brandLogoUrl,
          source,
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

function unavailableSummary(): ImmediateEmailDeliverySummary {
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

export const lifecycleAdjustmentPaymentGuestNotificationTypes = guestTypeValues;
export const lifecycleAdjustmentPaymentNotificationTypes = allTypeValues;
