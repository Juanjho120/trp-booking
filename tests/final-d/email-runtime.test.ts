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
  RefundAuthorizationType,
  RefundStatus,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

import {
  buildAdditionalChargeAdminPaymentApprovedEmail,
  buildAdditionalChargeAdminPaymentRequiredEmail,
  buildAdditionalChargeAdminRefundProcessedEmail,
  buildAdditionalChargePaymentApprovedEmail,
  buildAdditionalChargePaymentRequiredEmail,
  buildAdditionalChargeRefundProcessedEmail,
} from "@/emails";
import { prisma } from "@/lib/db/prisma";
import {
  deliverClaimedAdditionalChargePaymentEmailNotification,
} from "@/lib/email/additional-charge-payment-notifications";
import { processEmailNotifications } from "@/lib/email";
import { createAdminGuestPaymentRequest } from "@/lib/admin/additional-charges";
import {
  AdminEmailNotificationResendError,
  requestAdminEmailNotificationResend,
} from "@/lib/admin/email-notification-resend";
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

type D6Payment = {
  id: string;
  guestPaymentRequestId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type D6Refund = {
  id: string;
  paymentId: string;
  authorizationType: RefundAuthorizationType;
  status: RefundStatus;
  amount: Prisma.Decimal;
  currency: string;
  processingMode: string;
  providerRefundId: string | null;
  reason: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedByAdmin: { name: string | null; email: string } | null;
  payment: {
    id: string;
    purpose: PaymentPurpose;
    status: PaymentStatus;
    amount: Prisma.Decimal;
    currency: string;
    guestPaymentRequestId: string | null;
    reservationId: string;
    refunds: Array<{
      id: string;
      authorizationType: RefundAuthorizationType;
      status: RefundStatus;
      amount: Prisma.Decimal;
      approvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  additionalChargeAllocations: Array<{
    additionalChargeId: string;
    allocatedAmount: Prisma.Decimal;
    additionalCharge: {
      id: string;
      category: "TRANSPORT" | "CLEANING";
      description: string;
      amount: Prisma.Decimal;
      currency: string;
      status: AdditionalChargeStatus;
      refundAllocations: Array<{
        allocatedAmount: Prisma.Decimal;
        refund: {
          id: string;
          status: RefundStatus;
          approvedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        };
      }>;
    };
  }>;
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
  payments: D6Payment[];
  refunds: D6Refund[];
  notifications: D6Notification[];
  auditLogs: Array<{ action: string; metadata: unknown }>;
  failAutomaticNotificationCreate: boolean;
};

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneD6Payment(payment: D6Payment): D6Payment {
  return {
    ...payment,
    amount: money(payment.amount.toFixed(2)),
    paidAt: cloneDate(payment.paidAt),
    createdAt: new Date(payment.createdAt.getTime()),
    updatedAt: new Date(payment.updatedAt.getTime()),
  };
}

function cloneD6Refund(refund: D6Refund): D6Refund {
  return {
    ...refund,
    amount: money(refund.amount.toFixed(2)),
    approvedAt: cloneDate(refund.approvedAt),
    createdAt: new Date(refund.createdAt.getTime()),
    updatedAt: new Date(refund.updatedAt.getTime()),
    requestedByAdmin: refund.requestedByAdmin
      ? { ...refund.requestedByAdmin }
      : null,
    payment: {
      ...refund.payment,
      amount: money(refund.payment.amount.toFixed(2)),
      refunds: refund.payment.refunds.map((paymentRefund) => ({
        ...paymentRefund,
        amount: money(paymentRefund.amount.toFixed(2)),
        approvedAt: cloneDate(paymentRefund.approvedAt),
        createdAt: new Date(paymentRefund.createdAt.getTime()),
        updatedAt: new Date(paymentRefund.updatedAt.getTime()),
      })),
    },
    additionalChargeAllocations: refund.additionalChargeAllocations.map(
      (allocation) => ({
        ...allocation,
        allocatedAmount: money(allocation.allocatedAmount.toFixed(2)),
        additionalCharge: {
          ...allocation.additionalCharge,
          amount: money(allocation.additionalCharge.amount.toFixed(2)),
          refundAllocations:
            allocation.additionalCharge.refundAllocations.map(
              (refundAllocation) => ({
                allocatedAmount: money(
                  refundAllocation.allocatedAmount.toFixed(2),
                ),
                refund: {
                  ...refundAllocation.refund,
                  approvedAt: cloneDate(refundAllocation.refund.approvedAt),
                  createdAt: new Date(
                    refundAllocation.refund.createdAt.getTime(),
                  ),
                  updatedAt: new Date(
                    refundAllocation.refund.updatedAt.getTime(),
                  ),
                },
              }),
            ),
        },
      }),
    ),
  };
}

function cloneD6Store(store: D6Store): D6Store {
  return {
    users: store.users.map((user) => ({ ...user })),
    reservation: {
      ...store.reservation,
      confirmedAt: cloneDate(store.reservation.confirmedAt),
      cancelledAt: cloneDate(store.reservation.cancelledAt),
      updatedAt: new Date(store.reservation.updatedAt.getTime()),
      createdAt: new Date(store.reservation.createdAt.getTime()),
      property: { ...store.reservation.property },
    },
    charges: store.charges.map((charge) => ({
      ...charge,
      amount: money(charge.amount.toFixed(2)),
      cancelledAt: cloneDate(charge.cancelledAt),
      createdAt: new Date(charge.createdAt.getTime()),
      updatedAt: new Date(charge.updatedAt.getTime()),
      createdByAdmin: { ...charge.createdByAdmin },
      paymentRequestItems: cloneJson(charge.paymentRequestItems),
      refundAllocations: cloneJson(charge.refundAllocations),
    })),
    requests: store.requests.map((request) => ({
      ...request,
      totalAmount: money(request.totalAmount.toFixed(2)),
      expiresAt: new Date(request.expiresAt.getTime()),
      paidAt: cloneDate(request.paidAt),
      cancelledAt: cloneDate(request.cancelledAt),
      createdAt: new Date(request.createdAt.getTime()),
      updatedAt: new Date(request.updatedAt.getTime()),
    })),
    requestItems: store.requestItems.map((item) => ({
      ...item,
      amountSnapshot: money(item.amountSnapshot.toFixed(2)),
      createdAt: new Date(item.createdAt.getTime()),
    })),
    payments: store.payments.map(cloneD6Payment),
    refunds: store.refunds.map(cloneD6Refund),
    notifications: store.notifications.map((notification) => ({
      ...notification,
      requestedAt: cloneDate(notification.requestedAt),
      lastAttemptAt: cloneDate(notification.lastAttemptAt),
      nextAttemptAt: cloneDate(notification.nextAttemptAt),
      processingStartedAt: cloneDate(notification.processingStartedAt),
      sentAt: cloneDate(notification.sentAt),
      createdAt: new Date(notification.createdAt.getTime()),
      updatedAt: new Date(notification.updatedAt.getTime()),
    })),
    auditLogs: cloneJson(store.auditLogs),
    failAutomaticNotificationCreate: store.failAutomaticNotificationCreate,
  };
}

function restoreD6Store(target: D6Store, snapshot: D6Store): void {
  target.users = snapshot.users;
  target.reservation = snapshot.reservation;
  target.charges = snapshot.charges;
  target.requests = snapshot.requests;
  target.requestItems = snapshot.requestItems;
  target.payments = snapshot.payments;
  target.refunds = snapshot.refunds;
  target.notifications = snapshot.notifications;
  target.auditLogs = snapshot.auditLogs;
  target.failAutomaticNotificationCreate =
    snapshot.failAutomaticNotificationCreate;
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
    payments: [],
    refunds: [],
    notifications: [],
    auditLogs: [],
    failAutomaticNotificationCreate: false,
  };
}

function paymentForRequest(store: D6Store, requestId: string) {
  return (
    store.payments.find(
      (payment) => payment.guestPaymentRequestId === requestId,
    ) ?? null
  );
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
    payment: paymentForRequest(store, request.id),
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
  const refund = notification.refundId
    ? store.refunds.find((candidate) => candidate.id === notification.refundId)
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
    refund: refund ?? null,
    reservation: {
      status: store.reservation.status,
      confirmedAt: store.reservation.confirmedAt,
    },
  };
}

type D6EmailNotificationWhere = Readonly<{
  id?: string;
  reservationId?: string;
  type?:
    | EmailNotificationType
    | Readonly<{ in?: readonly EmailNotificationType[] }>;
  status?: EmailNotificationStatus;
  updatedAt?: Date;
  processingStartedAt?:
    | Date
    | null
    | Readonly<{ lte?: Date }>;
  attemptCount?: Readonly<{ lt?: number; gte?: number }>;
  errorCode?:
    | string
    | null
    | Readonly<{ in?: readonly string[] }>;
  nextAttemptAt?: null | Readonly<{ lte?: Date }>;
  manualResends?: Readonly<{ none?: object }>;
  deliveryStatusNotifications?: Readonly<{ none?: object }>;
  OR?: readonly D6EmailNotificationWhere[];
}>;

function matchesOptionalDate(
  actual: Date | null,
  expected: Date | null | Readonly<{ lte?: Date }>,
): boolean {
  if (expected === null) return actual === null;
  if (expected instanceof Date) {
    return actual?.getTime() === expected.getTime();
  }
  if (expected.lte) {
    return actual !== null && actual <= expected.lte;
  }
  return true;
}

function matchesEmailNotificationWhere(
  store: D6Store,
  notification: D6Notification,
  where: D6EmailNotificationWhere = {},
): boolean {
  if (where.id && notification.id !== where.id) return false;
  if (where.reservationId && notification.reservationId !== where.reservationId) {
    return false;
  }
  if (where.status && notification.status !== where.status) return false;
  if (
    where.updatedAt &&
    notification.updatedAt.getTime() !== where.updatedAt.getTime()
  ) {
    return false;
  }
  if (
    where.processingStartedAt !== undefined &&
    !matchesOptionalDate(
      notification.processingStartedAt,
      where.processingStartedAt,
    )
  ) {
    return false;
  }
  if (
    where.nextAttemptAt !== undefined &&
    !matchesOptionalDate(notification.nextAttemptAt, where.nextAttemptAt)
  ) {
    return false;
  }
  if (
    typeof where.type === "string" &&
    notification.type !== where.type
  ) {
    return false;
  }
  if (
    typeof where.type === "object" &&
    where.type.in &&
    !where.type.in.includes(notification.type)
  ) {
    return false;
  }
  if (
    where.attemptCount?.lt !== undefined &&
    notification.attemptCount >= where.attemptCount.lt
  ) {
    return false;
  }
  if (
    where.attemptCount?.gte !== undefined &&
    notification.attemptCount < where.attemptCount.gte
  ) {
    return false;
  }
  if (
    typeof where.errorCode === "string" &&
    notification.errorCode !== where.errorCode
  ) {
    return false;
  }
  if (where.errorCode === null && notification.errorCode !== null) {
    return false;
  }
  if (
    typeof where.errorCode === "object" &&
    where.errorCode?.in &&
    (!notification.errorCode ||
      !where.errorCode.in.includes(notification.errorCode))
  ) {
    return false;
  }
  if (where.manualResends?.none) {
    const hasManualChild = store.notifications.some(
      (candidate) => candidate.parentNotificationId === notification.id,
    );
    if (hasManualChild) return false;
  }
  if (where.OR && !where.OR.some((branch) =>
    matchesEmailNotificationWhere(store, notification, branch),
  )) {
    return false;
  }

  return true;
}

function installD6Prisma(store: D6Store): void {
  const client = {
    async $transaction<T>(operation: (transaction: typeof client) => Promise<T>): Promise<T> {
      const before = cloneD6Store(store);

      try {
        return await operation(client);
      } catch (error) {
        restoreD6Store(store, before);
        throw error;
      }
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
      async updateMany(args: {
        where: {
          id?: string;
          reservationId?: string;
          status?: GuestPaymentRequestStatus;
          expiresAt?: { lte?: Date };
          emailNotifications?: {
            some?: {
              id?: string;
              reservationId?: string;
              type?: EmailNotificationType;
            };
          };
        };
        data: { status?: GuestPaymentRequestStatus };
      }) {
        let count = 0;
        for (const request of store.requests) {
          if (args.where.id && request.id !== args.where.id) continue;
          if (
            args.where.reservationId &&
            request.reservationId !== args.where.reservationId
          ) {
            continue;
          }
          if (args.where.status && request.status !== args.where.status) continue;
          if (args.where.expiresAt?.lte && request.expiresAt > args.where.expiresAt.lte) continue;
          const notificationFilter = args.where.emailNotifications?.some;
          if (notificationFilter) {
            const hasMatchingNotification = store.notifications.some(
              (notification) =>
                notification.guestPaymentRequestId === request.id &&
                (!notificationFilter.id ||
                  notification.id === notificationFilter.id) &&
                (!notificationFilter.reservationId ||
                  notification.reservationId ===
                    notificationFilter.reservationId) &&
                (!notificationFilter.type ||
                  notification.type === notificationFilter.type),
            );

            if (!hasMatchingNotification) continue;
          }
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
      async findFirst(args: { where: D6EmailNotificationWhere }) {
        const notification = store.notifications.find((candidate) =>
          matchesEmailNotificationWhere(store, candidate, args.where),
        );
        return notification ? notificationWithRelations(store, notification) : null;
      },
      async findMany(args: {
        where?: D6EmailNotificationWhere;
        take?: number;
      }) {
        const notifications = store.notifications
          .filter((notification) =>
            matchesEmailNotificationWhere(store, notification, args.where),
          )
          .sort((first, second) => {
            const firstAttemptAt =
              first.nextAttemptAt?.getTime() ?? Number.NEGATIVE_INFINITY;
            const secondAttemptAt =
              second.nextAttemptAt?.getTime() ?? Number.NEGATIVE_INFINITY;
            if (firstAttemptAt !== secondAttemptAt) {
              return firstAttemptAt - secondAttemptAt;
            }
            const createdOrder =
              first.createdAt.getTime() - second.createdAt.getTime();
            return createdOrder !== 0
              ? createdOrder
              : first.id.localeCompare(second.id);
          })
          .slice(0, args.take ?? Number.POSITIVE_INFINITY)
          .map((notification) => notificationWithRelations(store, notification));
        return notifications;
      },
      async updateMany(args: {
        where: D6EmailNotificationWhere;
        data: Record<string, unknown>;
      }) {
        let count = 0;
        for (const notification of store.notifications) {
          if (!matchesEmailNotificationWhere(store, notification, args.where)) {
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
        if (
          store.failAutomaticNotificationCreate &&
          args.data.type ===
            EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED &&
          args.data.origin === EmailNotificationOrigin.AUTOMATIC
        ) {
          throw new Error("forced automatic notification failure");
        }

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
        return store.payments;
      },
    },
    refund: {
      async findMany() {
        return store.refunds;
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

function seedD6PaymentRequest(
  store: D6Store,
  options: Readonly<{
    status?: GuestPaymentRequestStatus;
    expiresAt?: Date;
    withItems?: boolean;
  }> = {},
): void {
  const tokenMaterial = createGuestPaymentRequestTokenMaterial(
    D6_RESERVATION_ID,
    D6_TOKEN,
  );

  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: options.status ?? GuestPaymentRequestStatus.PENDING,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: tokenMaterial.tokenHash,
    accessTokenEncrypted: tokenMaterial.encryptedToken,
    expiresAt:
      options.expiresAt ?? new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-seeded",
    paidAt: null,
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });

  if (options.withItems === false) {
    return;
  }

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
}

function seedD6SourceNotification(
  store: D6Store,
  options: Readonly<{
    status?: EmailNotificationStatus;
    updatedAt?: Date;
  }> = {},
): void {
  const timestamp = options.updatedAt ?? D6_BASE_NOW;

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
    status: options.status ?? EmailNotificationStatus.SENT,
    attemptCount: 1,
    lastAttemptAt: D6_BASE_NOW,
    nextAttemptAt: null,
    processingStartedAt: null,
    providerMessageId: "msg-source-d6",
    sentAt: D6_BASE_NOW,
    errorCode: null,
    errorMessage: null,
    createdAt: D6_BASE_NOW,
    updatedAt: timestamp,
  });
}

function seedD6AdminPendingRetryNotification(store: D6Store): void {
  store.notifications.push({
    id: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: null,
    type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: "admin@juantzun.dev",
    locale: "es",
    deduplicationKey:
      `admin-additional-charge-payment-required/${D6_REQUEST_ID}/admin@juantzun.dev`,
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.FAILED,
    attemptCount: 1,
    lastAttemptAt: new Date("2026-09-17T11:00:00.000Z"),
    nextAttemptAt: new Date("2026-09-17T11:05:00.000Z"),
    processingStartedAt: null,
    providerMessageId: null,
    sentAt: null,
    errorCode: "EMAIL_PROVIDER_TEMPORARY_FAILURE",
    errorMessage: "The email provider is temporarily unavailable.",
    createdAt: new Date("2026-09-17T10:00:00.000Z"),
    updatedAt: new Date("2026-09-17T11:00:00.000Z"),
  });
}

function seedD6RetryNotification(
  store: D6Store,
  input: Readonly<{
    id: string;
    type: EmailNotificationType;
    recipient: string;
    deduplicationKey: string;
    locale?: "es" | "en";
    refundId?: string | null;
  }>,
): void {
  store.notifications.push({
    id: input.id,
    reservationId: D6_RESERVATION_ID,
    guestPaymentRequestId: D6_REQUEST_ID,
    lifecycleRequestId: null,
    refundId: input.refundId ?? null,
    type: input.type,
    recipient: input.recipient,
    locale: input.locale ?? "es",
    deduplicationKey: input.deduplicationKey,
    origin: EmailNotificationOrigin.AUTOMATIC,
    parentNotificationId: null,
    requestedByAdminId: null,
    requestedAt: null,
    status: EmailNotificationStatus.FAILED,
    attemptCount: 1,
    lastAttemptAt: new Date("2026-09-17T11:00:00.000Z"),
    nextAttemptAt: new Date("2026-09-17T11:05:00.000Z"),
    processingStartedAt: null,
    providerMessageId: null,
    sentAt: null,
    errorCode: "EMAIL_PROVIDER_TEMPORARY_FAILURE",
    errorMessage: "The email provider is temporarily unavailable.",
    createdAt: new Date("2026-09-17T10:00:00.000Z"),
    updatedAt: new Date("2026-09-17T11:00:00.000Z"),
  });
}

function d6ManualResendInput(
  requestId: string,
  expectedUpdatedAt = D6_BASE_NOW.toISOString(),
) {
  return {
    sourceNotificationId: D6_NOTIFICATION_ID,
    reservationId: D6_RESERVATION_ID,
    expectedUpdatedAt,
    requestId,
  };
}

async function assertD6ResendRejected(
  input: Parameters<typeof requestAdminEmailNotificationResend>[0],
): Promise<void> {
  await assert.rejects(
    () =>
      requestAdminEmailNotificationResend(input, {
        email: "admin@juantzun.dev",
        name: "Admin Final D6",
      }),
    (error: unknown) =>
      error instanceof AdminEmailNotificationResendError &&
      error.code === "ADMIN_EMAIL_NOTIFICATION_RESEND_NOT_ALLOWED",
  );
}

async function withFetchCallCounter(
  run: (calls: () => number) => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async () => {
    callCount += 1;
    throw new Error("unexpected provider call");
  }) as typeof fetch;

  try {
    await run(() => callCount);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function processD6EmailRetryWithProviderCounter(): Promise<
  Readonly<{
    providerCalls: number;
    payloads: Array<Parameters<EmailProvider["send"]>[0]>;
    summary: Awaited<ReturnType<typeof processEmailNotifications>>;
  }>
> {
  let providerCalls = 0;
  const payloads: Array<Parameters<EmailProvider["send"]>[0]> = [];
  const provider: EmailProvider = {
    async send(payload) {
      providerCalls += 1;
      payloads.push(payload);
      return {
        provider: "resend",
        providerMessageId: "msg-d6-retry",
        deliveryMode: "test",
        deliveredRecipient: "deliveries@juantzun.dev",
      };
    },
  };
  const summary = await processEmailNotifications({
    source: process.env,
    provider,
    now: () => D6_BASE_NOW,
  });

  return { payloads, providerCalls, summary };
}

function joinedPayloadContent(
  payloads: readonly Parameters<EmailProvider["send"]>[0][],
): string {
  return payloads
    .map((payload) => `${payload.subject}\n${payload.text}\n${payload.html}`)
    .join("\n");
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

test("D.6 behavior renders ancillary admin, approval, and refund templates with safe ES/EN content", async () => {
  const restoreEnv = preserveD6Env();
  try {
    for (const locale of ["es", "en"] as const) {
      const reservation = {
        id: D6_RESERVATION_ID,
        guestName: "Final D6 Guest",
        guestEmail: "guest.final-d6@juantzun.dev",
        preferredLocale: locale,
        propertyNameEs: "Bungalow Lago",
        propertyNameEn: "Lake Bungalow",
        currency: "USD",
      };
      const common = {
        locale,
        publicBaseUrl: "https://trp-booking.juantzun.dev",
        brandLogoUrl: "https://trp-booking.juantzun.dev/logo-email.png",
        reservation,
      };
      const items = [
        {
          category: "TRANSPORT" as const,
          description: "Airport pickup",
          amount: "12.50",
          currency: "USD",
          status: "PAID",
        },
        {
          category: "CLEANING" as const,
          description: "Extra cleaning",
          amount: "17.50",
          currency: "USD",
          status: "PAID",
        },
      ];
      const allocations = [
        {
          additionalChargeId: "charge-d6-1",
          category: "TRANSPORT" as const,
          description: "Airport pickup",
          originalAmount: "12.50",
          allocatedAmount: "7.50",
          cumulativeRefundedAmount: "7.50",
          remainingAmount: "5.00",
          currency: "USD",
          resultingStatus: "PARTIALLY_REFUNDED",
        },
      ];

      const adminPending =
        await buildAdditionalChargeAdminPaymentRequiredEmail({
          ...common,
          paymentRequest: {
            id: D6_REQUEST_ID,
            totalAmount: "30.00",
            currency: "USD",
            createdAt: "2026-09-17T12:00:00.000Z",
            expiresAt: "2026-09-24T12:00:00.000Z",
            status: "PENDING",
            createdByAdminName: "Admin Final D6",
            createdByAdminEmail: "admin@juantzun.dev",
            intendedGuestRecipient: "guest.final-d6@juantzun.dev",
            items,
          },
        });
      const guestApproved =
        await buildAdditionalChargePaymentApprovedEmail({
          ...common,
          payment: {
            paidAt: "2026-09-17T13:00:00.000Z",
            totalAmount: "30.00",
            currency: "USD",
            items,
          },
        });
      const adminApproved =
        await buildAdditionalChargeAdminPaymentApprovedEmail({
          ...common,
          paymentRequest: {
            id: D6_REQUEST_ID,
            status: "PAID",
          },
          payment: {
            id: "payment-final-d6",
            providerReference: "TRP-D6-SAFE",
            paidAt: "2026-09-17T13:00:00.000Z",
            status: "APPROVED",
            totalAmount: "30.00",
            currency: "USD",
            items,
          },
        });
      const guestRefund =
        await buildAdditionalChargeRefundProcessedEmail({
          ...common,
          refund: {
            id: "refund-final-d6",
            totalAmount: "7.50",
            currency: "USD",
            approvedAt: "2026-09-17T14:00:00.000Z",
            allocations,
          },
        });
      const adminRefund =
        await buildAdditionalChargeAdminRefundProcessedEmail({
          ...common,
          guestPaymentRequestId: D6_REQUEST_ID,
          refund: {
            id: "refund-final-d6",
            paymentId: "payment-final-d6",
            paymentStatus: "PARTIALLY_REFUNDED",
            processingMode: "TILOPAY_PORTAL_FALLBACK",
            providerRefundId: "refund-provider-safe",
            reason: "Ancillary refund evidence",
            requestedByAdminName: "Admin Final D6",
            requestedByAdminEmail: "admin@juantzun.dev",
            totalAmount: "7.50",
            currency: "USD",
            approvedAt: "2026-09-17T14:00:00.000Z",
            allocations,
          },
        });
      const rendered = [
        adminPending,
        guestApproved,
        adminApproved,
        guestRefund,
        adminRefund,
      ];
      const allText = rendered.map((email) => email.text).join("\n");
      const expected = locale === "es"
        ? {
            pending: "Pendiente",
            paid: "Pagado",
            approved: "Aprobado",
            partial: "Parcialmente reembolsado",
            portal: "Portal de Tilopay",
          }
        : {
            pending: "Pending",
            paid: "Paid",
            approved: "Approved",
            partial: "Partially refunded",
            portal: "Tilopay portal",
          };

      assert.match(allText, /Airport pickup/);
      assert.match(allText, /Extra cleaning/);
      assert.match(allText, /30\.00|30,00/);
      assert.match(allText, /7\.50|7,50/);
      assert.match(adminPending.text, new RegExp(expected.pending));
      assert.match(adminApproved.text, new RegExp(expected.approved));
      assert.match(adminApproved.text, new RegExp(expected.paid));
      assert.match(guestRefund.text, new RegExp(expected.partial));
      assert.match(adminRefund.text, new RegExp(expected.partial));
      assert.match(adminRefund.text, new RegExp(expected.portal));
      assert.match(adminApproved.text, /TRP-D6-SAFE/);
      assert.match(adminRefund.text, /refund-provider-safe/);
      assert.equal(allText.includes(D6_TOKEN), false);
      assert.equal(allText.includes("/reservas/cargos/"), false);
      assert.doesNotMatch(
        allText,
        /driver-internal-note|4111|rawPayload|provider raw/i,
      );
      assert.doesNotMatch(
        allText,
        /\b(?:PENDING|PAID|APPROVED|PARTIALLY_REFUNDED|REFUNDED|TILOPAY_API|TILOPAY_PORTAL_FALLBACK)\b/,
      );
    }
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
    assert.equal(store.notifications.length, 2);
    assert.equal(store.requests[0]?.accessTokenHash, requestHash);
    assert.deepEqual(
      store.notifications.map((notification) => notification.type),
      [
        EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
      ],
    );
    assert.equal(store.notifications[0]?.guestPaymentRequestId, D6_REQUEST_ID);
    assert.equal(store.notifications[1]?.guestPaymentRequestId, D6_REQUEST_ID);
    assert.equal(store.notifications[0]?.status, EmailNotificationStatus.PENDING);
    assert.equal(store.notifications[1]?.status, EmailNotificationStatus.PENDING);
    assert.equal(store.notifications[0]?.origin, EmailNotificationOrigin.AUTOMATIC);
    assert.equal(store.notifications[1]?.origin, EmailNotificationOrigin.AUTOMATIC);
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior rolls back the guest payment request when automatic email intent creation fails", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  store.failAutomaticNotificationCreate = true;
  installD6Prisma(store);

  try {
    await assert.rejects(
      () =>
        createAdminGuestPaymentRequest(
          {
            reservationId: D6_RESERVATION_ID,
            clientRequestId: "00000000-0000-4000-8000-000000000d62",
            charges: store.charges.map((charge) => ({
              chargeId: charge.id,
              expectedUpdatedAt: charge.updatedAt.toISOString(),
            })),
          },
          { email: "admin@juantzun.dev", name: "Admin Final D6" },
        ),
      /forced automatic notification failure/,
    );

    assert.equal(store.requests.length, 0);
    assert.equal(store.requestItems.length, 0);
    assert.equal(store.notifications.length, 0);
    assert.equal(store.auditLogs.length, 0);
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

test("D.6 behavior skips stale admin pending retry after the guest payment request is paid", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    status: GuestPaymentRequestStatus.PAID,
  });
  store.requests[0]!.paidAt = new Date("2026-09-17T11:30:00.000Z");
  store.charges.forEach((charge) => {
    charge.status = AdditionalChargeStatus.PAID;
  });
  seedD6AdminPendingRetryNotification(store);
  installD6Prisma(store);

  try {
    const { providerCalls, summary } =
      await processD6EmailRetryWithProviderCounter();

    assert.equal(summary.candidates, 1);
    assert.equal(summary.claimed, 1);
    assert.equal(summary.attempted, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.sent, 0);
    assert.equal(providerCalls, 0);
    assert.equal(store.requests[0]?.status, GuestPaymentRequestStatus.PAID);
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

test("D.6 behavior skips stale admin pending retry after the guest payment request is cancelled", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    status: GuestPaymentRequestStatus.CANCELLED,
  });
  seedD6AdminPendingRetryNotification(store);
  installD6Prisma(store);

  try {
    const { providerCalls, summary } =
      await processD6EmailRetryWithProviderCounter();

    assert.equal(summary.candidates, 1);
    assert.equal(summary.claimed, 1);
    assert.equal(summary.attempted, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.sent, 0);
    assert.equal(providerCalls, 0);
    assert.equal(
      store.requests[0]?.status,
      GuestPaymentRequestStatus.CANCELLED,
    );
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

test("D.6 behavior expires and skips overdue stale admin pending retries", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    expiresAt: new Date("2026-09-17T11:59:59.000Z"),
  });
  seedD6AdminPendingRetryNotification(store);
  installD6Prisma(store);

  try {
    const { providerCalls, summary } =
      await processD6EmailRetryWithProviderCounter();

    assert.equal(summary.candidates, 1);
    assert.equal(summary.claimed, 1);
    assert.equal(summary.attempted, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.sent, 0);
    assert.equal(providerCalls, 0);
    assert.equal(
      store.requests[0]?.status,
      GuestPaymentRequestStatus.EXPIRED,
    );
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

test("D.6 behavior renders delayed ancillary refund retries as of the target refund", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    status: GuestPaymentRequestStatus.PAID,
    withItems: false,
  });
  const paidAt = new Date("2026-09-17T13:00:00.000Z");
  const refundAApprovedAt = new Date("2026-09-17T14:00:00.000Z");
  const refundBApprovedAt = new Date("2026-09-17T15:00:00.000Z");
  const request = store.requests[0]!;
  request.totalAmount = money("100.00");
  request.paidAt = paidAt;
  store.charges[0]!.amount = money("100.00");
  store.charges[0]!.status = AdditionalChargeStatus.REFUNDED;
  store.requestItems.push({
    id: "item-d6-refund-email",
    paymentRequestId: D6_REQUEST_ID,
    additionalChargeId: "charge-d6-1",
    categorySnapshot: "TRANSPORT",
    descriptionSnapshot: "Airport pickup",
    amountSnapshot: money("100.00"),
    currencySnapshot: "USD",
    createdAt: D6_BASE_NOW,
  });
  store.payments.push({
    id: "payment-d6-refund-email",
    guestPaymentRequestId: D6_REQUEST_ID,
    purpose: PaymentPurpose.ADDITIONAL_CHARGE,
    status: PaymentStatus.REFUNDED,
    amount: money("100.00"),
    currency: "USD",
    providerReference: "TRP-D6-REFUND",
    paidAt,
    createdAt: paidAt,
    updatedAt: refundBApprovedAt,
  });
  const refundTimelineA = {
    id: "refund-d6-email-a",
    status: RefundStatus.APPROVED,
    approvedAt: refundAApprovedAt,
    createdAt: new Date("2026-09-17T13:30:00.000Z"),
    updatedAt: refundAApprovedAt,
  };
  const refundTimelineB = {
    id: "refund-d6-email-b",
    status: RefundStatus.APPROVED,
    approvedAt: refundBApprovedAt,
    createdAt: new Date("2026-09-17T14:30:00.000Z"),
    updatedAt: refundBApprovedAt,
  };
  const paymentRefunds = [
    {
      ...refundTimelineA,
      authorizationType: RefundAuthorizationType.ADDITIONAL_CHARGE,
      amount: money("30.00"),
    },
    {
      ...refundTimelineB,
      authorizationType: RefundAuthorizationType.ADDITIONAL_CHARGE,
      amount: money("70.00"),
    },
  ];
  const allocationCharge = {
    id: "charge-d6-1",
    category: "TRANSPORT" as const,
    description: "Airport pickup",
    amount: money("100.00"),
    currency: "USD",
    status: AdditionalChargeStatus.REFUNDED,
    refundAllocations: [
      {
        allocatedAmount: money("30.00"),
        refund: refundTimelineA,
      },
      {
        allocatedAmount: money("70.00"),
        refund: refundTimelineB,
      },
    ],
  };
  store.refunds.push({
    id: "refund-d6-email-a",
    paymentId: "payment-d6-refund-email",
    authorizationType: RefundAuthorizationType.ADDITIONAL_CHARGE,
    status: RefundStatus.APPROVED,
    amount: money("30.00"),
    currency: "USD",
    processingMode: "TILOPAY_PORTAL_FALLBACK",
    providerRefundId: "safe-refund-a",
    reason: "First ancillary refund",
    approvedAt: refundAApprovedAt,
    createdAt: new Date("2026-09-17T13:30:00.000Z"),
    updatedAt: refundAApprovedAt,
    requestedByAdmin: {
      name: "Admin Final D6",
      email: "admin@juantzun.dev",
    },
    payment: {
      id: "payment-d6-refund-email",
      purpose: PaymentPurpose.ADDITIONAL_CHARGE,
      status: PaymentStatus.REFUNDED,
      amount: money("100.00"),
      currency: "USD",
      guestPaymentRequestId: D6_REQUEST_ID,
      reservationId: D6_RESERVATION_ID,
      refunds: paymentRefunds,
    },
    additionalChargeAllocations: [
      {
        additionalChargeId: "charge-d6-1",
        allocatedAmount: money("30.00"),
        additionalCharge: allocationCharge,
      },
    ],
  });
  store.refunds.push({
    id: "refund-d6-email-b",
    paymentId: "payment-d6-refund-email",
    authorizationType: RefundAuthorizationType.ADDITIONAL_CHARGE,
    status: RefundStatus.APPROVED,
    amount: money("70.00"),
    currency: "USD",
    processingMode: "TILOPAY_API",
    providerRefundId: "safe-refund-b",
    reason: "Second ancillary refund",
    approvedAt: refundBApprovedAt,
    createdAt: new Date("2026-09-17T14:30:00.000Z"),
    updatedAt: refundBApprovedAt,
    requestedByAdmin: {
      name: "Admin Final D6",
      email: "admin@juantzun.dev",
    },
    payment: {
      id: "payment-d6-refund-email",
      purpose: PaymentPurpose.ADDITIONAL_CHARGE,
      status: PaymentStatus.REFUNDED,
      amount: money("100.00"),
      currency: "USD",
      guestPaymentRequestId: D6_REQUEST_ID,
      reservationId: D6_RESERVATION_ID,
      refunds: paymentRefunds,
    },
    additionalChargeAllocations: [
      {
        additionalChargeId: "charge-d6-1",
        allocatedAmount: money("70.00"),
        additionalCharge: allocationCharge,
      },
    ],
  });
  const refundRetryKeys = {
    guestEsA:
      "additional-charge-refund-processed/refund-d6-email-a/guest.es@juantzun.dev",
    adminEsA:
      "admin-additional-charge-refund-processed/refund-d6-email-a/admin.es@juantzun.dev",
    adminEnA:
      "admin-additional-charge-refund-processed/refund-d6-email-a/admin.en@juantzun.dev",
    guestEsB:
      "additional-charge-refund-processed/refund-d6-email-b/guest.es@juantzun.dev",
    adminEsB:
      "admin-additional-charge-refund-processed/refund-d6-email-b/admin.es@juantzun.dev",
    adminEnB:
      "admin-additional-charge-refund-processed/refund-d6-email-b/admin.en@juantzun.dev",
  } as const;
  const retryInputs = [
    {
      id: "notification-d6-refund-a-guest-es-retry",
      type: EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "guest.es@juantzun.dev",
      deduplicationKey: refundRetryKeys.guestEsA,
      locale: "es" as const,
      refundId: "refund-d6-email-a",
    },
    {
      id: "notification-d6-refund-a-admin-es-retry",
      type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "admin.es@juantzun.dev",
      deduplicationKey: refundRetryKeys.adminEsA,
      locale: "es" as const,
      refundId: "refund-d6-email-a",
    },
    {
      id: "notification-d6-refund-a-admin-en-retry",
      type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "admin.en@juantzun.dev",
      deduplicationKey: refundRetryKeys.adminEnA,
      locale: "en" as const,
      refundId: "refund-d6-email-a",
    },
    {
      id: "notification-d6-refund-b-guest-es-retry",
      type: EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "guest.es@juantzun.dev",
      deduplicationKey: refundRetryKeys.guestEsB,
      locale: "es" as const,
      refundId: "refund-d6-email-b",
    },
    {
      id: "notification-d6-refund-b-admin-es-retry",
      type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "admin.es@juantzun.dev",
      deduplicationKey: refundRetryKeys.adminEsB,
      locale: "es" as const,
      refundId: "refund-d6-email-b",
    },
    {
      id: "notification-d6-refund-b-admin-en-retry",
      type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: "admin.en@juantzun.dev",
      deduplicationKey: refundRetryKeys.adminEnB,
      locale: "en" as const,
      refundId: "refund-d6-email-b",
    },
  ];
  retryInputs.forEach((input) => seedD6RetryNotification(store, input));
  installD6Prisma(store);

  try {
    const { payloads, providerCalls, summary } =
      await processD6EmailRetryWithProviderCounter();
    const payloadByKey = (
      key: (typeof refundRetryKeys)[keyof typeof refundRetryKeys],
    ) => {
      const payload = payloads.find(
        (candidate) => candidate.idempotencyKey === key,
      );
      assert.ok(
        payload,
        `Expected retry payload ${key}; sent ${payloads
          .map((candidate) => candidate.idempotencyKey)
          .join(", ")}`,
      );
      return payload;
    };
    const guestEsA = payloadByKey(refundRetryKeys.guestEsA);
    const adminEsA = payloadByKey(refundRetryKeys.adminEsA);
    const adminEnA = payloadByKey(refundRetryKeys.adminEnA);
    const guestEsB = payloadByKey(refundRetryKeys.guestEsB);
    const adminEsB = payloadByKey(refundRetryKeys.adminEsB);
    const adminEnB = payloadByKey(refundRetryKeys.adminEnB);
    const allPayloadContent = joinedPayloadContent(payloads);

    assert.equal(summary.candidates, 6);
    assert.equal(summary.claimed, 6);
    assert.equal(summary.attempted, 6);
    assert.equal(summary.sent, 6);
    assert.equal(providerCalls, 6);
    assert.equal(guestEsA.intendedRecipient, "guest.es@juantzun.dev");
    assert.equal(adminEsA.intendedRecipient, "admin.es@juantzun.dev");
    assert.match(guestEsA.text, /Total reembolsado:\s*[^\n]*30[.,]00/);
    assert.match(adminEsA.text, /Total reembolsado:\s*[^\n]*30[.,]00/);
    assert.match(
      adminEsA.text,
      /Reembolsado acumulado:\s*[^\n]*30[.,]00/,
    );
    assert.match(guestEsA.text, /Saldo restante:\s*[^\n]*70[.,]00/);
    assert.match(adminEsA.text, /Saldo restante:\s*[^\n]*70[.,]00/);
    assert.match(guestEsA.text, /Estado resultante:\s*Parcialmente reembolsado/);
    assert.match(adminEsA.text, /Estado resultante:\s*Parcialmente reembolsado/);
    assert.match(adminEsA.text, /Estado del pago:\s*Parcialmente reembolsado/);
    assert.match(adminEsA.text, /Modo de procesamiento:\s*Portal de Tilopay/);
    assert.match(adminEnA.text, /Payment status:\s*Partially refunded/);
    assert.match(adminEnA.text, /Processing mode:\s*Tilopay portal/);
    assert.match(guestEsB.text, /Estado resultante:\s*Reembolsado/);
    assert.match(adminEsB.text, /Estado del pago:\s*Reembolsado/);
    assert.match(adminEsB.text, /Modo de procesamiento:\s*API de Tilopay/);
    assert.match(adminEnB.text, /Payment status:\s*Refunded/);
    assert.match(adminEnB.text, /Processing mode:\s*Tilopay API/);
    assert.doesNotMatch(
      adminEsA.text,
      /Reembolsado acumulado:\s*[^\n]*100[.,]00/,
    );
    assert.doesNotMatch(adminEsA.text, /Estado del pago:\s*Reembolsado/);
    assert.doesNotMatch(
      allPayloadContent,
      /\b(?:PARTIALLY_REFUNDED|REFUNDED|TILOPAY_PORTAL_FALLBACK|TILOPAY_API)\b/,
    );
    assertNoRawToken(payloads);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior keeps delayed payment-approved retries on the original paid event", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    status: GuestPaymentRequestStatus.PAID,
  });
  const paidAt = new Date("2026-09-17T13:00:00.000Z");
  store.requests[0]!.paidAt = paidAt;
  store.charges[0]!.status = AdditionalChargeStatus.PARTIALLY_REFUNDED;
  store.charges[1]!.status = AdditionalChargeStatus.REFUNDED;
  store.payments.push({
    id: "payment-d6-approved-email",
    guestPaymentRequestId: D6_REQUEST_ID,
    purpose: PaymentPurpose.ADDITIONAL_CHARGE,
    status: PaymentStatus.REFUNDED,
    amount: money("30.00"),
    currency: "USD",
    providerReference: "TRP-D6-SAFE-PAYMENT",
    paidAt,
    createdAt: paidAt,
    updatedAt: new Date("2026-09-17T15:00:00.000Z"),
  });
  seedD6RetryNotification(store, {
    id: "notification-d6-approved-guest-retry",
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_APPROVED,
    recipient: "guest.final-d6@juantzun.dev",
    deduplicationKey:
      "additional-charge-payment-approved/request-final-d6/guest.final-d6@juantzun.dev",
  });
  seedD6RetryNotification(store, {
    id: "notification-d6-approved-admin-retry",
    type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED,
    recipient: "admin@juantzun.dev",
    deduplicationKey:
      "admin-additional-charge-payment-approved/request-final-d6/admin@juantzun.dev",
  });
  seedD6RetryNotification(store, {
    id: "notification-d6-approved-admin-en-retry",
    type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED,
    recipient: "admin.en@juantzun.dev",
    deduplicationKey:
      "admin-additional-charge-payment-approved/request-final-d6/admin.en@juantzun.dev",
    locale: "en",
  });
  installD6Prisma(store);

  try {
    const { payloads, providerCalls, summary } =
      await processD6EmailRetryWithProviderCounter();
    const guestPayload = payloads.find(
      (payload) => payload.audience === "guest",
    );
    const adminEsPayload = payloads.find(
      (payload) =>
        payload.idempotencyKey ===
        "admin-additional-charge-payment-approved/request-final-d6/admin@juantzun.dev",
    );
    const adminEnPayload = payloads.find(
      (payload) =>
        payload.idempotencyKey ===
        "admin-additional-charge-payment-approved/request-final-d6/admin.en@juantzun.dev",
    );
    const allPayloadContent = joinedPayloadContent(payloads);

    assert.equal(summary.candidates, 3);
    assert.equal(summary.claimed, 3);
    assert.equal(summary.attempted, 3);
    assert.equal(summary.sent, 3);
    assert.equal(providerCalls, 3);
    assert.ok(guestPayload);
    assert.ok(adminEsPayload);
    assert.ok(adminEnPayload);
    assert.match(adminEsPayload.text, /Estado del pago:\s*Aprobado/);
    assert.match(adminEsPayload.text, /\(Pagado\)/);
    assert.match(adminEnPayload.text, /Payment status:\s*Approved/);
    assert.match(adminEnPayload.text, /\(Paid\)/);
    assert.doesNotMatch(
      allPayloadContent,
      /Estado del cargo:\s*(?:Reembolsado|Parcialmente reembolsado)/,
    );
    assert.doesNotMatch(
      allPayloadContent,
      /\((?:Reembolsado|Parcialmente reembolsado)\)/,
    );
    assert.doesNotMatch(
      allPayloadContent,
      /Estado del pago:\s*(?:Reembolsado|Parcialmente reembolsado)/,
    );
    assert.doesNotMatch(
      allPayloadContent,
      /\b(?:PAID|APPROVED|REFUNDED|PARTIALLY_REFUNDED)\b/,
    );
    assertNoRawToken(payloads);
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

test("D.6 behavior persists overdue manual-resend expiry while rejecting the resend", async () => {
  const restoreEnv = preserveD6Env();
  enableD6EmailEnv();
  const store = d6Store();
  seedD6PaymentRequest(store, {
    expiresAt: new Date("2026-09-16T12:00:00.000Z"),
    withItems: false,
  });
  seedD6SourceNotification(store);
  installD6Prisma(store);

  try {
    await withFetchCallCounter(async (providerCalls) => {
      await assertD6ResendRejected(
        d6ManualResendInput("00000000-0000-4000-8000-000000000d63"),
      );

      assert.equal(
        store.requests[0]?.status,
        GuestPaymentRequestStatus.EXPIRED,
      );
      assert.equal(
        store.notifications.filter(
          (notification) =>
            notification.parentNotificationId === D6_NOTIFICATION_ID,
        ).length,
        0,
      );
      assert.equal(providerCalls(), 0);
      assertNoRawToken(store);
    });
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior allows manual resend for a historically confirmed cancelled reservation", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  store.reservation.status = ReservationStatus.CANCELLED;
  store.reservation.cancelledAt = new Date("2026-09-15T12:00:00.000Z");
  seedD6PaymentRequest(store);
  seedD6SourceNotification(store);
  installD6Prisma(store);
  const encryptedToken = store.requests[0]?.accessTokenEncrypted;

  try {
    const result = await requestAdminEmailNotificationResend(
      d6ManualResendInput("00000000-0000-4000-8000-000000000d64"),
      { email: "admin@juantzun.dev", name: "Admin Final D6" },
    );
    const children = store.notifications.filter(
      (notification) => notification.parentNotificationId === D6_NOTIFICATION_ID,
    );

    assert.equal(result.created, true);
    assert.equal(children.length, 1);
    assert.equal(children[0]?.guestPaymentRequestId, D6_REQUEST_ID);
    assert.equal(store.requests[0]?.accessTokenEncrypted, encryptedToken);
    assert.equal(
      store.requests[0]?.accessTokenHash,
      hashGuestPaymentRequestAccessToken(D6_TOKEN),
    );
    assertNoRawToken(store);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior rejects manual resend for terminal guest payment request states", async () => {
  const terminalStatuses = [
    GuestPaymentRequestStatus.PAID,
    GuestPaymentRequestStatus.CANCELLED,
    GuestPaymentRequestStatus.EXPIRED,
  ] as const;

  for (const status of terminalStatuses) {
    const restoreEnv = preserveD6Env();
    enableD6EmailEnv();
    const store = d6Store();
    seedD6PaymentRequest(store, { status, withItems: false });
    seedD6SourceNotification(store);
    installD6Prisma(store);

    try {
      await withFetchCallCounter(async (providerCalls) => {
        await assertD6ResendRejected(
          d6ManualResendInput(
            `00000000-0000-4000-8000-000000000${status.toLowerCase().slice(0, 3)}`,
          ),
        );

        assert.equal(store.requests[0]?.status, status);
        assert.equal(
          store.notifications.filter(
            (notification) =>
              notification.parentNotificationId === D6_NOTIFICATION_ID,
          ).length,
          0,
        );
        assert.equal(providerCalls(), 0);
        assertNoRawToken(store);
      });
    } finally {
      restoreEnv();
    }
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

test("D.6 behavior exposes ancillary refund history with charge relations and allocation details", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PAID,
    totalAmount: money("30.00"),
    currency: "USD",
    accessTokenHash: hashGuestPaymentRequestAccessToken(D6_TOKEN),
    accessTokenEncrypted: "encrypted-only",
    expiresAt: new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-refund-history",
    paidAt: new Date("2026-09-17T13:00:00.000Z"),
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.charges[0]!.status = AdditionalChargeStatus.PARTIALLY_REFUNDED;
  const client = prisma as unknown as {
    refund: { findMany: () => Promise<unknown[]> };
    payment: { findMany: () => Promise<unknown[]> };
  };
  client.payment.findMany = async () => [];
  client.refund.findMany = async () => [
    {
      id: "refund-d6-history",
      paymentId: "payment-d6-history",
      lifecycleRequestId: null,
      authorizationType: "ADDITIONAL_CHARGE",
      refundOperationKey: null,
      status: RefundStatus.APPROVED,
      amount: money("7.50"),
      currency: "USD",
      processingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "safe-refund-reference",
      processingStartedAt: null,
      approvedAt: new Date("2026-09-17T14:00:00.000Z"),
      failedAt: null,
      failureCode: null,
      createdAt: new Date("2026-09-17T13:30:00.000Z"),
      updatedAt: new Date("2026-09-17T14:00:00.000Z"),
      requestedByAdmin: {
        name: "Admin Final D6",
        email: "admin@juantzun.dev",
      },
      payment: {
        guestPaymentRequestId: D6_REQUEST_ID,
      },
      additionalChargeAllocations: [
        {
          additionalChargeId: "charge-d6-1",
          allocatedAmount: money("7.50"),
          additionalCharge: {
            amount: money("12.50"),
            category: "TRANSPORT",
            description: "Airport pickup",
            refundAllocations: [
              {
                allocatedAmount: money("7.50"),
                refund: {
                  id: "refund-d6-history",
                  status: RefundStatus.APPROVED,
                  approvedAt: new Date("2026-09-17T14:00:00.000Z"),
                  createdAt: new Date("2026-09-17T13:30:00.000Z"),
                  updatedAt: new Date("2026-09-17T14:00:00.000Z"),
                },
              },
            ],
          },
        },
      ],
    },
  ];

  try {
    const history = await getAdminReservationOperationalHistory(D6_RESERVATION_ID);
    const refundApproved = history.find(
      (event) => event.eventType === "REFUND_APPROVED",
    );

    assert.ok(refundApproved);
    assert.equal(refundApproved.amount, "7.50");
    assert.ok(
      refundApproved.relations.some(
        (relation) =>
          relation.kind === "GUEST_PAYMENT_REQUEST" &&
          relation.id === D6_REQUEST_ID,
      ),
    );
    assert.ok(
      refundApproved.relations.some(
        (relation) =>
          relation.kind === "ADDITIONAL_CHARGE" &&
          relation.id === "charge-d6-1",
      ),
    );
    assert.deepEqual(refundApproved.additionalChargeAllocations, [
      {
        additionalChargeId: "charge-d6-1",
        category: "TRANSPORT",
        description: "Airport pickup",
        allocatedAmount: "7.50",
        currency: "USD",
        resultingStatus: AdditionalChargeStatus.PARTIALLY_REFUNDED,
      },
    ]);
    assertNoRawToken(history);
  } finally {
    restoreEnv();
  }
});

test("D.6 behavior keeps ancillary refund allocation statuses historically stable", async () => {
  const restoreEnv = preserveD6Env();
  const store = d6Store();
  installD6Prisma(store);
  store.requests.push({
    id: D6_REQUEST_ID,
    reservationId: D6_RESERVATION_ID,
    status: GuestPaymentRequestStatus.PAID,
    totalAmount: money("100.00"),
    currency: "USD",
    accessTokenHash: hashGuestPaymentRequestAccessToken(D6_TOKEN),
    accessTokenEncrypted: "encrypted-only",
    expiresAt: new Date("2026-09-24T12:00:00.000Z"),
    createdByAdminId: "admin-final-d6",
    clientRequestId: "client-d6-refund-history-stability",
    paidAt: new Date("2026-09-17T13:00:00.000Z"),
    cancelledAt: null,
    createdAt: D6_BASE_NOW,
    updatedAt: D6_BASE_NOW,
  });
  store.charges[0]!.amount = money("100.00");
  store.charges[0]!.status = AdditionalChargeStatus.REFUNDED;
  const completedAllocations = [
    {
      allocatedAmount: money("30.00"),
      refund: {
        id: "refund-d6-history-a",
        status: RefundStatus.APPROVED,
        approvedAt: new Date("2026-09-17T14:00:00.000Z"),
        createdAt: new Date("2026-09-17T13:30:00.000Z"),
        updatedAt: new Date("2026-09-17T14:00:00.000Z"),
      },
    },
    {
      allocatedAmount: money("70.00"),
      refund: {
        id: "refund-d6-history-b",
        status: RefundStatus.APPROVED,
        approvedAt: new Date("2026-09-17T15:00:00.000Z"),
        createdAt: new Date("2026-09-17T14:30:00.000Z"),
        updatedAt: new Date("2026-09-17T15:00:00.000Z"),
      },
    },
  ];
  const allocationCharge = {
    amount: money("100.00"),
    category: "TRANSPORT",
    description: "Airport pickup",
    refundAllocations: completedAllocations,
  };
  const client = prisma as unknown as {
    refund: { findMany: () => Promise<unknown[]> };
    payment: { findMany: () => Promise<unknown[]> };
  };
  client.payment.findMany = async () => [];
  client.refund.findMany = async () => [
    {
      id: "refund-d6-history-a",
      paymentId: "payment-d6-history",
      lifecycleRequestId: null,
      authorizationType: "ADDITIONAL_CHARGE",
      refundOperationKey: null,
      status: RefundStatus.APPROVED,
      amount: money("30.00"),
      currency: "USD",
      processingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "safe-refund-a",
      processingStartedAt: null,
      approvedAt: new Date("2026-09-17T14:00:00.000Z"),
      failedAt: null,
      failureCode: null,
      createdAt: new Date("2026-09-17T13:30:00.000Z"),
      updatedAt: new Date("2026-09-17T14:00:00.000Z"),
      requestedByAdmin: {
        name: "Admin Final D6",
        email: "admin@juantzun.dev",
      },
      payment: {
        guestPaymentRequestId: D6_REQUEST_ID,
      },
      additionalChargeAllocations: [
        {
          additionalChargeId: "charge-d6-1",
          allocatedAmount: money("30.00"),
          additionalCharge: allocationCharge,
        },
      ],
    },
    {
      id: "refund-d6-history-b",
      paymentId: "payment-d6-history",
      lifecycleRequestId: null,
      authorizationType: "ADDITIONAL_CHARGE",
      refundOperationKey: null,
      status: RefundStatus.APPROVED,
      amount: money("70.00"),
      currency: "USD",
      processingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "safe-refund-b",
      processingStartedAt: null,
      approvedAt: new Date("2026-09-17T15:00:00.000Z"),
      failedAt: null,
      failureCode: null,
      createdAt: new Date("2026-09-17T14:30:00.000Z"),
      updatedAt: new Date("2026-09-17T15:00:00.000Z"),
      requestedByAdmin: {
        name: "Admin Final D6",
        email: "admin@juantzun.dev",
      },
      payment: {
        guestPaymentRequestId: D6_REQUEST_ID,
      },
      additionalChargeAllocations: [
        {
          additionalChargeId: "charge-d6-1",
          allocatedAmount: money("70.00"),
          additionalCharge: allocationCharge,
        },
      ],
    },
    {
      id: "refund-d6-history-authorized",
      paymentId: "payment-d6-history",
      lifecycleRequestId: null,
      authorizationType: "ADDITIONAL_CHARGE",
      refundOperationKey: null,
      status: RefundStatus.PENDING,
      amount: money("10.00"),
      currency: "USD",
      processingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: null,
      processingStartedAt: null,
      approvedAt: null,
      failedAt: null,
      failureCode: null,
      createdAt: new Date("2026-09-17T15:30:00.000Z"),
      updatedAt: new Date("2026-09-17T15:30:00.000Z"),
      requestedByAdmin: {
        name: "Admin Final D6",
        email: "admin@juantzun.dev",
      },
      payment: {
        guestPaymentRequestId: D6_REQUEST_ID,
      },
      additionalChargeAllocations: [
        {
          additionalChargeId: "charge-d6-1",
          allocatedAmount: money("10.00"),
          additionalCharge: allocationCharge,
        },
      ],
    },
  ];

  try {
    const history = await getAdminReservationOperationalHistory(D6_RESERVATION_ID);
    const refundA = history.find(
      (event) => event.id === "refund/refund-d6-history-a/approved",
    );
    const refundB = history.find(
      (event) => event.id === "refund/refund-d6-history-b/approved",
    );
    const authorized = history.find(
      (event) =>
        event.id === "refund/refund-d6-history-authorized/authorized",
    );

    assert.ok(refundA);
    assert.ok(refundB);
    assert.ok(authorized);
    assert.deepEqual(refundA.additionalChargeAllocations, [
      {
        additionalChargeId: "charge-d6-1",
        category: "TRANSPORT",
        description: "Airport pickup",
        allocatedAmount: "30.00",
        currency: "USD",
        resultingStatus: AdditionalChargeStatus.PARTIALLY_REFUNDED,
      },
    ]);
    assert.deepEqual(refundB.additionalChargeAllocations, [
      {
        additionalChargeId: "charge-d6-1",
        category: "TRANSPORT",
        description: "Airport pickup",
        allocatedAmount: "70.00",
        currency: "USD",
        resultingStatus: AdditionalChargeStatus.REFUNDED,
      },
    ]);
    assert.deepEqual(authorized.additionalChargeAllocations, [
      {
        additionalChargeId: "charge-d6-1",
        category: "TRANSPORT",
        description: "Airport pickup",
        allocatedAmount: "10.00",
        currency: "USD",
        resultingStatus: null,
      },
    ]);
    assertNoRawToken(history);
  } finally {
    restoreEnv();
  }
});
