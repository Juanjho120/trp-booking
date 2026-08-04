import { EmailNotificationType } from "@prisma/client";

import type {
  LifecycleNotificationAudience,
  LifecycleNotificationDeduplicationInput,
  LifecycleNotificationRelationKind,
  LifecycleNotificationType,
} from "@/types/email-notification";

type LifecycleNotificationConfiguration = Readonly<{
  prismaType: EmailNotificationType;
  audience: LifecycleNotificationAudience;
  relationKind: LifecycleNotificationRelationKind;
  deduplicationPrefix: string;
}>;

const lifecycleNotificationConfiguration = {
  RESERVATION_CANCELLED: {
    prismaType: EmailNotificationType.RESERVATION_CANCELLED,
    audience: "guest",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "reservation-cancelled",
  },
  ADMIN_RESERVATION_CANCELLED: {
    prismaType: EmailNotificationType.ADMIN_RESERVATION_CANCELLED,
    audience: "admin",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "admin-reservation-cancelled",
  },
  RESERVATION_DATES_UPDATED: {
    prismaType: EmailNotificationType.RESERVATION_DATES_UPDATED,
    audience: "guest",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "reservation-dates-updated",
  },
  ADMIN_RESERVATION_DATES_UPDATED: {
    prismaType: EmailNotificationType.ADMIN_RESERVATION_DATES_UPDATED,
    audience: "admin",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "admin-reservation-dates-updated",
  },
  STAY_EXTENSION_CONFIRMED: {
    prismaType: EmailNotificationType.STAY_EXTENSION_CONFIRMED,
    audience: "guest",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "stay-extension-confirmed",
  },
  ADMIN_STAY_EXTENSION_CONFIRMED: {
    prismaType: EmailNotificationType.ADMIN_STAY_EXTENSION_CONFIRMED,
    audience: "admin",
    relationKind: "lifecycle-request",
    deduplicationPrefix: "admin-stay-extension-confirmed",
  },
  REFUND_PROCESSED: {
    prismaType: EmailNotificationType.REFUND_PROCESSED,
    audience: "guest",
    relationKind: "refund",
    deduplicationPrefix: "refund-processed",
  },
  ADMIN_REFUND_PROCESSED: {
    prismaType: EmailNotificationType.ADMIN_REFUND_PROCESSED,
    audience: "admin",
    relationKind: "refund",
    deduplicationPrefix: "admin-refund-processed",
  },
} as const satisfies Readonly<
  Record<LifecycleNotificationType, LifecycleNotificationConfiguration>
>;

function normalizeRequiredValue(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new TypeError(`${fieldName} must not be empty.`);
  }

  return normalized;
}

export function normalizeLifecycleNotificationRecipient(
  value: string,
): string {
  return normalizeRequiredValue(value, "recipient").toLowerCase();
}

export function isLifecycleNotificationType(
  value: EmailNotificationType,
): value is LifecycleNotificationType {
  return value in lifecycleNotificationConfiguration;
}

export function getLifecycleNotificationConfiguration(
  type: LifecycleNotificationType,
): LifecycleNotificationConfiguration {
  return lifecycleNotificationConfiguration[type];
}

export function buildLifecycleNotificationDeduplicationKey(
  input: LifecycleNotificationDeduplicationInput,
): string {
  const configuration = getLifecycleNotificationConfiguration(input.type);
  const sourceId =
    "refundId" in input
      ? normalizeRequiredValue(input.refundId, "refundId")
      : normalizeRequiredValue(
          input.lifecycleRequestId,
          "lifecycleRequestId",
        );
  const recipient = normalizeLifecycleNotificationRecipient(input.recipient);

  return `${configuration.deduplicationPrefix}/${sourceId}/${recipient}`;
}
