import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
  ReservationStatus,
  ReviewInvitationStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  buildReviewInvitationEmail,
} from "@/emails";
import {
  deliverClaimedReviewInvitationEmailNotification,
  ensureReviewInvitationAndNotificationIntentForReservation,
  isReviewInvitationNotificationType,
  scheduleReviewInvitations,
} from "@/lib/email/review-invitation-notifications";
import { EmailProviderError } from "@/lib/email/provider";
import { processEmailNotifications } from "@/lib/email/process-email-notifications";
import { listCronJobDefinitions } from "@/lib/cron/registry";
import { prisma } from "@/lib/db/prisma";
import {
  createReviewInvitationTokenMaterial,
  hashReviewInvitationAccessToken,
  type EnsureReviewInvitationResult,
} from "@/lib/reviews";
import { cronJobSlugs } from "@/types/cron-job";
import type { EmailProvider } from "@/types/email-provider";

import { test } from "./harness";

const ROOT = process.cwd();
const E4_NOW = new Date("2026-09-18T19:00:00.000Z");
const E4_TOKEN = "1234567890abcdef".repeat(4);
const E4_TOKEN_HASH = hashReviewInvitationAccessToken(E4_TOKEN);
const BRAND_LOGO_URL =
  "https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png";
const PUBLIC_BASE_URL = "http://localhost:3000";

type MutableInvitation = {
  id: string;
  reservationId: string;
  status: ReviewInvitationStatus;
  accessTokenHash: string;
  accessTokenEncrypted: string | null;
  checkoutAtSnapshot: Date;
  eligibleAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MutableReservation = {
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  guestName: string;
  guestEmail: string;
  preferredLocale: string;
  checkOutDate: Date;
  property: {
    checkOutTime: string | null;
    nameEs: string;
    nameEn: string;
  };
  review: { id: string } | null;
  reviewInvitation: MutableInvitation | null;
};

type MutableNotification = {
  id: string;
  reservationId: string;
  lifecycleRequestId: string | null;
  refundId: string | null;
  guestPaymentRequestId: string | null;
  reviewInvitationId: string | null;
  type: EmailNotificationType;
  recipient: string;
  locale: string;
  deduplicationKey: string;
  origin: EmailNotificationOrigin;
  status: EmailNotificationStatus;
  attemptCount: number;
  scheduledFor: Date | null;
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

type E4Store = {
  reservations: MutableReservation[];
  invitations: MutableInvitation[];
  notifications: MutableNotification[];
  nextInvitation: number;
  nextNotification: number;
};

type MutableNotificationIntentData = Omit<
  MutableNotification,
  | "id"
  | "lifecycleRequestId"
  | "refundId"
  | "guestPaymentRequestId"
  | "attemptCount"
  | "lastAttemptAt"
  | "processingStartedAt"
  | "providerMessageId"
  | "sentAt"
  | "errorCode"
  | "errorMessage"
  | "createdAt"
  | "updatedAt"
>;

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

function cloneInvitation(invitation: MutableInvitation): MutableInvitation {
  return {
    ...invitation,
    checkoutAtSnapshot: cloneDate(invitation.checkoutAtSnapshot),
    eligibleAt: cloneDate(invitation.eligibleAt),
    expiresAt: cloneDate(invitation.expiresAt),
    consumedAt: invitation.consumedAt ? cloneDate(invitation.consumedAt) : null,
    createdAt: cloneDate(invitation.createdAt),
    updatedAt: cloneDate(invitation.updatedAt),
  };
}

function cloneReservation(reservation: MutableReservation): MutableReservation {
  return {
    ...reservation,
    confirmedAt: reservation.confirmedAt ? cloneDate(reservation.confirmedAt) : null,
    cancelledAt: reservation.cancelledAt ? cloneDate(reservation.cancelledAt) : null,
    checkOutDate: cloneDate(reservation.checkOutDate),
    property: { ...reservation.property },
    review: reservation.review ? { ...reservation.review } : null,
    reviewInvitation: reservation.reviewInvitation
      ? cloneInvitation(reservation.reviewInvitation)
      : null,
  };
}

function cloneNotification(notification: MutableNotification): MutableNotification {
  return {
    ...notification,
    scheduledFor: notification.scheduledFor
      ? cloneDate(notification.scheduledFor)
      : null,
    nextAttemptAt: notification.nextAttemptAt
      ? cloneDate(notification.nextAttemptAt)
      : null,
    lastAttemptAt: notification.lastAttemptAt
      ? cloneDate(notification.lastAttemptAt)
      : null,
    processingStartedAt: notification.processingStartedAt
      ? cloneDate(notification.processingStartedAt)
      : null,
    sentAt: notification.sentAt ? cloneDate(notification.sentAt) : null,
    createdAt: cloneDate(notification.createdAt),
    updatedAt: cloneDate(notification.updatedAt),
  };
}

function snapshotStore(store: E4Store): E4Store {
  return {
    reservations: store.reservations.map(cloneReservation),
    invitations: store.invitations.map(cloneInvitation),
    notifications: store.notifications.map(cloneNotification),
    nextInvitation: store.nextInvitation,
    nextNotification: store.nextNotification,
  };
}

function restoreStore(store: E4Store, snapshot: E4Store): void {
  store.reservations = snapshot.reservations.map(cloneReservation);
  store.invitations = snapshot.invitations.map(cloneInvitation);
  store.notifications = snapshot.notifications.map(cloneNotification);
  store.nextInvitation = snapshot.nextInvitation;
  store.nextNotification = snapshot.nextNotification;

  for (const reservation of store.reservations) {
    reservation.reviewInvitation =
      store.invitations.find(
        (invitation) => invitation.reservationId === reservation.id,
      ) ?? null;
  }
}

function buildInvitation(
  overrides: Partial<MutableInvitation> = {},
): MutableInvitation {
  return {
    id: "review-invitation-e4-1",
    reservationId: "reservation-e4-1",
    status: ReviewInvitationStatus.ACTIVE,
    accessTokenHash: E4_TOKEN_HASH,
    accessTokenEncrypted: "encrypted-review-token",
    checkoutAtSnapshot: new Date("2026-09-18T17:00:00.000Z"),
    eligibleAt: new Date("2026-09-18T19:00:00.000Z"),
    expiresAt: new Date("2026-10-18T19:00:00.000Z"),
    consumedAt: null,
    createdAt: E4_NOW,
    updatedAt: E4_NOW,
    ...overrides,
  };
}

function buildReservation(
  overrides: Partial<MutableReservation> = {},
): MutableReservation {
  return {
    id: "reservation-e4-1",
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-09-15T15:00:00.000Z"),
    cancelledAt: null,
    guestName: "Juana Garcia",
    guestEmail: "Guest.E4@Example.com",
    preferredLocale: "es",
    checkOutDate: new Date("2026-09-18T00:00:00.000Z"),
    property: {
      checkOutTime: "11:00",
      nameEs: "Bungalow del Lago",
      nameEn: "Lake Bungalow",
    },
    review: null,
    reviewInvitation: null,
    ...overrides,
  };
}

function buildNotification(
  overrides: Partial<MutableNotification> = {},
): MutableNotification {
  return {
    id: "review-notification-e4-1",
    reservationId: "reservation-e4-1",
    lifecycleRequestId: null,
    refundId: null,
    guestPaymentRequestId: null,
    reviewInvitationId: "review-invitation-e4-1",
    type: EmailNotificationType.REVIEW_INVITATION,
    recipient: "guest.e4@example.com",
    locale: "es",
    deduplicationKey:
      "review-invitation/review-invitation-e4-1/guest.e4@example.com",
    origin: EmailNotificationOrigin.AUTOMATIC,
    status: EmailNotificationStatus.PROCESSING,
    attemptCount: 1,
    scheduledFor: E4_NOW,
    nextAttemptAt: null,
    lastAttemptAt: E4_NOW,
    processingStartedAt: E4_NOW,
    providerMessageId: null,
    sentAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: E4_NOW,
    updatedAt: E4_NOW,
    ...overrides,
  };
}

function createStore(
  reservations: MutableReservation[] = [buildReservation()],
): E4Store {
  const invitations = reservations.flatMap((reservation) =>
    reservation.reviewInvitation ? [reservation.reviewInvitation] : [],
  );

  return {
    reservations,
    invitations,
    notifications: [],
    nextInvitation: invitations.length + 1,
    nextNotification: 1,
  };
}

function makeP2034Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Transaction conflict",
    {
      code: "P2034",
      clientVersion: "final-e4-test",
    },
  );
}

function insertPendingNotificationIntent(
  store: E4Store,
  data: MutableNotificationIntentData,
): MutableNotification {
  const notification = buildNotification({
    ...data,
    id: `review-notification-e4-${store.nextNotification}`,
    recipient: data.recipient,
    status: EmailNotificationStatus.PENDING,
    attemptCount: 0,
    lastAttemptAt: null,
    processingStartedAt: null,
    providerMessageId: null,
    sentAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: E4_NOW,
    updatedAt: E4_NOW,
  });

  store.nextNotification += 1;
  store.notifications.push(notification);

  return notification;
}

function makeAtomicClient(
  store: E4Store,
  options: Readonly<{
    failFirstCommitWithP2034?: boolean;
    loseFirstNotificationIntentRace?: boolean;
  }> = {},
): PrismaClient {
  let transactions = 0;
  const tx = {
    reservation: {
      async findUnique(args: { where: { id: string } }) {
        return (
          store.reservations.find(
            (reservation) => reservation.id === args.where.id,
          ) ?? null
        );
      },
    },
    emailNotification: {
      async findUnique(args: { where: { deduplicationKey: string } }) {
        return (
          store.notifications.find(
            (notification) =>
              notification.deduplicationKey === args.where.deduplicationKey,
          ) ?? null
        );
      },
      async createMany(args: {
        data: MutableNotificationIntentData;
        skipDuplicates?: boolean;
      }) {
        if (args.data.recipient === "fail-intent@example.com") {
          throw new Error("INTENT_CREATE_FAILED");
        }

        const existing = store.notifications.find(
          (notification) =>
            notification.deduplicationKey === args.data.deduplicationKey,
        );

        if (existing) {
          return { count: 0 };
        }

        insertPendingNotificationIntent(store, args.data);

        if (options.loseFirstNotificationIntentRace) {
          return { count: 0 };
        }

        return { count: 1 };
      },
      async create(args: { data: MutableNotificationIntentData }) {
        return insertPendingNotificationIntent(store, args.data);
      },
    },
  };
  const client = {
    get transactions() {
      return transactions;
    },
    async $transaction(
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) {
      transactions += 1;
      const snapshot = snapshotStore(store);

      try {
        const result = await callback(tx as unknown as Prisma.TransactionClient);

        if (options.failFirstCommitWithP2034 && transactions === 1) {
          restoreStore(store, snapshot);
          throw makeP2034Error();
        }

        return result;
      } catch (error) {
        restoreStore(store, snapshot);
        throw error;
      }
    },
  };

  return client as unknown as PrismaClient;
}

function makeEnsureWithStore(store: E4Store) {
  return async function ensure(
    _transaction: Prisma.TransactionClient,
    reservationId: string,
  ): Promise<EnsureReviewInvitationResult> {
    const reservation = store.reservations.find(
      (candidate) => candidate.id === reservationId,
    );

    if (!reservation) {
      return {
        outcome: "not-eligible",
        eligibility: {
          eligible: false,
          reason: "RESERVATION_NOT_FOUND",
        },
      };
    }

    if (reservation.reviewInvitation) {
      return {
        outcome: "existing",
        invitation: reservation.reviewInvitation,
        effectiveStatus: reservation.reviewInvitation.status,
      };
    }

    const invitation = buildInvitation({
      id: `review-invitation-e4-${store.nextInvitation}`,
      reservationId,
    });

    store.nextInvitation += 1;
    store.invitations.push(invitation);
    reservation.reviewInvitation = invitation;

    return {
      outcome: "created",
      invitation,
      tokenMaterial: {
        rawToken: E4_TOKEN,
        tokenHash: E4_TOKEN_HASH,
        encryptedToken: "encrypted-review-token",
      },
      eligibility: {
        eligible: true,
        checkoutAt: invitation.checkoutAtSnapshot,
        eligibleAt: invitation.eligibleAt,
        catchUpStart: new Date("2026-09-11T19:00:00.000Z"),
        compatibility: "CONFIRMED",
      },
    };
  };
}

function makeSchedulerClient(store: E4Store): PrismaClient {
  const tx = {
    reservation: {
      async findUnique(args: { where: { id: string } }) {
        return (
          store.reservations.find(
            (reservation) => reservation.id === args.where.id,
          ) ?? null
        );
      },
      async findMany(args: {
        where: {
          checkOutDate: { gte: Date; lte: Date };
          reviewInvitation: null;
          status?: { in: readonly ReservationStatus[] };
        };
        take?: number;
      }) {
        const allowedStatuses = new Set(args.where.status?.in ?? []);

        return store.reservations
          .filter(
            (reservation) =>
              !reservation.reviewInvitation &&
              !reservation.review &&
              reservation.confirmedAt !== null &&
              (allowedStatuses.size === 0 ||
                allowedStatuses.has(reservation.status)) &&
              reservation.checkOutDate >= args.where.checkOutDate.gte &&
              reservation.checkOutDate <= args.where.checkOutDate.lte,
          )
          .sort(
            (a, b) =>
              a.checkOutDate.getTime() - b.checkOutDate.getTime() ||
              a.id.localeCompare(b.id),
          )
          .slice(0, args.take ?? store.reservations.length)
          .map((reservation) => ({ id: reservation.id }));
      },
    },
    reviewInvitation: {
      async findMany(
        args: {
          where?: {
            status?: ReviewInvitationStatus;
            expiresAt?: { gt?: Date };
            emailNotifications?: {
              none?: { type: EmailNotificationType };
              some?: { type: EmailNotificationType };
            };
          };
          select?: {
            reservationId?: boolean;
            reservation?: unknown;
            emailNotifications?: {
              where?: { type?: EmailNotificationType };
            };
          };
          take?: number;
        } = {},
      ) {
        const notificationType =
          args.where?.emailNotifications?.none?.type ??
          args.where?.emailNotifications?.some?.type;

        return store.invitations
          .filter(
            (invitation) =>
              (!args.where?.status ||
                invitation.status === args.where.status) &&
              (!args.where?.expiresAt?.gt ||
                invitation.expiresAt > args.where.expiresAt.gt),
          )
          .filter((invitation) => {
            if (!notificationType) {
              return true;
            }

            const hasNotification = store.notifications.some(
              (notification) =>
                notification.reviewInvitationId === invitation.id &&
                notification.type === notificationType,
            );

            if (args.where?.emailNotifications?.none) {
              return !hasNotification;
            }

            if (args.where?.emailNotifications?.some) {
              return hasNotification;
            }

            return true;
          })
          .sort(
            (a, b) =>
              a.expiresAt.getTime() - b.expiresAt.getTime() ||
              a.id.localeCompare(b.id),
          )
          .slice(0, args.take ?? store.invitations.length)
          .map((invitation) => {
            const result: {
              reservationId: string;
              reservation?: MutableReservation | null;
              emailNotifications?: { recipient: string }[];
            } = { reservationId: invitation.reservationId };

            if (args.select?.reservation) {
              result.reservation =
                store.reservations.find(
                  (reservation) =>
                    reservation.id === invitation.reservationId,
                ) ?? null;
            }

            if (args.select?.emailNotifications) {
              const selectedType =
                args.select.emailNotifications.where?.type ?? notificationType;

              result.emailNotifications = store.notifications
                .filter(
                  (notification) =>
                    notification.reviewInvitationId === invitation.id &&
                    (!selectedType || notification.type === selectedType),
                )
                .map((notification) => ({
                  recipient: notification.recipient,
                }));
            }

            return result;
          });
      },
      async createMany(args: {
        data: Omit<MutableInvitation, "id" | "updatedAt">;
      }) {
        const existing = store.invitations.find(
          (invitation) => invitation.reservationId === args.data.reservationId,
        );

        if (existing) {
          return { count: 0 };
        }

        const invitation = buildInvitation({
          ...args.data,
          id: `review-invitation-e4-${store.nextInvitation}`,
          updatedAt: args.data.createdAt,
        });
        const reservation = store.reservations.find(
          (candidate) => candidate.id === invitation.reservationId,
        );

        store.nextInvitation += 1;
        store.invitations.push(invitation);

        if (reservation) {
          reservation.reviewInvitation = invitation;
        }

        return { count: 1 };
      },
      async findUnique(args: { where: { reservationId: string } }) {
        return (
          store.invitations.find(
            (invitation) =>
              invitation.reservationId === args.where.reservationId,
          ) ?? null
        );
      },
      async updateMany(args: {
        where: {
          id: string;
          status: ReviewInvitationStatus;
          expiresAt?: { lte: Date };
        };
        data: Partial<MutableInvitation>;
      }) {
        const invitation = store.invitations.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (
          !invitation ||
          invitation.status !== args.where.status ||
          (args.where.expiresAt &&
            invitation.expiresAt > args.where.expiresAt.lte)
        ) {
          return { count: 0 };
        }

        Object.assign(invitation, args.data);
        return { count: 1 };
      },
    },
    emailNotification: {
      async findUnique(args: { where: { deduplicationKey: string } }) {
        return (
          store.notifications.find(
            (notification) =>
              notification.deduplicationKey === args.where.deduplicationKey,
          ) ?? null
        );
      },
      async createMany(args: {
        data: MutableNotificationIntentData;
        skipDuplicates?: boolean;
      }) {
        const existing = store.notifications.find(
          (notification) =>
            notification.deduplicationKey === args.data.deduplicationKey,
        );

        if (existing) {
          return { count: 0 };
        }

        insertPendingNotificationIntent(store, args.data);
        return { count: 1 };
      },
      async create(args: { data: MutableNotificationIntentData }) {
        return insertPendingNotificationIntent(store, args.data);
      },
    },
  };
  const client = {
    ...tx,
    async $transaction(
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) {
      const snapshot = snapshotStore(store);

      try {
        return await callback(tx as unknown as Prisma.TransactionClient);
      } catch (error) {
        restoreStore(store, snapshot);
        throw error;
      }
    },
  };

  return client as unknown as PrismaClient;
}

function preserveE4Env(): () => void {
  const keys = [
    "TRP_ENVIRONMENT",
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_SECRET",
    "AUTH_TRUST_HOST",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_ALLOWED_ADMIN_EMAILS",
    "EXTERNAL_CALENDAR_ENCRYPTION_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_FOLDER",
    "TILOPAY_ENVIRONMENT",
    "TILOPAY_API_KEY",
    "TILOPAY_API_USER",
    "TILOPAY_API_PASSWORD",
    "TILOPAY_REDIRECT_URL",
    "TILOPAY_SUCCESS_URL",
    "TILOPAY_CANCEL_URL",
    "TILOPAY_ERROR_URL",
    "TILOPAY_WEBHOOK_URL",
    "EMAIL_DELIVERY_MODE",
    "RESEND_API_KEY",
    "EMAIL_FROM_ES",
    "EMAIL_FROM_EN",
    "EMAIL_REPLY_TO_ES",
    "EMAIL_REPLY_TO_EN",
    "EMAIL_ADMIN_RECIPIENTS",
    "EMAIL_PUBLIC_BASE_URL",
    "EMAIL_BRAND_LOGO_URL",
    "EMAIL_TEST_RECIPIENT",
    "VERCEL_ENV",
    "NODE_ENV",
  ] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  process.env.TRP_ENVIRONMENT = "local";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.DIRECT_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.AUTH_SECRET = "final-e4-test-auth-secret-at-least-32-chars";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.AUTH_GOOGLE_ID = "final-e4-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-e4-google-secret";
  process.env.AUTH_ALLOWED_ADMIN_EMAILS = "admin.final-e4@juantzun.dev";
  process.env.EXTERNAL_CALENDAR_ENCRYPTION_KEY =
    Buffer.alloc(32, 4).toString("base64");
  process.env.CLOUDINARY_CLOUD_NAME = "trpbookingtest";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "final-e4-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-e4";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-e4-api-key";
  process.env.TILOPAY_API_USER = "final-e4-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-e4-api-password";
  process.env.TILOPAY_REDIRECT_URL =
    "http://localhost:3000/api/payments/tilopay/redirect";
  process.env.TILOPAY_SUCCESS_URL =
    "http://localhost:3000/reservas/pago/exitoso";
  process.env.TILOPAY_CANCEL_URL =
    "http://localhost:3000/reservas/pago/cancelado";
  process.env.TILOPAY_ERROR_URL =
    "http://localhost:3000/reservas/pago/error";
  process.env.TILOPAY_WEBHOOK_URL =
    "http://localhost:3000/api/payments/tilopay/webhook";
  process.env.EMAIL_DELIVERY_MODE = "test";
  process.env.RESEND_API_KEY = "re_finale4tests";
  process.env.EMAIL_FROM_ES =
    "Tu Refugio Perfecto Local <reservas@mail.trp-booking.juantzun.dev>";
  process.env.EMAIL_FROM_EN =
    "Tu Refugio Perfecto Local <reservations@mail.trp-booking.juantzun.dev>";
  process.env.EMAIL_REPLY_TO_ES = "reservas@juantzun.dev";
  process.env.EMAIL_REPLY_TO_EN = "reservations@juantzun.dev";
  process.env.EMAIL_ADMIN_RECIPIENTS = "admin@juantzun.dev";
  process.env.EMAIL_PUBLIC_BASE_URL = PUBLIC_BASE_URL;
  process.env.EMAIL_BRAND_LOGO_URL = BRAND_LOGO_URL;
  process.env.EMAIL_TEST_RECIPIENT = "local-review-inbox@example.com";
  process.env.VERCEL_ENV = "development";
  process.env.NODE_ENV = "test";

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function installDeliveryPrisma(store: E4Store): void {
  const client = {
    emailNotification: {
      async findFirst(args: {
        where: {
          id: string;
          status: EmailNotificationStatus;
          processingStartedAt: Date;
        };
      }) {
        const notification = store.notifications.find(
          (candidate) =>
            candidate.id === args.where.id &&
            candidate.status === args.where.status &&
            candidate.processingStartedAt?.getTime() ===
              args.where.processingStartedAt.getTime(),
        );

        if (!notification) {
          return null;
        }

        const reservation = store.reservations.find(
          (candidate) => candidate.id === notification.reservationId,
        );
        const invitation = store.invitations.find(
          (candidate) => candidate.id === notification.reviewInvitationId,
        );

        if (!reservation) {
          return null;
        }

        return {
          ...notification,
          reservation,
          reviewInvitation: invitation ?? null,
        };
      },
      async findMany(
        args: {
          where?: {
            id?: { in: readonly string[] };
            type?: { in: readonly EmailNotificationType[] };
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
          id: string;
          status?: EmailNotificationStatus;
          processingStartedAt?: Date;
        };
        data: Partial<MutableNotification>;
      }) {
        const notification = store.notifications.find(
          (candidate) =>
            candidate.id === args.where.id &&
            (!args.where.status || candidate.status === args.where.status) &&
            (!args.where.processingStartedAt ||
              candidate.processingStartedAt?.getTime() ===
                args.where.processingStartedAt.getTime()),
        );

        if (!notification) {
          return { count: 0 };
        }

        Object.assign(notification, args.data);
        return { count: 1 };
      },
    },
    reservationLifecycleRequest: {
      async findMany() {
        return [];
      },
    },
    reviewInvitation: {
      async updateMany(args: {
        where: {
          id: string;
          status: ReviewInvitationStatus;
          expiresAt?: { lte: Date };
        };
        data: Partial<MutableInvitation>;
      }) {
        const invitation = store.invitations.find(
          (candidate) =>
            candidate.id === args.where.id &&
            candidate.status === args.where.status &&
            (!args.where.expiresAt ||
              candidate.expiresAt <= args.where.expiresAt.lte),
        );

        if (!invitation) {
          return { count: 0 };
        }

        Object.assign(invitation, args.data);
        return { count: 1 };
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

function createDeliveryStore(
  options: Readonly<{
    status?: ReviewInvitationStatus;
    expiresAt?: Date;
    encryptedToken?: string | null;
    reservationEmail?: string;
    reservationStatus?: ReservationStatus;
  }> = {},
): E4Store {
  const restoreEnv = preserveE4Env();

  try {
    const tokenMaterial = createReviewInvitationTokenMaterial(
      "reservation-e4-1",
      E4_TOKEN,
    );
    const invitation = buildInvitation({
      accessTokenHash: tokenMaterial.tokenHash,
      accessTokenEncrypted:
        options.encryptedToken === undefined
          ? tokenMaterial.encryptedToken
          : options.encryptedToken,
      status: options.status ?? ReviewInvitationStatus.ACTIVE,
      expiresAt:
        options.expiresAt ?? new Date("2026-10-18T19:00:00.000Z"),
    });
    const reservation = buildReservation({
      guestEmail: options.reservationEmail ?? "guest.e4@example.com",
      status: options.reservationStatus ?? ReservationStatus.CONFIRMED,
      reviewInvitation: invitation,
    });
    const store = createStore([reservation]);

    store.notifications.push(buildNotification());

    return store;
  } finally {
    restoreEnv();
  }
}

function createProvider(
  options: Readonly<{ fail?: boolean }> = {},
): EmailProvider & { sent: string[] } {
  return {
    sent: [],
    async send(input) {
      if (options.fail) {
        throw new EmailProviderError(
          "EMAIL_PROVIDER_TEMPORARY_FAILURE",
          true,
        );
      }

      this.sent.push(input.html);
      this.sent.push(input.text);

      return {
        provider: "resend",
        providerMessageId: "resend-review-e4",
        deliveryMode: "test",
        deliveredRecipient: input.intendedRecipient,
      };
    },
  };
}

test("E.4 creates ReviewInvitation and REVIEW_INVITATION intent in one Serializable transaction", async () => {
  const store = createStore();
  const client = makeAtomicClient(store);
  const result =
    await ensureReviewInvitationAndNotificationIntentForReservation(
      "reservation-e4-1",
      {
        now: E4_NOW,
        prismaClient: client,
        ensureReviewInvitation: makeEnsureWithStore(store),
      },
    );

  assert.equal(result.outcome, "created");
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].type, EmailNotificationType.REVIEW_INVITATION);
  assert.equal(store.notifications[0].reviewInvitationId, store.invitations[0].id);
  assert.equal(store.notifications[0].recipient, "guest.e4@example.com");
  assert.equal(store.notifications[0].nextAttemptAt?.toISOString(), E4_NOW.toISOString());
});

test("E.4 rolls back a new ReviewInvitation when email intent creation fails", async () => {
  const store = createStore([
    buildReservation({ guestEmail: "fail-intent@example.com" }),
  ]);
  const client = makeAtomicClient(store);

  await assert.rejects(
    () =>
      ensureReviewInvitationAndNotificationIntentForReservation(
        "reservation-e4-1",
        {
          now: E4_NOW,
          prismaClient: client,
          ensureReviewInvitation: makeEnsureWithStore(store),
        },
      ),
    /INTENT_CREATE_FAILED/,
  );
  assert.equal(store.invitations.length, 0);
  assert.equal(store.notifications.length, 0);
  assert.equal(store.reservations[0].reviewInvitation, null);
});

test("E.4 retries the whole transaction after P2034 without persisting partial state", async () => {
  const store = createStore();
  const client = makeAtomicClient(store, { failFirstCommitWithP2034: true });
  const result =
    await ensureReviewInvitationAndNotificationIntentForReservation(
      "reservation-e4-1",
      {
        now: E4_NOW,
        prismaClient: client,
        ensureReviewInvitation: makeEnsureWithStore(store),
      },
    );

  assert.equal(result.outcome, "created");
  assert.equal((client as unknown as { transactions: number }).transactions, 2);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);
});

test("E.4 sequential replay keeps one invitation and one email intent", async () => {
  const store = createStore();
  const client = makeAtomicClient(store);

  await ensureReviewInvitationAndNotificationIntentForReservation(
    "reservation-e4-1",
    {
      now: E4_NOW,
      prismaClient: client,
      ensureReviewInvitation: makeEnsureWithStore(store),
    },
  );
  const second =
    await ensureReviewInvitationAndNotificationIntentForReservation(
      "reservation-e4-1",
      {
        now: E4_NOW,
        prismaClient: client,
        ensureReviewInvitation: makeEnsureWithStore(store),
      },
    );

  assert.equal(second.outcome, "existing");
  assert.equal(second.notificationIntentCreated, false);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);
});

test("E.4 converges when another transaction wins the REVIEW_INVITATION email intent race", async () => {
  const store = createStore();
  const client = makeAtomicClient(store, {
    loseFirstNotificationIntentRace: true,
  });
  let leakedP2002 = false;

  const result = await ensureReviewInvitationAndNotificationIntentForReservation(
    "reservation-e4-1",
    {
      now: E4_NOW,
      prismaClient: client,
      ensureReviewInvitation: makeEnsureWithStore(store),
    },
  ).catch((error: unknown) => {
    leakedP2002 =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    throw error;
  });

  assert.equal(leakedP2002, false);
  assert.equal(result.outcome, "created");
  assert.equal(result.notificationIntentCreated, false);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].reservationId, "reservation-e4-1");
  assert.equal(store.notifications[0].reviewInvitationId, result.invitationId);
  assert.equal(store.notifications[0].recipient, "guest.e4@example.com");
});

test("E.4 repairs an existing ACTIVE invitation without rotating the winning token", async () => {
  const invitation = buildInvitation({
    accessTokenHash: "winning-review-token-hash",
    accessTokenEncrypted: "encrypted-winning-review-token",
    createdAt: new Date("2026-08-29T19:00:00.000Z"),
    expiresAt: new Date("2026-09-28T19:00:00.000Z"),
  });
  const reservation = buildReservation({ reviewInvitation: invitation });
  const store = createStore([reservation]);
  const client = makeAtomicClient(store);

  const result =
    await ensureReviewInvitationAndNotificationIntentForReservation(
      reservation.id,
      {
        now: E4_NOW,
        prismaClient: client,
        ensureReviewInvitation: makeEnsureWithStore(store),
      },
    );

  assert.equal(result.outcome, "existing");
  assert.equal(result.notificationIntentCreated, true);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.invitations[0].accessTokenHash, "winning-review-token-hash");
  assert.equal(store.notifications.length, 1);
});

test("E.4 scheduler prioritizes actionable repair candidates without spending the batch on terminal or already-covered invitations", async () => {
  const missingIntentInvitation = buildInvitation({
    id: "review-invitation-missing-intent",
    reservationId: "reservation-missing-intent",
    expiresAt: new Date("2026-10-18T19:00:00.000Z"),
  });
  const staleRecipientInvitation = buildInvitation({
    id: "review-invitation-stale-recipient",
    reservationId: "reservation-stale-recipient",
    expiresAt: new Date("2026-10-18T19:00:00.000Z"),
  });
  const currentRecipientInvitation = buildInvitation({
    id: "review-invitation-current-recipient",
    reservationId: "reservation-current-recipient",
    expiresAt: new Date("2026-10-18T19:00:00.000Z"),
  });
  const expiredActiveInvitation = buildInvitation({
    id: "review-invitation-expired-active",
    reservationId: "reservation-expired-active",
    expiresAt: new Date("2026-09-18T18:59:59.999Z"),
  });
  const twentyDayMissingIntentInvitation = buildInvitation({
    id: "review-invitation-twenty-day-missing",
    reservationId: "reservation-twenty-day-missing",
    createdAt: new Date("2026-08-29T19:00:00.000Z"),
    expiresAt: new Date("2026-09-28T19:00:00.000Z"),
  });
  const terminalInvitation = buildInvitation({
    id: "review-invitation-terminal",
    reservationId: "reservation-terminal",
    status: ReviewInvitationStatus.CANCELLED,
  });
  const store = createStore([
    buildReservation({ id: "reservation-recent" }),
    buildReservation({
      id: "reservation-too-old",
      checkOutDate: new Date("2026-09-01T00:00:00.000Z"),
    }),
    buildReservation({
      id: "reservation-missing-intent",
      guestEmail: "missing-intent@example.com",
      reviewInvitation: missingIntentInvitation,
    }),
    buildReservation({
      id: "reservation-stale-recipient",
      guestEmail: "current-stale@example.com",
      reviewInvitation: staleRecipientInvitation,
    }),
    buildReservation({
      id: "reservation-current-recipient",
      guestEmail: "current-intent@example.com",
      reviewInvitation: currentRecipientInvitation,
    }),
    buildReservation({
      id: "reservation-expired-active",
      guestEmail: "expired-active@example.com",
      reviewInvitation: expiredActiveInvitation,
    }),
    buildReservation({
      id: "reservation-twenty-day-missing",
      guestEmail: "twenty-day-missing@example.com",
      reviewInvitation: twentyDayMissingIntentInvitation,
    }),
    buildReservation({
      id: "reservation-terminal",
      guestEmail: "terminal@example.com",
      reviewInvitation: terminalInvitation,
    }),
  ]);
  store.nextNotification = 100;
  store.notifications.push(
    buildNotification({
      id: "review-notification-current-recipient",
      reservationId: "reservation-current-recipient",
      reviewInvitationId: currentRecipientInvitation.id,
      recipient: "current-intent@example.com",
      deduplicationKey:
        "review-invitation/review-invitation-current-recipient/current-intent@example.com",
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      processingStartedAt: null,
      lastAttemptAt: null,
    }),
    buildNotification({
      id: "review-notification-stale-recipient",
      reservationId: "reservation-stale-recipient",
      reviewInvitationId: staleRecipientInvitation.id,
      recipient: "old-stale@example.com",
      deduplicationKey:
        "review-invitation/review-invitation-stale-recipient/old-stale@example.com",
      status: EmailNotificationStatus.PENDING,
      attemptCount: 0,
      processingStartedAt: null,
      lastAttemptAt: null,
    }),
  );

  const client = makeSchedulerClient(store);
  const result = await scheduleReviewInvitations({
    now: E4_NOW,
    prismaClient: client,
  });

  assert.equal(result.candidates, 4);
  assert.equal(result.created, 1);
  assert.equal(result.existing, 3);
  assert.equal(result.notificationIntentsCreated, 4);
  assert.equal(result.notificationIntentsExisting, 0);
  assert.equal(result.failed, 0);
  assert.equal(
    store.invitations.some(
      (invitation) => invitation.reservationId === "reservation-too-old",
    ),
    false,
  );
  assert.equal(
    store.notifications.some(
      (notification) =>
        notification.reviewInvitationId === expiredActiveInvitation.id,
    ),
    false,
  );
  assert.equal(
    store.notifications.filter(
      (notification) =>
        notification.reviewInvitationId === currentRecipientInvitation.id,
    ).length,
    1,
  );
  assert.equal(
    store.notifications.some(
      (notification) =>
        notification.reviewInvitationId === missingIntentInvitation.id &&
        notification.recipient === "missing-intent@example.com",
    ),
    true,
  );
  assert.equal(
    store.notifications.some(
      (notification) =>
        notification.reviewInvitationId === staleRecipientInvitation.id &&
        notification.recipient === "current-stale@example.com",
    ),
    true,
  );
  assert.equal(
    store.notifications.some(
      (notification) =>
        notification.reviewInvitationId === twentyDayMissingIntentInvitation.id &&
        notification.recipient === "twenty-day-missing@example.com",
    ),
    true,
  );
  assert.equal(
    store.notifications.some(
      (notification) =>
        notification.reviewInvitationId === terminalInvitation.id,
    ),
    false,
  );
});

test("E.4 email template renders ES and EN private review links without financial/provider data", async () => {
  for (const locale of ["es", "en"] as const) {
    const content = await buildReviewInvitationEmail({
      locale,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      guestName: "Juana Garcia",
      propertyNameEs: "Bungalow del Lago",
      propertyNameEn: "Lake Bungalow",
      checkoutAt: "2026-09-18T17:00:00.000Z",
      expiresAt: "2026-10-18T19:00:00.000Z",
      reviewUrl: `${PUBLIC_BASE_URL}/resenas/${E4_TOKEN}`,
    });
    const combined = `${content.subject}\n${content.html}\n${content.text}`;

    assert.match(content.subject, locale === "es" ? /Cuéntanos/ : /Tell us/);
    assert.match(combined, locale === "es" ? /Bungalow del Lago/ : /Lake Bungalow/);
    assert.match(combined, new RegExp(`/resenas/${E4_TOKEN}`));
    assert.match(combined, locale === "es" ? /Compartir mi experiencia/ : /Share my experience/);
    assert.doesNotMatch(combined, new RegExp(E4_TOKEN_HASH));
    assert.doesNotMatch(combined, /encrypted/i);
    assert.doesNotMatch(combined, /Tilopay|refund|reembolso|provider/i);
  }
});

test("E.4 delivery sends a valid ACTIVE invitation and marks the notification SENT", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore();
    const provider = createProvider();

    installDeliveryPrisma(store);

    const result = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(result.outcome, "sent");
    assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
    assert.equal(store.notifications[0].providerMessageId, "resend-review-e4");
    assert.equal(provider.sent.join("\n").includes(`/resenas/${E4_TOKEN}`), true);
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery schedules retry on temporary provider failure and preserves the ACTIVE invitation token", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore();
    const provider = createProvider({ fail: true });

    installDeliveryPrisma(store);

    const failed = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(failed.outcome, "failed");
    assert.equal(failed.retryScheduled, true);
    assert.equal(store.notifications[0].status, EmailNotificationStatus.FAILED);
    assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
    assert.equal(store.invitations[0].accessTokenHash, E4_TOKEN_HASH);

    store.notifications[0].status = EmailNotificationStatus.PROCESSING;
    store.notifications[0].attemptCount = 2;
    store.notifications[0].processingStartedAt = E4_NOW;
    store.notifications[0].errorCode = null;
    store.notifications[0].errorMessage = null;

    const retryProvider = createProvider();
    const retried = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider: retryProvider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => new Date(E4_NOW.getTime() + 60_000),
    });

    assert.equal(retried.outcome, "sent");
    assert.equal(retryProvider.sent.join("\n").includes(`/resenas/${E4_TOKEN}`), true);
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery expires overdue ACTIVE invitations and skips without provider call", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore({
      expiresAt: new Date("2026-09-18T18:59:59.999Z"),
    });
    const provider = createProvider();

    installDeliveryPrisma(store);

    const result = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(result.outcome, "skipped");
    assert.equal(provider.sent.length, 0);
    assert.equal(store.invitations[0].status, ReviewInvitationStatus.EXPIRED);
    assert.equal(store.invitations[0].accessTokenEncrypted, null);
    assert.equal(store.notifications[0].errorCode, "EMAIL_REVIEW_INVITATION_EXPIRED");
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery cancels business-ineligible ACTIVE invitations and skips safely", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore({
      reservationStatus: ReservationStatus.PENDING_PAYMENT,
    });
    const provider = createProvider();

    installDeliveryPrisma(store);

    const result = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(result.outcome, "skipped");
    assert.equal(provider.sent.length, 0);
    assert.equal(store.invitations[0].status, ReviewInvitationStatus.CANCELLED);
    assert.equal(store.invitations[0].accessTokenEncrypted, null);
    assert.equal(store.notifications[0].errorCode, "EMAIL_REVIEW_INVITATION_SUPERSEDED");
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery skips stale recipient notifications while keeping the invitation ACTIVE", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore({
      reservationEmail: "new-review-recipient@example.com",
    });
    const provider = createProvider();

    installDeliveryPrisma(store);

    const result = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: "review-notification-e4-1",
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(result.outcome, "skipped");
    assert.equal(provider.sent.length, 0);
    assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
    assert.equal(
      store.notifications[0].errorCode,
      "EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED",
    );
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery skips relation-mismatched notifications without mutating unrelated invitations", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const unrelatedEncryptedToken = "encrypted-cross-reservation-token";
    const unrelatedInvitation = buildInvitation({
      id: "review-invitation-reservation-b",
      reservationId: "reservation-b",
      accessTokenHash: "cross-reservation-token-hash",
      accessTokenEncrypted: unrelatedEncryptedToken,
    });
    const store = createStore([
      buildReservation({
        id: "reservation-a",
        guestEmail: "guest-a@example.com",
      }),
      buildReservation({
        id: "reservation-b",
        guestEmail: "guest-b@example.com",
        reviewInvitation: unrelatedInvitation,
      }),
    ]);
    const notification = buildNotification({
      id: "review-notification-relation-mismatch",
      reservationId: "reservation-a",
      reviewInvitationId: unrelatedInvitation.id,
      recipient: "guest-a@example.com",
      deduplicationKey:
        "review-invitation/review-invitation-reservation-b/guest-a@example.com",
    });
    const provider = createProvider();

    store.notifications.push(notification);
    installDeliveryPrisma(store);

    const result = await deliverClaimedReviewInvitationEmailNotification({
      claim: {
        notificationId: notification.id,
        processingStartedAt: E4_NOW,
      },
      provider,
      publicBaseUrl: PUBLIC_BASE_URL,
      brandLogoUrl: BRAND_LOGO_URL,
      now: () => E4_NOW,
    });

    assert.equal(result.outcome, "skipped");
    assert.equal(provider.sent.length, 0);
    assert.equal(store.notifications[0].status, EmailNotificationStatus.SKIPPED);
    assert.equal(
      store.notifications[0].errorCode,
      "EMAIL_REVIEW_INVITATION_RELATION_MISMATCH",
    );
    assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
    assert.equal(
      store.invitations[0].accessTokenEncrypted,
      unrelatedEncryptedToken,
    );
  } finally {
    restoreEnv();
  }
});

test("E.4 delivery skips missing or corrupt encrypted tokens without leaking raw token material", async () => {
  const restoreEnv = preserveE4Env();

  try {
    for (const encryptedToken of [null, "not-a-valid-envelope"] as const) {
      const store = createDeliveryStore({ encryptedToken });
      const provider = createProvider();

      installDeliveryPrisma(store);

      const result = await deliverClaimedReviewInvitationEmailNotification({
        claim: {
          notificationId: "review-notification-e4-1",
          processingStartedAt: E4_NOW,
        },
        provider,
        publicBaseUrl: PUBLIC_BASE_URL,
        brandLogoUrl: BRAND_LOGO_URL,
        now: () => E4_NOW,
      });
      const persisted = JSON.stringify(store.notifications);

      assert.equal(result.outcome, "skipped");
      assert.equal(provider.sent.length, 0);
      assert.equal(
        store.notifications[0].errorCode,
        "EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE",
      );
      assert.equal(persisted.includes(E4_TOKEN), false);
      assert.equal(persisted.includes(E4_TOKEN_HASH), false);
    }
  } finally {
    restoreEnv();
  }
});

test("E.4 processEmailNotifications routes REVIEW_INVITATION instead of the generic unsupported dispatcher", async () => {
  const restoreEnv = preserveE4Env();

  try {
    const store = createDeliveryStore();
    const provider = createProvider();

    store.notifications[0].status = EmailNotificationStatus.PENDING;
    store.notifications[0].attemptCount = 0;
    store.notifications[0].processingStartedAt = null;
    installDeliveryPrisma(store);

    const result = await processEmailNotifications({
      provider,
      now: () => E4_NOW,
    });

    assert.equal(result.deliveryMode, "test");
    assert.equal(result.claimed, 1);
    assert.equal(result.sent, 1);
    assert.equal(store.notifications[0].status, EmailNotificationStatus.SENT);
  } finally {
    restoreEnv();
  }
});

test("E.4 cron registry, scheduled route, Vercel boundary and package scripts match the accepted scope", () => {
  const definition = listCronJobDefinitions().find(
    (job) => job.slug === "schedule-review-invitations",
  );
  const vercelConfig = JSON.parse(
    readFileSync(path.join(ROOT, "vercel.json"), "utf8"),
  ) as { crons?: unknown[] };
  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  assert.ok(definition);
  assert.equal(definition.key, "SCHEDULE_REVIEW_INVITATIONS");
  assert.equal(definition.schedule, "*/30 * * * *");
  assert.equal(cronJobSlugs.includes("schedule-review-invitations"), true);
  assert.equal(
    existsSync(
      path.join(
        ROOT,
        "app/api/cron/schedule-review-invitations/route.ts",
      ),
    ),
    true,
  );
  assert.deepEqual(vercelConfig.crons, []);
  assert.equal(
    packageJson.scripts["final-e:validate"],
    "tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts",
  );
  assert.equal(
    existsSync(path.join(ROOT, "app/resenas/[token]/page.tsx")),
    true,
  );
  assert.equal(
    existsSync(path.join(ROOT, "app/api/reviews/[token]/route.ts")),
    true,
  );
  assert.equal(existsSync(path.join(ROOT, "app/resenas/page.tsx")), true);
  assert.equal(
    existsSync(path.join(ROOT, "app/admin/reviews/page.tsx")),
    true,
  );
  assert.equal(
    existsSync(
      path.join(
        ROOT,
        "app/api/admin/reviews/[reviewId]/moderation/route.ts",
      ),
    ),
    true,
  );
  assert.equal(
    isReviewInvitationNotificationType(EmailNotificationType.REVIEW_INVITATION),
    true,
  );
});
