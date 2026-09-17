import assert from "node:assert/strict";

import {
  AdditionalChargeStatus,
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

import { buildAdditionalChargePaymentRequiredEmail } from "@/emails";
import { prisma } from "@/lib/db/prisma";
import {
  deliverClaimedAdditionalChargePaymentEmailNotification,
} from "@/lib/email/additional-charge-payment-notifications";
import { createAdminGuestPaymentRequest } from "@/lib/admin/additional-charges";
import { requestAdminEmailNotificationResend } from "@/lib/admin/email-notification-resend";
import { getAdminReservationOperationalHistory } from "@/lib/admin/reservation-operational-history";
import {
  createGuestPaymentRequestTokenMaterial,
  hashGuestPaymentRequestAccessToken,
} from "@/lib/payments/guest-payment-request-token";
import type { EmailProvider } from "@/types/email-provider";

import { test } from "./harness";

const D6_TOKEN =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const D6_BASE_NOW = new Date("2026-09-17T12:00:00.000Z");
const D6_RESERVATION_ID = "reservation-final-d6";
const D6_REQUEST_ID = "request-final-d6";
const D6_NOTIFICATION_ID = "notification-final-d6";

type D6User = Readonly<{
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}>;

type D6Notification = {
  id: string;
  reservationId: string;
  guestPaymentRequestId: string | null;
  lifecycleRequestId: string | null;
  refundId: string | null;
  type: EmailNotificationType;
  recipient: string;
  locale: string;
  deduplicationKey: string;
  origin: EmailNotificationOrigin;
  parentNotificationId: string | null;
  requestedByAdminId: string | null;
  requestedAt: Date | null;
  status: EmailNotificationStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  processingStartedAt: Date | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type D6Store = {
  users: D6User[];
  reservation: {
    id: string;
    status: ReservationStatus;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    guestName: string;
    guestEmail: string;
    preferredLocale: string;
    currency: string;
    updatedAt: Date;
    createdAt: Date;
    property: { nameEs: string; nameEn: string };
  };
  charges: Array<{
    id: string;
    reservationId: string;
    category: "TRANSPORT" | "CLEANING";
    description: string;
    internalNote: string | null;
    amount: Prisma.Decimal;
    currency: string;
    status: AdditionalChargeStatus;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdByAdmin: { name: string | null; email: string };
    paymentRequestItems: unknown[];
    refundAllocations: unknown[];
  }>;
  requests: Array<{
    id: string;
    reservationId: string;
    status: GuestPaymentRequestStatus;
    totalAmount: Prisma.Decimal;
    currency: string;
    accessTokenHash: string;
    accessTokenEncrypted: string;
    expiresAt: Date;
    createdByAdminId: string;
    clientRequestId: string;
    paidAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  requestItems: Array<{
    id: string;
    paymentRequestId: string;
    additionalChargeId: string;
    categorySnapshot: string;
    descriptionSnapshot: string;
    amountSnapshot: Prisma.Decimal;
    currencySnapshot: string;
    createdAt: Date;
  }>;
  notifications: D6Notification[];
  auditLogs: Array<{ action: string; metadata: unknown }>;
};

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function preserveD6Env(): () => void {
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
    "EMAIL_ADMIN_LOCALE",
    "EMAIL_PUBLIC_BASE_URL",
    "EMAIL_BRAND_LOGO_URL",
    "EMAIL_TEST_RECIPIENT",
    "VERCEL_ENV",
  ] as const;
  const previous = new Map<string, string | undefined>();

  for (const key of keys) previous.set(key, process.env[key]);

  process.env.TRP_ENVIRONMENT = "local";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.DIRECT_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.AUTH_SECRET = "final-d6-test-auth-secret-at-least-32-chars";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.AUTH_GOOGLE_ID = "final-d6-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-d6-google-secret";
  process.env.AUTH_ALLOWED_ADMIN_EMAILS = "admin@juantzun.dev";
  process.env.EXTERNAL_CALENDAR_ENCRYPTION_KEY =
    Buffer.alloc(32, 9).toString("base64");
  process.env.CLOUDINARY_CLOUD_NAME = "trpbookingtest";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "final-d6-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-d6";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-d6-api-key";
  process.env.TILOPAY_API_USER = "final-d6-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-d6-api-password";
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
  process.env.EMAIL_DELIVERY_MODE = "disabled";
  process.env.VERCEL_ENV = "development";

  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function enableD6EmailEnv(): void {
  process.env.EMAIL_DELIVERY_MODE = "test";
  process.env.RESEND_API_KEY = "re_final_d6_email_key";
  process.env.EMAIL_FROM_ES = "Tu Refugio Perfecto <reservas@mail.trp-booking.juantzun.dev>";
  process.env.EMAIL_FROM_EN = "Tu Refugio Perfecto <reservations@mail.trp-booking.juantzun.dev>";
  process.env.EMAIL_REPLY_TO_ES = "reservas@juantzun.dev";
  process.env.EMAIL_REPLY_TO_EN = "reservations@juantzun.dev";
  process.env.EMAIL_ADMIN_RECIPIENTS = "admin@juantzun.dev";
  process.env.EMAIL_ADMIN_LOCALE = "es";
  process.env.EMAIL_PUBLIC_BASE_URL = "https://trp-booking.juantzun.dev";
  process.env.EMAIL_BRAND_LOGO_URL =
    "https://trp-booking.juantzun.dev/logo-email.png";
  process.env.EMAIL_TEST_RECIPIENT = "deliveries@juantzun.dev";
}

function d6Store(): D6Store {
  return {
    users: [
      {
        id: "admin-final-d6",
        email: "admin@juantzun.dev",
        name: "Admin Final D6",
        role: UserRole.ADMIN,
      },
    ],
    reservation: {
      id: D6_RESERVATION_ID,
      status: ReservationStatus.CONFIRMED,
      confirmedAt: new Date("2026-09-10T12:00:00.000Z"),
      cancelledAt: null,
      guestName: "Final D6 Guest",
      guestEmail: "guest.final-d6@juantzun.dev",
      preferredLocale: "es",
      currency: "USD",
      updatedAt: new Date("2026-09-17T10:00:00.000Z"),
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
      property: {
        nameEs: "Bungalow Lago",
        nameEn: "Lake Bungalow",
      },
    },
    charges: [
      {
        id: "charge-d6-1",
        reservationId: D6_RESERVATION_ID,
        category: "TRANSPORT",
        description: "Airport pickup",
        internalNote: "driver-internal-note",
        amount: money("12.50"),
        currency: "USD",
        status: AdditionalChargeStatus.PENDING,
        cancelledAt: null,
        createdAt: new Date("2026-09-17T09:00:00.000Z"),
        updatedAt: new Date("2026-09-17T09:00:00.000Z"),
        createdByAdmin: {
          name: "Admin Final D6",
          email: "admin@juantzun.dev",
        },
        paymentRequestItems: [],
        refundAllocations: [],
      },
      {
        id: "charge-d6-2",
        reservationId: D6_RESERVATION_ID,
        category: "CLEANING",
        description: "Extra cleaning",
        internalNote: null,
        amount: money("17.50"),
        currency: "USD",
        status: AdditionalChargeStatus.PENDING,
        cancelledAt: null,
        createdAt: new Date("2026-09-17T09:05:00.000Z"),
        updatedAt: new Date("2026-09-17T09:05:00.000Z"),
        createdByAdmin: {
          name: "Admin Final D6",
          email: "admin@juantzun.dev",
        },
        paymentRequestItems: [],
        refundAllocations: [],
      },
    ],
    requests: [],
    requestItems: [],
    notifications: [],
    auditLogs: [],
  };
}

function paymentForRequest() {
  return null;
}

function requestItemsFor(store: D6Store, requestId: string) {
  return store.requestItems
    .filter((item) => item.paymentRequestId === requestId)
    .map((item) => {
      const charge = store.charges.find(
        (candidate) => candidate.id === item.additionalChargeId,
      );
      assert.ok(charge);
      return {
        ...item,
        additionalCharge: {
          id: charge.id,
          reservationId: charge.reservationId,
          status: charge.status,
          amount: charge.amount,
          currency: charge.currency,
        },
      };
    });
}

function enrichRequest(store: D6Store, request: D6Store["requests"][number]) {
  const createdByAdmin =
    store.users.find((user) => user.id === request.createdByAdminId) ??
    store.users[0]!;
  return {
    ...request,
    createdByAdmin: {
      name: createdByAdmin.name,
      email: createdByAdmin.email,
    },
    reservation: {
      ...store.reservation,
      property: store.reservation.property,
    },
    items: requestItemsFor(store, request.id),
    payment: paymentForRequest(),
    emailNotifications: store.notifications
      .filter((notification) => notification.guestPaymentRequestId === request.id)
      .map((notification) => ({
        ...notification,
        manualResends: store.notifications
          .filter((child) => child.parentNotificationId === notification.id)
          .map((child) => ({ id: child.id })),
        requestedByAdmin: notification.requestedByAdminId
          ? store.users.find((user) => user.id === notification.requestedByAdminId)
          : null,
      })),
  };
}

function notificationWithRelations(store: D6Store, notification: D6Notification) {
  const request = notification.guestPaymentRequestId
    ? store.requests.find((candidate) => candidate.id === notification.guestPaymentRequestId)
    : null;
  const requestedByAdmin = notification.requestedByAdminId
    ? store.users.find((user) => user.id === notification.requestedByAdminId) ?? null
    : null;

  return {
    ...notification,
    manualResends: store.notifications
      .filter((child) => child.parentNotificationId === notification.id)
      .map((child) => ({ id: child.id })),
    requestedByAdmin,
    guestPaymentRequest: request ? enrichRequest(store, request) : null,
    reservation: {
      status: store.reservation.status,
      confirmedAt: store.reservation.confirmedAt,
    },
  };
}

function installD6Prisma(store: D6Store): void {
  const client = {
    async $transaction<T>(operation: (transaction: typeof client) => Promise<T>): Promise<T> {
      return operation(client);
    },
    user: {
      async upsert(args: { where: { email: string }; create: { email: string; name: string | null; role: UserRole }; update: { name?: string; role: UserRole } }) {
        let user = store.users.find((candidate) => candidate.email === args.where.email);
        if (!user) {
          user = {
            id: `user-${store.users.length + 1}`,
            email: args.create.email,
            name: args.create.name,
            role: args.create.role,
          };
          store.users.push(user);
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    },
    reservation: {
      async findUnique() {
        return store.reservation;
      },
      async updateMany() {
        return { count: 1 };
      },
    },
    additionalCharge: {
      async findMany(args: { where: { id?: { in?: string[] }; reservationId?: string } }) {
        const ids = args.where.id?.in ?? [];
        return store.charges.filter(
          (charge) =>
            (!args.where.reservationId ||
              charge.reservationId === args.where.reservationId) &&
            (ids.length === 0 || ids.includes(charge.id)),
        );
      },
      async updateMany() {
        return { count: 1 };
      },
    },
    guestPaymentRequestItem: {
      async findFirst() {
        return null;
      },
    },
    guestPaymentRequest: {
      async findUnique(args: { where: { id?: string; clientRequestId?: string } }) {
        const request = args.where.clientRequestId
          ? store.requests.find(
              (candidate) => candidate.clientRequestId === args.where.clientRequestId,
            )
          : store.requests.find((candidate) => candidate.id === args.where.id);
        return request ? enrichRequest(store, request) : null;
      },
      async updateMany(args: { where: { id?: string; status?: GuestPaymentRequestStatus; expiresAt?: { lte?: Date } }; data: { status?: GuestPaymentRequestStatus } }) {
        let count = 0;
        for (const request of store.requests) {
          if (args.where.id && request.id !== args.where.id) continue;
          if (args.where.status && request.status !== args.where.status) continue;
          if (args.where.expiresAt?.lte && request.expiresAt > args.where.expiresAt.lte) continue;
          if (args.data.status) request.status = args.data.status;
          count += 1;
        }
        return { count };
      },
      async create(args: { data: Record<string, unknown> }) {
        const nestedItems = args.data.items as { create: Array<Record<string, unknown>> };
        const request = {
          id: D6_REQUEST_ID,
          reservationId: String(args.data.reservationId),
          status: args.data.status as GuestPaymentRequestStatus,
          totalAmount: args.data.totalAmount as Prisma.Decimal,
          currency: String(args.data.currency),
          accessTokenHash: String(args.data.accessTokenHash),
          accessTokenEncrypted: String(args.data.accessTokenEncrypted),
          expiresAt: args.data.expiresAt as Date,
          createdByAdminId: String(args.data.createdByAdminId),
          clientRequestId: String(args.data.clientRequestId),
          paidAt: null,
          cancelledAt: null,
          createdAt: args.data.createdAt as Date,
          updatedAt: args.data.createdAt as Date,
        };
        store.requests.push(request);
        nestedItems.create.forEach((item, index) => {
          store.requestItems.push({
            id: `request-item-${index + 1}`,
            paymentRequestId: request.id,
            additionalChargeId: String(item.additionalChargeId),
            categorySnapshot: String(item.categorySnapshot),
            descriptionSnapshot: String(item.descriptionSnapshot),
            amountSnapshot: item.amountSnapshot as Prisma.Decimal,
            currencySnapshot: String(item.currencySnapshot),
            createdAt: new Date(D6_BASE_NOW.getTime() + index),
          });
        });
        return enrichRequest(store, request);
      },
    },
    emailNotification: {
      async findUnique(args: { where: { deduplicationKey?: string; id?: string } }) {
        const notification = args.where.deduplicationKey
          ? store.notifications.find(
              (candidate) => candidate.deduplicationKey === args.where.deduplicationKey,
            )
          : store.notifications.find((candidate) => candidate.id === args.where.id);
        return notification ? notificationWithRelations(store, notification) : null;
      },
      async findFirst(args: { where: { id?: string; reservationId?: string } }) {
        const notification = store.notifications.find(
          (candidate) =>
            (!args.where.id || candidate.id === args.where.id) &&
            (!args.where.reservationId ||
              candidate.reservationId === args.where.reservationId),
        );
        return notification ? notificationWithRelations(store, notification) : null;
      },
      async findMany(args: { where?: { reservationId?: string } }) {
        return store.notifications
          .filter(
            (notification) =>
              !args.where?.reservationId ||
              notification.reservationId === args.where.reservationId,
          )
          .map((notification) => notificationWithRelations(store, notification));
      },
      async updateMany(args: { where: { id?: string; status?: EmailNotificationStatus; updatedAt?: Date; processingStartedAt?: Date }; data: Record<string, unknown> }) {
        let count = 0;
        for (const notification of store.notifications) {
          if (args.where.id && notification.id !== args.where.id) continue;
          if (args.where.status && notification.status !== args.where.status) continue;
          if (
            args.where.updatedAt &&
            notification.updatedAt.getTime() !== args.where.updatedAt.getTime()
          ) {
            continue;
          }
          if (
            args.where.processingStartedAt &&
            notification.processingStartedAt?.getTime() !==
              args.where.processingStartedAt.getTime()
          ) {
            continue;
          }
          if (args.data.status) {
            notification.status = args.data.status as EmailNotificationStatus;
          }
          if (args.data.updatedAt instanceof Date) notification.updatedAt = args.data.updatedAt;
          if (args.data.processingStartedAt instanceof Date || args.data.processingStartedAt === null) {
            notification.processingStartedAt =
              args.data.processingStartedAt as Date | null;
          }
          if (args.data.lastAttemptAt instanceof Date) notification.lastAttemptAt = args.data.lastAttemptAt;
          if (args.data.nextAttemptAt instanceof Date || args.data.nextAttemptAt === null) {
            notification.nextAttemptAt = args.data.nextAttemptAt as Date | null;
          }
          if (args.data.sentAt instanceof Date) notification.sentAt = args.data.sentAt;
          if (typeof args.data.providerMessageId === "string") {
            notification.providerMessageId = args.data.providerMessageId;
          }
          if (typeof args.data.errorCode === "string" || args.data.errorCode === null) {
            notification.errorCode = args.data.errorCode as string | null;
          }
          if (typeof args.data.errorMessage === "string" || args.data.errorMessage === null) {
            notification.errorMessage = args.data.errorMessage as string | null;
          }
          const increment = (args.data.attemptCount as { increment?: number } | undefined)
            ?.increment;
          if (increment) notification.attemptCount += increment;
          count += 1;
        }
        return { count };
      },
      async create(args: { data: Record<string, unknown> }) {
        const notification: D6Notification = {
          id: `notification-final-d6-${store.notifications.length + 1}`,
          reservationId: String(args.data.reservationId),
          guestPaymentRequestId:
            typeof args.data.guestPaymentRequestId === "string"
              ? args.data.guestPaymentRequestId
              : null,
          lifecycleRequestId: null,
          refundId: null,
          type: args.data.type as EmailNotificationType,
          recipient: String(args.data.recipient),
          locale: String(args.data.locale),
          deduplicationKey: String(args.data.deduplicationKey),
          origin: args.data.origin as EmailNotificationOrigin,
          parentNotificationId:
            typeof args.data.parentNotificationId === "string"
              ? args.data.parentNotificationId
              : null,
          requestedByAdminId:
            typeof args.data.requestedByAdminId === "string"
              ? args.data.requestedByAdminId
              : null,
          requestedAt:
            args.data.requestedAt instanceof Date ? args.data.requestedAt : null,
          status: args.data.status as EmailNotificationStatus,
          attemptCount: 0,
          lastAttemptAt: null,
          nextAttemptAt: null,
          processingStartedAt: null,
          providerMessageId: null,
          sentAt: null,
          errorCode: null,
          errorMessage: null,
          createdAt: D6_BASE_NOW,
          updatedAt: D6_BASE_NOW,
        };
        store.notifications.push(notification);
        return notificationWithRelations(store, notification);
      },
    },
    adminAuditLog: {
      async create(args: { data: { action: string; metadata: unknown } }) {
        store.auditLogs.push({
          action: args.data.action,
          metadata: args.data.metadata,
        });
        return store.auditLogs.at(-1);
      },
      async findMany() {
        return [];
      },
    },
    payment: {
      async findMany() {
        return [];
      },
    },
    refund: {
      async findMany() {
        return [];
      },
    },
    reservationLifecycleRequest: {
      async findMany() {
        return [];
      },
    },
  };

  Object.assign(prisma as unknown as typeof client, client);
}

function assertNoRawToken(value: unknown, token = D6_TOKEN): void {
  assert.equal(JSON.stringify(value).includes(token), false);
}

test("D.6 behavior renders localized additional-charge payment emails without internal fields", async () => {
  const restoreEnv = preserveD6Env();
  try {
    const paymentUrl = `https://trp-booking.juantzun.dev/reservas/cargos/${D6_TOKEN}`;
    const input = {
      publicBaseUrl: "https://trp-booking.juantzun.dev",
      brandLogoUrl: "https://trp-booking.juantzun.dev/logo-email.png",
      reservation: {
        id: D6_RESERVATION_ID,
        guestName: "Final D6 Guest",
        guestEmail: "guest.final-d6@juantzun.dev",
        preferredLocale: "es" as const,
        propertyNameEs: "Bungalow Lago",
        propertyNameEn: "Lake Bungalow",
        currency: "USD",
      },
      paymentRequest: {
        id: D6_REQUEST_ID,
        totalAmount: "30.00",
        currency: "USD",
        expiresAt: "2026-09-24T12:00:00.000Z",
        paymentUrl,
        items: [
          {
            category: "TRANSPORT" as const,
            description: "Airport pickup",
            amount: "12.50",
            currency: "USD",
          },
          {
            category: "CLEANING" as const,
            description: "Extra cleaning",
            amount: "17.50",
            currency: "USD",
          },
        ],
      },
    };

    const es = await buildAdditionalChargePaymentRequiredEmail({
      ...input,
      locale: "es" as const,
    });
    const en = await buildAdditionalChargePaymentRequiredEmail({
      ...input,
      locale: "en" as const,
      reservation: {
        ...input.reservation,
        preferredLocale: "en" as const,
      },
    });

    assert.match(es.subject, /Pago pendiente por cargo adicional/);
    assert.match(es.text, /Transporte/);
    assert.match(es.text, /Limpieza adicional/);
    assert.match(es.text, /Airport pickup/);
    assert.match(es.text, /Extra cleaning/);
    assert.match(es.text, /30\.00/);
    assert.match(es.text, /Pagar cargos adicionales/);
    assert.match(es.text, /reservas@turefugioperfecto\.com/);
    assert.match(en.subject, /Payment pending for additional charge/);
    assert.match(en.text, /Transport/);
    assert.match(en.text, /Additional cleaning/);
    assert.match(en.text, /reservations@turefugioperfecto\.com/);
    assert.ok(es.text.includes(paymentUrl));
    assert.equal((es.text.match(new RegExp(D6_TOKEN, "g")) ?? []).length, 1);
    assert.doesNotMatch(es.text, /driver-internal-note|payment-final-d6|admin-final-d6/);
    assert.doesNotMatch(es.html, /driver-internal-note|payment-final-d6|admin-final-d6/);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior creates the automatic email intent with the guest payment request and preserves idempotency", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);

  try {
    const first = await createAdminGuestPaymentRequest(
      {
        reservationId: D6_RESERVATION_ID,
        clientRequestId: "00000000-0000-4000-8000-000000000d60",
        charges: store.charges.map((charge) => ({
          chargeId: charge.id,
          expectedUpdatedAt: charge.updatedAt.toISOString(),
        })),
      },
      { email: "admin@juantzun.dev", name: "Admin Final D6" },
    );
    const requestHash = store.requests[0]?.accessTokenHash;
    const replay = await createAdminGuestPaymentRequest(
      {
        reservationId: D6_RESERVATION_ID,
        clientRequestId: "00000000-0000-4000-8000-000000000d60",
        charges: store.charges.map((charge) => ({
          chargeId: charge.id,
          expectedUpdatedAt: charge.updatedAt.toISOString(),
        })),
      },
      { email: "admin@juantzun.dev", name: "Admin Final D6" },
    );

    assert.equal(first.id, D6_REQUEST_ID);
    assert.equal(replay.id, D6_REQUEST_ID);
    assert.equal(store.requests.length, 1);
    assert.equal(store.notifications.length, 1);
    assert.equal(store.requests[0]?.accessTokenHash, requestHash);
    assert.equal(
      store.notifications[0]?.type,
      EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    );
    assert.equal(store.notifications[0]?.guestPaymentRequestId, D6_REQUEST_ID);
    assert.equal(store.notifications[0]?.status, EmailNotificationStatus.PENDING);
    assert.equal(store.notifications[0]?.origin, EmailNotificationOrigin.AUTOMATIC);
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior fails delivery safely without rolling back the request or exposing the raw token in persistence", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  installD6Prisma(store);
  const tokenMaterial = createGuestPaymentRequestTokenMaterial(
    D6_RESERVATION_ID,
    D6_TOKEN,
  );
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PENDING,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: tokenMaterial.tokenHash,
    accessTokenEncrypted: tokenMaterial.encryptedToken,
    expiresAt: new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6",
    paidAt: null,
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.requestItems.push(
    {
      id: "item-d6-1",
      paymentRequestId: D6_REQUEST_ID,
      additionalChargeId: "charge-d6-1",
      categorySnapshot: "TRANSPORT",
      descriptionSnapshot: "Airport pickup",
      amountSnapshot: money("12.50"),
      currencySnapshot: "USD",
      createdAt: D6_BASE_NOW,
    },
    {
      id: "item-d6-2",
      paymentRequestId: D6_REQUEST_ID,
      additionalChargeId: "charge-d6-2",
      categorySnapshot: "CLEANING",
      descriptionSnapshot: "Extra cleaning",
      amountSnapshot: money("17.50"),
      currencySnapshot: "USD",
      createdAt: D6_BASE_NOW,
    },
  );
  store.notifications.push({
    id: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: null,
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: "guest.final-d6@juantzun.dev",
    locale: "es",
    deduplicationKey: `additional-charge-payment-required/${D6_REQUEST_ID}/guest.final-d6@juantzun.dev`,
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.PROCESSING,
    attemptCount: 1,
    lastAttemptAt: D6_BASE_NOW,
    nextAttemptAt: null,
    processingStartedAt: D6_BASE_NOW,
    providerMessageId: null,
    sentAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  const provider: EmailProvider = {
    async send() {
      throw new Error("provider down");
    },
  };

  try {
    const outcome = await deliverClaimedAdditionalChargePaymentEmailNotification({
      claim: {
        notificationId: D6_NOTIFICATION_ID,
        processingStartedAt: D6_BASE_NOW,
      },
      provider,
      publicBaseUrl: "https://trp-booking.juantzun.dev",
      brandLogoUrl: "https://trp-booking.juantzun.dev/logo-email.png",
      now: () => D6_BASE_NOW,
    });

    assert.equal(outcome.outcome, "failed");
    assert.equal(store.requests[0]?.status, GuestPaymentRequestStatus.PENDING);
    assert.equal(store.notifications[0]?.status, EmailNotificationStatus.FAILED);
    assert.equal(
      store.notifications[0]?.errorCode,
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    );
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior skips terminal or expired additional-charge payment emails and expires overdue requests", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);
  const tokenMaterial = createGuestPaymentRequestTokenMaterial(
    D6_RESERVATION_ID,
    D6_TOKEN,
  );
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PENDING,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: tokenMaterial.tokenHash,
    accessTokenEncrypted: tokenMaterial.encryptedToken,
    expiresAt: new Date("2026-09-16T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-expired",
    paidAt: null,
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.notifications.push({
    id: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: null,
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: "guest.final-d6@juantzun.dev",
    locale: "es",
    deduplicationKey: "expired-d6",
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.PROCESSING,
    attemptCount: 1,
    lastAttemptAt: D6_BASE_NOW,
    nextAttemptAt: null,
    processingStartedAt: D6_BASE_NOW,
    providerMessageId: null,
    sentAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  let sent = false;
  const provider: EmailProvider = {
    async send() {
      sent = true;
      return {
        provider: "resend",
        providerMessageId: "msg-d6",
        deliveryMode: "test",
        deliveredRecipient: "deliveries@juantzun.dev",
      };
    },
  };

  try {
    const outcome = await deliverClaimedAdditionalChargePaymentEmailNotification({
      claim: {
        notificationId: D6_NOTIFICATION_ID,
        processingStartedAt: D6_BASE_NOW,
      },
      provider,
      publicBaseUrl: "https://trp-booking.juantzun.dev",
      brandLogoUrl: "https://trp-booking.juantzun.dev/logo-email.png",
      now: () => D6_BASE_NOW,
    });

    assert.equal(outcome.outcome, "skipped");
    assert.equal(sent, false);
    assert.equal(store.requests[0]?.status, GuestPaymentRequestStatus.EXPIRED);
    assert.equal(store.notifications[0]?.status, EmailNotificationStatus.SKIPPED);
    assert.equal(
      store.notifications[0]?.errorCode,
      "EMAIL_ADDITIONAL_CHARGE_PAYMENT_SUPERSEDED",
    );
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior creates idempotent manual resends tied to the same guest payment request", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);
  const tokenMaterial = createGuestPaymentRequestTokenMaterial(
    D6_RESERVATION_ID,
    D6_TOKEN,
  );
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PENDING,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: tokenMaterial.tokenHash,
    accessTokenEncrypted: tokenMaterial.encryptedToken,
    expiresAt: new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-manual",
    paidAt: null,
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.requestItems.push(
    {
      id: "item-d6-1",
      paymentRequestId: D6_REQUEST_ID,
      additionalChargeId: "charge-d6-1",
      categorySnapshot: "TRANSPORT",
      descriptionSnapshot: "Airport pickup",
      amountSnapshot: money("12.50"),
      currencySnapshot: "USD",
      createdAt: D6_BASE_NOW,
    },
    {
      id: "item-d6-2",
      paymentRequestId: D6_REQUEST_ID,
      additionalChargeId: "charge-d6-2",
      categorySnapshot: "CLEANING",
      descriptionSnapshot: "Extra cleaning",
      amountSnapshot: money("17.50"),
      currencySnapshot: "USD",
      createdAt: D6_BASE_NOW,
    },
  );
  store.notifications.push({
    id: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: null,
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: "guest.final-d6@juantzun.dev",
    locale: "es",
    deduplicationKey: `additional-charge-payment-required/${D6_REQUEST_ID}/guest.final-d6@juantzun.dev`,
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.SENT,
    attemptCount: 1,
    lastAttemptAt: D6_BASE_NOW,
    nextAttemptAt: null,
    processingStartedAt: null,
    providerMessageId: "msg-source-d6",
    sentAt: D6_BASE_NOW,
    errorCode: null,
    errorMessage: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });

  try {
    const input = {
      sourceNotificationId: D6_NOTIFICATION_ID,
      reservationId: D6_RESERVATION_ID,
      expectedUpdatedAt: D6_BASE_NOW.toISOString(),
      requestId: "00000000-0000-4000-8000-000000000d61",
    };
    const first = await requestAdminEmailNotificationResend(input, {
      email: "admin@juantzun.dev",
      name: "Admin Final D6",
    });
    const replay = await requestAdminEmailNotificationResend(input, {
      email: "admin@juantzun.dev",
      name: "Admin Final D6",
    });
    const children = store.notifications.filter(
      (notification) => notification.parentNotificationId === D6_NOTIFICATION_ID,
    );

    assert.equal(first.created, true);
    assert.equal(replay.created, false);
    assert.equal(children.length, 1);
    assert.equal(children[0]?.guestPaymentRequestId, D6_REQUEST_ID);
    assert.equal(children[0]?.origin, EmailNotificationOrigin.MANUAL);
    assert.equal(children[0]?.recipient, "guest.final-d6@juantzun.dev");
    assert.equal(store.requests[0]?.accessTokenHash, hashGuestPaymentRequestAccessToken(D6_TOKEN));
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior exposes additional-charge email history with safe guest-payment-request relations only", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PENDING,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: hashGuestPaymentRequestAccessToken(D6_TOKEN),
    accessTokenEncrypted: "encrypted-only",
    expiresAt: new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-history",
    paidAt: null,
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.notifications.push({
    id: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: null,
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: "guest.final-d6@juantzun.dev",
    locale: "es",
    deduplicationKey: "history-d6",
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.SENT,
    attemptCount: 1,
    lastAttemptAt: D6_BASE_NOW,
    nextAttemptAt: null,
    processingStartedAt: null,
    providerMessageId: "safe-provider-message",
    sentAt: D6_BASE_NOW,
    errorCode: null,
    errorMessage: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  const client = prisma as unknown as {
    payment: { findMany: () => Promise<unknown[]> };
  };
  client.payment.findMany = async () => [
    {
      id: "payment-d6-history",
      lifecycleRequestId: null,
      guestPaymentRequestId: D6_REQUEST_ID,
      purpose: PaymentPurpose.ADDITIONAL_CHARGE,
      status: PaymentStatus.PENDING,
      amount: money("30.00"),
      currency: "USD",
      providerReference: "TRP-D6-SAFE",
      paidAt: null,
      failedAt: null,
      createdAt: D6_BASE_NOW,
      updatedAt: D6_BASE_NOW,
    },
  ];

  try {
    const history = await getAdminReservationOperationalHistory(D6_RESERVATION_ID);
    const emailEvent = history.find(
      (event) =>
        event.eventType === "EMAIL_SENT" &&
        event.relations.some(
          (relation) =>
            relation.kind === "GUEST_PAYMENT_REQUEST" &&
            relation.id === D6_REQUEST_ID,
        ),
    );
    const paymentEvent = history.find(
      (event) =>
        event.eventType === "PAYMENT_CREATED" &&
        event.paymentPurpose === PaymentPurpose.ADDITIONAL_CHARGE,
    );

    assert.ok(emailEvent);
    assert.ok(paymentEvent);
    assertNoRawToken(history);
    assert.equal(JSON.stringify(history).includes("/reservas/cargos/"), false);
  } finally {
    restoreEnv();
  }
});
