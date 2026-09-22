import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
  ReviewModerationStatus,
} from "@prisma/client";

import { buildAdminReviewSubmittedEmail } from "@/emails";
import {
  buildAdminReviewSubmittedNotificationKey,
  deliverAdminReviewSubmittedNotificationsBestEffort,
  deliverClaimedReviewSubmittedEmailNotification,
  isReviewSubmittedNotificationType,
} from "@/lib/email/review-submitted-notifications";
import { EmailProviderError } from "@/lib/email/provider";
import { processEmailNotifications } from "@/lib/email/process-email-notifications";
import {
  resolveAdminNotificationRouting,
} from "@/lib/email/admin-notification-routing";
import { prisma } from "@/lib/db/prisma";
import { environmentConfig } from "@/config/site";
import type { EmailProvider } from "@/types/email-provider";

import { test } from "./harness";

const ROOT = process.cwd();
const E_FOLLOW_UP_NOW = new Date("2026-09-21T22:00:00.000Z");
const BRAND_LOGO_URL =
  "https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png";
const PUBLIC_BASE_URL = "http://localhost:3000";

type MutableReview = {
  id: string;
  reservationId: string;
  rating: number;
  comment: string;
  guestDisplayName: string;
  submittedAt: Date;
  moderationStatus: ReviewModerationStatus;
  publishedAt: Date | null;
  moderatedAt: Date | null;
  moderatedByAdminId: string | null;
};

type MutableReservation = {
  id: string;
  property: {
    nameEs: string;
    nameEn: string;
  };
  review: MutableReview | null;
};

type MutableNotification = {
  id: string;
  reservationId: string;
  type: EmailNotificationType;
  recipient: string;
  locale: string;
  deduplicationKey: string;
  origin: EmailNotificationOrigin;
  status: EmailNotificationStatus;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  processingStartedAt: Date | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EFollowUpStore = {
  reservations: MutableReservation[];
  notifications: MutableNotification[];
};

type ProviderSend = Parameters<EmailProvider["send"]>[0];

function buildReview(overrides: Partial<MutableReview> = {}): MutableReview {
  return {
    id: "review-follow-up-1",
    reservationId: "reservation-follow-up-1",
    rating: 5,
    comment: "Excelente estadía\n<script>alert('x')</script>",
    guestDisplayName: "Juana G.",
    submittedAt: E_FOLLOW_UP_NOW,
    moderationStatus: ReviewModerationStatus.PENDING,
    publishedAt: null,
    moderatedAt: null,
    moderatedByAdminId: null,
    ...overrides,
  };
}

function buildReservation(
  overrides: Partial<MutableReservation> = {},
): MutableReservation {
  const review = overrides.review ?? buildReview();

  return {
    id: "reservation-follow-up-1",
    property: {
      nameEs: "Bungalow del Lago",
      nameEn: "Lake Bungalow",
    },
    review,
    ...overrides,
  };
}

function buildNotification(
  overrides: Partial<MutableNotification> = {},
): MutableNotification {
  const reviewId =
    overrides.deduplicationKey?.split("/")[1] ?? "review-follow-up-1";
  const recipient = overrides.recipient ?? "admin@juantzun.dev";

  return {
    id: "admin-review-notification-follow-up-1",
    reservationId: "reservation-follow-up-1",
    type: EmailNotificationType.ADMIN_REVIEW_SUBMITTED,
    recipient,
    locale: "es",
    deduplicationKey: buildAdminReviewSubmittedNotificationKey(
      reviewId,
      recipient,
    ),
    origin: EmailNotificationOrigin.AUTOMATIC,
    status: EmailNotificationStatus.PROCESSING,
    attemptCount: 1,
    nextAttemptAt: null,
    lastAttemptAt: E_FOLLOW_UP_NOW,
    processingStartedAt: E_FOLLOW_UP_NOW,
    providerMessageId: null,
    sentAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: E_FOLLOW_UP_NOW,
    updatedAt: E_FOLLOW_UP_NOW,
    ...overrides,
  };
}

function createStore(
  input: Readonly<{
    reservation?: MutableReservation;
    notification?: MutableNotification;
  }> = {},
): EFollowUpStore {
  return {
    reservations: [input.reservation ?? buildReservation()],
    notifications: [input.notification ?? buildNotification()],
  };
}

function createEmailSource(): NodeJS.ProcessEnv {
  return {
    TRP_ENVIRONMENT: "local",
    DATABASE_URL:
      "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking",
    DIRECT_URL:
      "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking",
    AUTH_SECRET: "final-e-follow-up-auth-secret-at-least-32-chars",
    AUTH_TRUST_HOST: "true",
    AUTH_GOOGLE_ID: "final-e-follow-up-google-id",
    AUTH_GOOGLE_SECRET: "final-e-follow-up-google-secret",
    AUTH_ALLOWED_ADMIN_EMAILS: "admin@juantzun.dev",
    EXTERNAL_CALENDAR_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    CLOUDINARY_CLOUD_NAME: "trpbookingtest",
    CLOUDINARY_API_KEY: "123456789012345",
    CLOUDINARY_API_SECRET: "final-e-follow-up-cloudinary-secret",
    CLOUDINARY_UPLOAD_FOLDER: "trp-booking/final-e-follow-up",
    TILOPAY_ENVIRONMENT: "sandbox",
    TILOPAY_API_KEY: "final-e-follow-up-api-key",
    TILOPAY_API_USER: "final-e-follow-up-api-user",
    TILOPAY_API_PASSWORD: "final-e-follow-up-api-password",
    TILOPAY_REDIRECT_URL:
      "http://localhost:3000/api/payments/tilopay/redirect",
    TILOPAY_SUCCESS_URL: "http://localhost:3000/reservas/pago/exitoso",
    TILOPAY_CANCEL_URL: "http://localhost:3000/reservas/pago/cancelado",
    TILOPAY_ERROR_URL: "http://localhost:3000/reservas/pago/error",
    TILOPAY_WEBHOOK_URL: "http://localhost:3000/api/payments/tilopay/webhook",
    EMAIL_DELIVERY_MODE: "test",
    RESEND_API_KEY: "re_finalefollowuptests",
    EMAIL_FROM_ES:
      "Tu Refugio Perfecto Local <reservas@mail.trp-booking.juantzun.dev>",
    EMAIL_FROM_EN:
      "Tu Refugio Perfecto Local <reservations@mail.trp-booking.juantzun.dev>",
    EMAIL_REPLY_TO_ES: "reservas@juantzun.dev",
    EMAIL_REPLY_TO_EN: "reservations@juantzun.dev",
    EMAIL_ADMIN_RECIPIENTS: "admin@juantzun.dev",
    EMAIL_ADMIN_LOCALE: "es",
    EMAIL_PUBLIC_BASE_URL: PUBLIC_BASE_URL,
    EMAIL_BRAND_LOGO_URL: BRAND_LOGO_URL,
    EMAIL_TEST_RECIPIENT: "local-admin-review-inbox@example.com",
    VERCEL_ENV: "development",
    NODE_ENV: "test",
  };
}

function createProvider(
  options: Readonly<{ fail?: boolean }> = {},
): EmailProvider & { calls: ProviderSend[]; sent: ProviderSend[] } {
  return {
    calls: [],
    sent: [],
    async send(input) {
      this.calls.push(input);

      if (options.fail) {
        throw new EmailProviderError(
          "EMAIL_PROVIDER_TEMPORARY_FAILURE",
          true,
        );
      }

      this.sent.push(input);

      return {
        provider: "resend",
        providerMessageId: "resend-admin-review-follow-up",
        deliveryMode: "test",
        deliveredRecipient: input.intendedRecipient,
      };
    },
  };
}

function applyNotificationUpdate(
  notification: MutableNotification,
  data: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(data)) {
    if (
      key === "attemptCount" &&
      typeof value === "object" &&
      value !== null &&
      "increment" in value
    ) {
      notification.attemptCount += Number(
        (value as Readonly<{ increment: number }>).increment,
      );
      continue;
    }

    Object.assign(notification, { [key]: value });
  }
}

function installDeliveryPrisma(store: EFollowUpStore): void {
  const client = {
    emailNotification: {
      async findFirst(args: {
        where: {
          id: string;
          type?: EmailNotificationType;
          status: EmailNotificationStatus;
          processingStartedAt?: Date;
        };
      }) {
        const notification = store.notifications.find(
          (candidate) =>
            candidate.id === args.where.id &&
            (!args.where.type || candidate.type === args.where.type) &&
            candidate.status === args.where.status &&
            (!args.where.processingStartedAt ||
              candidate.processingStartedAt?.getTime() ===
                args.where.processingStartedAt.getTime()),
        );

        if (!notification) {
          return null;
        }

        const reservation =
          store.reservations.find(
            (candidate) => candidate.id === notification.reservationId,
          ) ?? null;

        if (!reservation) {
          return null;
        }

        return {
          ...notification,
          reservation,
        };
      },
      async findMany(
        args: {
          where?: {
            id?: { in?: readonly string[] };
            type?: { in?: readonly EmailNotificationType[] };
          };
        } = {},
      ) {
        const ids = new Set(args.where?.id?.in ?? []);
        const allowedTypes = args.where?.type?.in
          ? new Set(args.where.type.in)
          : null;

        return store.notifications
          .filter(
            (notification) =>
              (ids.size === 0 || ids.has(notification.id)) &&
              (!allowedTypes || allowedTypes.has(notification.type)),
          )
          .map((notification) => ({
            id: notification.id,
            type: notification.type,
            status: notification.status,
            updatedAt: notification.updatedAt,
          }));
      },
      async updateMany(args: {
        where: {
          id?: string;
          status?: EmailNotificationStatus;
          processingStartedAt?: Date;
          updatedAt?: Date;
        };
        data: Record<string, unknown>;
      }) {
        const notification = store.notifications.find(
          (candidate) =>
            (!args.where.id || candidate.id === args.where.id) &&
            (!args.where.status || candidate.status === args.where.status) &&
            (!args.where.updatedAt ||
              candidate.updatedAt.getTime() === args.where.updatedAt.getTime()) &&
            (!args.where.processingStartedAt ||
              candidate.processingStartedAt?.getTime() ===
                args.where.processingStartedAt.getTime()),
        );

        if (!notification) {
          return { count: 0 };
        }

        applyNotificationUpdate(notification, args.data);
        return { count: 1 };
      },
    },
    reservationLifecycleRequest: {
      async findMany() {
        return [];
      },
    },
    async $transaction(
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) {
      return callback(client as unknown as Prisma.TransactionClient);
    },
  };

  Object.assign(prisma as unknown as typeof client, client);
}

test("Final-E follow-up admin routing normalizes, deduplicates and falls back safely", () => {
  const configured = resolveAdminNotificationRouting({
    TRP_ENVIRONMENT: "test",
    EMAIL_ADMIN_RECIPIENTS:
      " Admin@Example.com, second@example.com, invalid, admin@example.com ",
    EMAIL_ADMIN_LOCALE: "en",
  } as NodeJS.ProcessEnv);
  const fallback = resolveAdminNotificationRouting({
    TRP_ENVIRONMENT: "test",
    EMAIL_ADMIN_RECIPIENTS: " , not-an-email ",
    EMAIL_ADMIN_LOCALE: "fr",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(configured.adminRecipients, [
    "admin@example.com",
    "second@example.com",
  ]);
  assert.equal(configured.adminLocale, "en");
  assert.deepEqual(fallback.adminRecipients, [
    environmentConfig.test.adminEmail,
  ]);
  assert.equal(fallback.adminLocale, "es");
});

test("Final-E follow-up admin review email renders ES/EN safely without private reservation or financial data", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildAdminReviewSubmittedEmail({
      locale,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      review: {
        propertyNameEs: "Bungalow del Lago",
        propertyNameEn: "Lake Bungalow",
        guestDisplayName: "Juana G.",
        rating: 5,
        comment: "<strong>Excelente</strong>\nGracias",
        submittedAt: E_FOLLOW_UP_NOW.toISOString(),
      },
    });
    const combined = `${content.subject}\n${content.html}\n${content.text}`;

    assert.equal(
      content.subject,
      locale === "es"
        ? "Nueva reseña recibida · Bungalow del Lago"
        : "New review received · Lake Bungalow",
    );
    assert.match(combined, locale === "es" ? /Bungalow del Lago/ : /Lake Bungalow/);
    assert.match(combined, /Juana G\./);
    assert.match(combined, /5 \/ 5/);
    assert.match(combined, /\/admin\/reviews/);
    assert.equal(content.html.includes("<strong>Excelente</strong>"), false);
    assert.equal(content.html.includes("&lt;strong&gt;Excelente&lt;/strong&gt;"), true);
    assert.equal(content.text.includes("<strong>Excelente</strong>"), true);
    assert.doesNotMatch(
      combined,
      /reservation-follow-up-1|guest@example\.com|payment|refund|Tilopay|token|hash|encrypted|provider/i,
    );
  }

  const templateSource = readFileSync(
    path.join(ROOT, "emails/admin-review-submitted-email.tsx"),
    "utf8",
  );

  assert.equal(templateSource.includes("dangerouslySetInnerHTML"), false);
});

test("Final-E follow-up delivery sends ADMIN_REVIEW_SUBMITTED notifications as admin audience", async () => {
  const store = createStore();
  const provider = createProvider();

  installDeliveryPrisma(store);

  const result = await deliverClaimedReviewSubmittedEmailNotification({
    claim: {
      notificationId: "admin-review-notification-follow-up-1",
      processingStartedAt: E_FOLLOW_UP_NOW,
    },
    provider,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    now: () => E_FOLLOW_UP_NOW,
  });

  assert.equal(result.outcome, "sent");
  assert.equal(result.retryScheduled, false);
  assert.equal(provider.sent.length, 1);
  assert.equal(provider.sent[0].audience, "admin");
  assert.equal(provider.sent[0].locale, "es");
  assert.equal(
    provider.sent[0].idempotencyKey,
    "admin-review-submitted/review-follow-up-1/admin@juantzun.dev",
  );
  assert.match(provider.sent[0].html, /Excelente estadía/);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
  assert.equal(
    store.notifications[0].providerMessageId,
    "resend-admin-review-follow-up",
  );
});

test("Final-E follow-up immediate helper claims explicit ADMIN_REVIEW_SUBMITTED IDs and sends after commit", async () => {
  const store = createStore({
    notification: buildNotification({
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      processingStartedAt: null,
    }),
  });
  const provider = createProvider();

  installDeliveryPrisma(store);

  const result = await deliverAdminReviewSubmittedNotificationsBestEffort(
    ["admin-review-notification-follow-up-1"],
    {
      source: createEmailSource(),
      provider,
      now: () => E_FOLLOW_UP_NOW,
    },
  );

  assert.deepEqual(result, {
    deliveryMode: "test",
    requested: 1,
    attempted: 1,
    sent: 1,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  });
  assert.equal(provider.calls.length, 1);
  assert.equal(provider.sent.length, 1);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
  assert.equal(store.notifications[0].attemptCount, 1);
  assert.equal(
    store.notifications[0].lastAttemptAt?.toISOString(),
    E_FOLLOW_UP_NOW.toISOString(),
  );
});

test("Final-E follow-up immediate helper records retryable provider failure and cron fallback later sends it", async () => {
  const store = createStore({
    notification: buildNotification({
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      processingStartedAt: null,
    }),
  });
  const failingProvider = createProvider({ fail: true });

  installDeliveryPrisma(store);

  const immediate = await deliverAdminReviewSubmittedNotificationsBestEffort(
    ["admin-review-notification-follow-up-1"],
    {
      source: createEmailSource(),
      provider: failingProvider,
      now: () => E_FOLLOW_UP_NOW,
    },
  );

  assert.equal(immediate.deliveryMode, "test");
  assert.equal(immediate.requested, 1);
  assert.equal(immediate.attempted, 1);
  assert.equal(immediate.failed, 1);
  assert.equal(immediate.retryScheduled, 1);
  assert.equal(failingProvider.calls.length, 1);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.FAILED);
  assert.equal(
    store.notifications[0].errorCode,
    "EMAIL_PROVIDER_TEMPORARY_FAILURE",
  );
  assert.notEqual(store.notifications[0].nextAttemptAt, null);

  const retryProvider = createProvider();
  const retryNow =
    store.notifications[0].nextAttemptAt ??
    new Date(E_FOLLOW_UP_NOW.getTime() + 5 * 60_000);
  const retried = await processEmailNotifications({
    source: createEmailSource(),
    provider: retryProvider,
    now: () => retryNow,
  });

  assert.equal(retried.sent, 1);
  assert.equal(retryProvider.calls.length, 1);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
  assert.equal(store.notifications.length, 1);
});

test("Final-E follow-up immediate helper leaves durable intent PENDING when delivery environment is unavailable before claim", async () => {
  const store = createStore({
    notification: buildNotification({
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      processingStartedAt: null,
    }),
  });
  const provider = createProvider();

  installDeliveryPrisma(store);

  const result = await deliverAdminReviewSubmittedNotificationsBestEffort(
    ["admin-review-notification-follow-up-1"],
    {
      source: {} as NodeJS.ProcessEnv,
      provider,
      now: () => E_FOLLOW_UP_NOW,
    },
  );

  assert.deepEqual(result, {
    deliveryMode: "unavailable",
    requested: 1,
    attempted: 0,
    sent: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  });
  assert.equal(provider.calls.length, 0);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.PENDING);
  assert.equal(store.notifications[0].attemptCount, 0);
});

test("Final-E follow-up immediate helper attempts each explicit admin recipient independently", async () => {
  const secondNotification = buildNotification({
    id: "admin-review-notification-follow-up-2",
    recipient: "ops@juantzun.dev",
    deduplicationKey: buildAdminReviewSubmittedNotificationKey(
      "review-follow-up-1",
      "ops@juantzun.dev",
    ),
    status: EmailNotificationStatus.PENDING,
    attemptCount: 0,
    lastAttemptAt: null,
    processingStartedAt: null,
  });
  const store = createStore({
    notification: buildNotification({
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      processingStartedAt: null,
    }),
  });
  const provider = createProvider();

  store.notifications.push(secondNotification);
  installDeliveryPrisma(store);

  const result = await deliverAdminReviewSubmittedNotificationsBestEffort(
    [
      "admin-review-notification-follow-up-1",
      "admin-review-notification-follow-up-2",
    ],
    {
      source: createEmailSource(),
      provider,
      now: () => E_FOLLOW_UP_NOW,
    },
  );

  assert.equal(result.requested, 2);
  assert.equal(result.attempted, 2);
  assert.equal(result.sent, 2);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(
    provider.calls.map((call) => call.intendedRecipient).sort(),
    ["admin@juantzun.dev", "ops@juantzun.dev"],
  );
  assert.equal(store.notifications.length, 2);
  assert.deepEqual(
    store.notifications.map((notification) => notification.status),
    [EmailNotificationStatus.SENT, EmailNotificationStatus.SENT],
  );
});

test("Final-E follow-up delivery retries provider failures without mutating Review or Invitation state", async () => {
  const review = buildReview();
  const store = createStore({
    reservation: buildReservation({ review }),
  });
  const failingProvider = createProvider({ fail: true });

  installDeliveryPrisma(store);

  const failed = await deliverClaimedReviewSubmittedEmailNotification({
    claim: {
      notificationId: "admin-review-notification-follow-up-1",
      processingStartedAt: E_FOLLOW_UP_NOW,
    },
    provider: failingProvider,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    now: () => E_FOLLOW_UP_NOW,
  });

  assert.equal(failed.outcome, "failed");
  assert.equal(failed.retryScheduled, true);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.FAILED);
  assert.equal(
    store.notifications[0].errorCode,
    "EMAIL_PROVIDER_TEMPORARY_FAILURE",
  );
  assert.notEqual(store.notifications[0].nextAttemptAt, null);
  assert.deepEqual(store.reservations[0].review, review);

  store.notifications[0].status = EmailNotificationStatus.PROCESSING;
  store.notifications[0].attemptCount = 2;
  store.notifications[0].processingStartedAt = E_FOLLOW_UP_NOW;
  store.notifications[0].errorCode = null;
  store.notifications[0].errorMessage = null;

  const provider = createProvider();
  const retried = await deliverClaimedReviewSubmittedEmailNotification({
    claim: {
      notificationId: "admin-review-notification-follow-up-1",
      processingStartedAt: E_FOLLOW_UP_NOW,
    },
    provider,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    now: () => new Date(E_FOLLOW_UP_NOW.getTime() + 60_000),
  });

  assert.equal(retried.outcome, "sent");
  assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
  assert.deepEqual(store.reservations[0].review, review);
});

test("Final-E follow-up delivery records a non-retryable safe error for missing or mismatched Review data", async () => {
  const store = createStore({
    reservation: buildReservation({ review: null }),
  });
  const provider = createProvider();

  installDeliveryPrisma(store);

  const result = await deliverClaimedReviewSubmittedEmailNotification({
    claim: {
      notificationId: "admin-review-notification-follow-up-1",
      processingStartedAt: E_FOLLOW_UP_NOW,
    },
    provider,
    publicBaseUrl: PUBLIC_BASE_URL,
    brandLogoUrl: BRAND_LOGO_URL,
    now: () => E_FOLLOW_UP_NOW,
  });

  assert.equal(result.outcome, "failed");
  assert.equal(result.retryScheduled, false);
  assert.equal(provider.sent.length, 0);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.FAILED);
  assert.equal(
    store.notifications[0].errorCode,
    "EMAIL_REVIEW_SUBMITTED_RELATION_MISMATCH",
  );
  assert.equal(store.reservations[0].review, null);
});

test("Final-E follow-up processEmailNotifications routes ADMIN_REVIEW_SUBMITTED before generic fallback", async () => {
  const store = createStore({
    notification: buildNotification({
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      processingStartedAt: null,
    }),
  });
  const provider = createProvider();

  installDeliveryPrisma(store);

  const result = await processEmailNotifications({
    source: createEmailSource(),
    provider,
    now: () => E_FOLLOW_UP_NOW,
  });

  assert.equal(result.deliveryMode, "test");
  assert.equal(result.claimed, 1);
  assert.equal(result.sent, 1);
  assert.equal(isReviewSubmittedNotificationType(
    EmailNotificationType.ADMIN_REVIEW_SUBMITTED,
  ), true);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
});

test("Final-E follow-up source contract locks enum migration dispatcher labels and manual-resend boundary", () => {
  const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
  const migrationDirectories = readdirSync(
    path.join(ROOT, "prisma/migrations"),
  ).filter((name) =>
    statSync(path.join(ROOT, "prisma/migrations", name)).isDirectory(),
  );
  const migrationSql = readFileSync(
    path.join(
      ROOT,
      "prisma/migrations/20260921120000_final_e_owner_acceptance_admin_review_submitted_notification/migration.sql",
    ),
    "utf8",
  );
  const reviewSubmissionSource = readFileSync(
    path.join(ROOT, "lib/reviews/review-submission.ts"),
    "utf8",
  );
  const dispatcherSource = readFileSync(
    path.join(ROOT, "lib/email/process-email-notifications.ts"),
    "utf8",
  );
  const resendSource = readFileSync(
    path.join(ROOT, "lib/admin/email-notification-resend.ts"),
    "utf8",
  );
  const esMessages = readFileSync(path.join(ROOT, "messages/es.ts"), "utf8");
  const enMessages = readFileSync(path.join(ROOT, "messages/en.ts"), "utf8");
  const vercelConfig = JSON.parse(
    readFileSync(path.join(ROOT, "vercel.json"), "utf8"),
  ) as { crons?: unknown[] };
  const reviewSubmittedDispatchIndex = dispatcherSource.indexOf(
    "isReviewSubmittedNotificationType(candidate.type)",
  );
  const genericFallbackIndex = dispatcherSource.indexOf(
    "await deliverClaimedEmailNotification",
    reviewSubmittedDispatchIndex,
  );

  assert.match(schema, /ADMIN_REVIEW_SUBMITTED/);
  assert.equal(
    migrationDirectories.includes(
      "20260921120000_final_e_owner_acceptance_admin_review_submitted_notification",
    ),
    true,
  );
  assert.equal(migrationDirectories.length >= 22, true);
  assert.equal(
    migrationSql.trim(),
    "ALTER TYPE \"email_notification_type\" ADD VALUE 'ADMIN_REVIEW_SUBMITTED';",
  );
  assert.match(
    reviewSubmissionSource,
    /createAdminReviewSubmittedNotificationIntents/,
  );
  assert.match(
    reviewSubmissionSource,
    /deliverAdminReviewSubmittedNotificationsBestEffort/,
  );
  assert.doesNotMatch(reviewSubmissionSource, /processEmailNotifications/);
  assert.notEqual(reviewSubmittedDispatchIndex, -1);
  assert.notEqual(genericFallbackIndex, -1);
  assert.equal(reviewSubmittedDispatchIndex < genericFallbackIndex, true);
  assert.equal(
    existsSync(path.join(ROOT, "emails/admin-review-submitted-email.tsx")),
    true,
  );
  assert.match(esMessages, /Nueva reseña para administración/);
  assert.match(enMessages, /New review for administration/);
  assert.doesNotMatch(resendSource, /ADMIN_REVIEW_SUBMITTED/);
  assert.deepEqual(vercelConfig.crons, []);
  assert.equal(
    existsSync(path.join(ROOT, "app/api/reviews/[token]/route.ts")),
    true,
  );
  assert.equal(
    existsSync(path.join(ROOT, "app/api/admin/reviews/[reviewId]/route.ts")),
    false,
  );
});
