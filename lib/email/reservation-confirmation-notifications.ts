import {
  EmailNotificationStatus,
  EmailNotificationType,
  ReservationStatus,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";

import {
  buildAdminNewReservationEmail,
  buildArrivalInstructionsEmail,
  buildReservationConfirmedEmail,
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
  ReservationConfirmationNotificationIntent,
  ReservationConfirmationNotificationType,
} from "@/types/email-notification";
import type {
  ArrivalInstructionsEmailTemplateInput,
  ReservationEmailTemplateInput,
  ReservationEmailTemplateReservation,
  TransactionalEmailContent,
} from "@/types/email-template";

import { EmailProviderError } from "./provider";
import { createResendEmailProvider } from "./resend-provider";
import {
  calculateNextEmailNotificationAttemptAt,
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
} from "./retry-policy";

const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

const SAFE_DELIVERY_ERROR_MESSAGES: Readonly<
  Record<EmailNotificationDeliveryErrorCode, string>
> = {
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
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
};

const notificationTypeConfiguration = {
  RESERVATION_CONFIRMED: {
    prismaType: EmailNotificationType.RESERVATION_CONFIRMED,
    deduplicationPrefix: "reservation-confirmed",
  },
  ADMIN_NEW_RESERVATION: {
    prismaType: EmailNotificationType.ADMIN_NEW_RESERVATION,
    deduplicationPrefix: "admin-new-reservation",
  },
} as const;

type ReservationForNotificationIntent = Readonly<{
  id: string;
  guestEmail: string;
  preferredLocale: string;
}>;

type ReservationNotificationRouting = Readonly<{
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
}>;

type ImmediateDeliveryOptions = Readonly<{
  source?: NodeJS.ProcessEnv;
  provider?: EmailProvider;
  now?: () => Date;
}>;

type ClaimedNotification = NonNullable<
  Awaited<ReturnType<typeof readClaimedNotification>>
>;

function normalizeRecipient(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLocale(value: string): "es" | "en" | null {
  return value === "es" || value === "en" ? value : null;
}

function getConfiguredAdminRecipients(source: NodeJS.ProcessEnv): string[] {
  const configuredRecipients = source.EMAIL_ADMIN_RECIPIENTS?.split(",") ?? [];
  const validRecipients = configuredRecipients.flatMap((recipient) => {
    const parsedRecipient = recipientSchema.safeParse(recipient);

    return parsedRecipient.success ? [parsedRecipient.data] : [];
  });

  return Array.from(new Set(validRecipients));
}

function getEnvironmentAdminFallback(source: NodeJS.ProcessEnv): string {
  return source.TRP_ENVIRONMENT === "production"
    ? environmentConfig.production.adminEmail
    : environmentConfig.test.adminEmail;
}

function resolveReservationNotificationRouting(
  source: NodeJS.ProcessEnv = process.env,
): ReservationNotificationRouting {
  const configuredRecipients = getConfiguredAdminRecipients(source);

  return {
    adminRecipients:
      configuredRecipients.length > 0
        ? configuredRecipients
        : [getEnvironmentAdminFallback(source)],
    adminLocale: source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es",
  };
}

function buildDeduplicationKey(
  input: Readonly<{
    type: ReservationConfirmationNotificationType;
    reservationId: string;
    recipient: string;
  }>,
): string {
  const configuration = notificationTypeConfiguration[input.type];

  return `${configuration.deduplicationPrefix}/${input.reservationId}/${normalizeRecipient(input.recipient)}`;
}

async function upsertNotificationIntent(
  tx: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    type: ReservationConfirmationNotificationType;
    recipient: string;
    locale: "es" | "en";
  }>,
): Promise<ReservationConfirmationNotificationIntent> {
  const recipient = normalizeRecipient(input.recipient);
  const configuration = notificationTypeConfiguration[input.type];
  const notification = await tx.emailNotification.upsert({
    where: {
      deduplicationKey: buildDeduplicationKey({
        type: input.type,
        reservationId: input.reservationId,
        recipient,
      }),
    },
    update: {},
    create: {
      reservationId: input.reservationId,
      type: configuration.prismaType,
      recipient,
      locale: input.locale,
      deduplicationKey: buildDeduplicationKey({
        type: input.type,
        reservationId: input.reservationId,
        recipient,
      }),
      status: EmailNotificationStatus.PENDING,
    },
    select: {
      id: true,
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  return {
    id: notification.id,
    type: notification.type as ReservationConfirmationNotificationType,
    recipient: notification.recipient,
    locale: normalizeLocale(notification.locale) ?? input.locale,
    status: notification.status,
  };
}

export async function createReservationConfirmationNotificationIntents(
  tx: Prisma.TransactionClient,
  reservation: ReservationForNotificationIntent,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly ReservationConfirmationNotificationIntent[]> {
  const routing = resolveReservationNotificationRouting(source);
  const guestLocale = normalizeLocale(reservation.preferredLocale) ?? "es";
  const intents: ReservationConfirmationNotificationIntent[] = [];

  intents.push(
    await upsertNotificationIntent(tx, {
      reservationId: reservation.id,
      type: "RESERVATION_CONFIRMED",
      recipient: reservation.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const adminRecipient of routing.adminRecipients) {
    intents.push(
      await upsertNotificationIntent(tx, {
        reservationId: reservation.id,
        type: "ADMIN_NEW_RESERVATION",
        recipient: adminRecipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

async function claimPendingNotification(
  notificationId: string,
  processingStartedAt: Date,
): Promise<EmailNotificationClaim | null> {
  const candidate = await prisma.emailNotification.findFirst({
    where: {
      id: notificationId,
      status: EmailNotificationStatus.PENDING,
      manualResends: { none: {} },
      attemptCount: {
        lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS,
      },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: processingStartedAt } },
      ],
    },
    select: {
      updatedAt: true,
    },
  });

  if (!candidate) {
    return null;
  }

  const result = await prisma.emailNotification.updateMany({
    where: {
      id: notificationId,
      updatedAt: candidate.updatedAt,
      status: EmailNotificationStatus.PENDING,
      manualResends: { none: {} },
      attemptCount: {
        lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS,
      },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: processingStartedAt } },
      ],
    },
    data: {
      status: EmailNotificationStatus.PROCESSING,
      attemptCount: {
        increment: 1,
      },
      lastAttemptAt: processingStartedAt,
      processingStartedAt,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  if (result.count !== 1) {
    return null;
  }

  return {
    notificationId,
    processingStartedAt,
  };
}

async function readClaimedNotification(claim: EmailNotificationClaim) {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: {
      id: true,
      type: true,
      recipient: true,
      locale: true,
      deduplicationKey: true,
      status: true,
      attemptCount: true,
      reservationCheckInDateSnapshot: true,
      arrivalInstructionsVersion: true,
      reservation: {
        select: {
          id: true,
          status: true,
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          guestCountry: true,
          preferredLocale: true,
          checkInDate: true,
          checkOutDate: true,
          guestCount: true,
          arrivalTimeEstimate: true,
          total: true,
          currency: true,
          confirmedAt: true,
          property: {
            select: {
              nameEs: true,
              nameEn: true,
              checkInTime: true,
              arrivalInstructions: {
                select: {
                  enabled: true,
                  exactAddress: true,
                  mapUrl: true,
                  instructionsEs: true,
                  instructionsEn: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

function toDateOnlyString(value: Date): `${number}-${number}-${number}` {
  return value.toISOString().slice(0, 10) as `${number}-${number}-${number}`;
}

class EmailNotificationDeliveryError extends Error {
  readonly code: EmailNotificationDeliveryErrorCode;
  readonly retryable: boolean;

  constructor(code: EmailNotificationDeliveryErrorCode, retryable: boolean) {
    super(SAFE_DELIVERY_ERROR_MESSAGES[code]);
    this.name = "EmailNotificationDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

function buildTemplateReservation(
  notification: ClaimedNotification,
): ReservationEmailTemplateReservation {
  const reservation = notification.reservation;
  const preferredLocale = normalizeLocale(reservation.preferredLocale);

  if (!preferredLocale || !reservation.confirmedAt) {
    throw new EmailNotificationDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }

  return {
    id: reservation.id,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    guestCountry: reservation.guestCountry,
    preferredLocale,
    propertyNameEs: reservation.property.nameEs,
    propertyNameEn: reservation.property.nameEn,
    checkInDate: toDateOnlyString(reservation.checkInDate),
    checkOutDate: toDateOnlyString(reservation.checkOutDate),
    guestCount: reservation.guestCount,
    arrivalTimeEstimate: reservation.arrivalTimeEstimate,
    total: reservation.total.toString(),
    currency: reservation.currency,
    confirmedAt: reservation.confirmedAt.toISOString(),
  };
}

async function buildNotificationContent(
  notification: ClaimedNotification,
  publicBaseUrl: string,
  brandLogoUrl: string,
): Promise<TransactionalEmailContent> {
  const locale = normalizeLocale(notification.locale);

  if (!locale) {
    throw new EmailNotificationDeliveryError(
      "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
      false,
    );
  }

  const input: ReservationEmailTemplateInput = {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    reservation: buildTemplateReservation(notification),
  };

  if (notification.type === EmailNotificationType.RESERVATION_CONFIRMED) {
    return buildReservationConfirmedEmail(input);
  }

  if (notification.type === EmailNotificationType.ADMIN_NEW_RESERVATION) {
    return buildAdminNewReservationEmail(input);
  }

  if (notification.type === EmailNotificationType.ARRIVAL_INSTRUCTIONS) {
    const settings = notification.reservation.property.arrivalInstructions;

    if (
      !settings?.enabled ||
      !settings.exactAddress?.trim() ||
      !settings.instructionsEs?.trim() ||
      !settings.instructionsEn?.trim()
    ) {
      throw new EmailNotificationDeliveryError(
        "EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED",
        false,
      );
    }

    const arrivalInput: ArrivalInstructionsEmailTemplateInput = {
      ...input,
      arrival: {
        checkInTime: notification.reservation.property.checkInTime,
        exactAddress: settings.exactAddress,
        mapUrl: settings.mapUrl,
        instructions:
          locale === "es" ? settings.instructionsEs : settings.instructionsEn,
      },
    };

    return buildArrivalInstructionsEmail(arrivalInput);
  }

  throw new EmailNotificationDeliveryError(
    "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
    false,
  );
}

type ArrivalInstructionsSkipReason = Readonly<{
  code:
    | "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED"
    | "EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED";
  message: string;
}>;

function getArrivalInstructionsSkipReason(
  notification: ClaimedNotification,
): ArrivalInstructionsSkipReason | null {
  if (notification.type !== EmailNotificationType.ARRIVAL_INSTRUCTIONS) {
    return null;
  }

  const reservation = notification.reservation;
  const settings = reservation.property.arrivalInstructions;
  const snapshot = notification.reservationCheckInDateSnapshot;
  const version = notification.arrivalInstructionsVersion;

  if (
    reservation.status !== ReservationStatus.CONFIRMED ||
    !snapshot ||
    toDateOnlyString(snapshot) !== toDateOnlyString(reservation.checkInDate) ||
    !version ||
    !settings ||
    settings.updatedAt.getTime() !== version.getTime()
  ) {
    return {
      code: "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED",
      message: SAFE_DELIVERY_ERROR_MESSAGES.EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED,
    };
  }

  if (
    !settings.enabled ||
    !settings.exactAddress?.trim() ||
    !settings.instructionsEs?.trim() ||
    !settings.instructionsEn?.trim()
  ) {
    return {
      code: "EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED",
      message: SAFE_DELIVERY_ERROR_MESSAGES.EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED,
    };
  }

  return null;
}

async function markNotificationSkipped(
  claim: EmailNotificationClaim,
  reason: ArrivalInstructionsSkipReason,
): Promise<boolean> {
  const result = await prisma.emailNotification.updateMany({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: EmailNotificationStatus.SKIPPED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: reason.code,
      errorMessage: reason.message,
    },
  });

  return result.count === 1;
}

function normalizeDeliveryError(
  error: unknown,
): EmailNotificationDeliveryError {
  if (error instanceof EmailNotificationDeliveryError) {
    return error;
  }

  if (error instanceof EmailProviderError) {
    return new EmailNotificationDeliveryError(error.code, error.retryable);
  }

  if (error instanceof EmailTemplateDataError) {
    return new EmailNotificationDeliveryError(
      "EMAIL_TEMPLATE_INVALID_DATA",
      false,
    );
  }

  return new EmailNotificationDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markNotificationSent(
  claim: EmailNotificationClaim,
  providerMessageId: string,
  sentAt: Date,
): Promise<void> {
  const result = await prisma.emailNotification.updateMany({
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

  if (result.count !== 1) {
    throw new EmailNotificationDeliveryError(
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
      true,
    );
  }
}

async function markNotificationFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: EmailNotificationDeliveryError,
  failedAt: Date,
): Promise<Date | null> {
  const nextAttemptAt = error.retryable
    ? calculateNextEmailNotificationAttemptAt(attemptCount, failedAt)
    : null;

  try {
    const result = await prisma.emailNotification.updateMany({
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

    return result.count === 1 ? nextAttemptAt : null;
  } catch {
    // The confirmed reservation must remain successful even when delivery audit persistence fails.
    return null;
  }
}

export async function deliverClaimedEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimedNotification(input.claim);

  if (!notification) {
    return {
      outcome: "skipped",
      retryScheduled: false,
    };
  }

  const skipReason = getArrivalInstructionsSkipReason(notification);

  if (skipReason) {
    await markNotificationSkipped(input.claim, skipReason);

    return {
      outcome: "skipped",
      retryScheduled: false,
    };
  }

  try {
    const locale = normalizeLocale(notification.locale);

    if (!locale) {
      throw new EmailNotificationDeliveryError(
        "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
        false,
      );
    }

    const content = await buildNotificationContent(
      notification,
      input.publicBaseUrl,
      input.brandLogoUrl,
    );
    const result = await input.provider.send({
      intendedRecipient: notification.recipient,
      locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });

    await markNotificationSent(
      input.claim,
      result.providerMessageId,
      input.now(),
    );

    return {
      outcome: "sent",
      retryScheduled: false,
    };
  } catch (error) {
    const failedAt = input.now();
    const nextAttemptAt = await markNotificationFailed(
      input.claim,
      notification.attemptCount,
      normalizeDeliveryError(error),
      failedAt,
    );

    return {
      outcome: "failed",
      retryScheduled: nextAttemptAt !== null,
    };
  }
}

export async function deliverPendingEmailNotificationsBestEffort(
  notificationIds: readonly string[],
  options: ImmediateDeliveryOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  const uniqueNotificationIds = Array.from(
    new Set(notificationIds.map((id) => id.trim()).filter(Boolean)),
  );
  const emptySummary = {
    requested: uniqueNotificationIds.length,
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
    return {
      deliveryMode: "unavailable",
      ...emptySummary,
    };
  }

  if (emailEnv.deliveryMode === "disabled") {
    return {
      deliveryMode: "disabled",
      ...emptySummary,
    };
  }

  let provider: EmailProvider;

  try {
    provider = options.provider ?? createResendEmailProvider(source);
  } catch {
    return {
      deliveryMode: "unavailable",
      ...emptySummary,
    };
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const notificationId of uniqueNotificationIds) {
    try {
      const claim = await claimPendingNotification(notificationId, now());

      if (!claim) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const outcome = await deliverClaimedEmailNotification({
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

        if (outcome.retryScheduled) {
          retryScheduled += 1;
        }
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    deliveryMode: emailEnv.deliveryMode,
    requested: uniqueNotificationIds.length,
    attempted,
    sent,
    failed,
    retryScheduled,
    skipped,
  };
}

export async function deliverReservationConfirmationNotificationsBestEffort(
  notificationIds: readonly string[],
  options: ImmediateDeliveryOptions = {},
): Promise<ImmediateEmailDeliverySummary> {
  return deliverPendingEmailNotificationsBestEffort(notificationIds, options);
}
