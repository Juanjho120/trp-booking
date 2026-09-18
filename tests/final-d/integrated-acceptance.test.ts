import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  GuestPaymentRequestStatus,
  Prisma,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

import {
  AdminAdditionalChargeError,
  cancelAdminAdditionalCharge,
  createAdminAdditionalCharge,
  createAdminGuestPaymentRequest,
  updateAdminAdditionalCharge,
} from "@/lib/admin/additional-charges";
import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { test } from "./harness";

const D7_NOW = new Date("2026-09-18T12:00:00.000Z");
const D7_ACTOR: AdminActor = {
  id: "actor-final-d7",
  email: "admin.final-d7@juantzun.dev",
  name: "Final D7 Admin",
};

type D7User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type D7Reservation = {
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  guestEmail: string;
  preferredLocale: string;
  currency: string;
  updatedAt: Date;
};

type D7Charge = {
  id: string;
  reservationId: string;
  category: AdditionalChargeCategory;
  description: string;
  internalNote: string | null;
  amount: Prisma.Decimal;
  currency: string;
  status: AdditionalChargeStatus;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByAdminId: string;
};

type D7Request = {
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
};

type D7RequestItem = {
  id: string;
  paymentRequestId: string;
  additionalChargeId: string;
  categorySnapshot: AdditionalChargeCategory;
  descriptionSnapshot: string;
  amountSnapshot: Prisma.Decimal;
  currencySnapshot: string;
  createdAt: Date;
};

type D7Notification = {
  id: string;
  reservationId: string;
  guestPaymentRequestId: string | null;
  refundId: string | null;
  type: EmailNotificationType;
  recipient: string;
  locale: "es" | "en";
  deduplicationKey: string;
  origin: EmailNotificationOrigin;
  parentNotificationId: string | null;
  requestedByAdminId: string | null;
  requestedAt: Date | null;
  status: EmailNotificationStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type D7AuditLog = {
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.InputJsonValue | null;
};

type D7State = {
  users: D7User[];
  reservations: D7Reservation[];
  charges: D7Charge[];
  requests: D7Request[];
  requestItems: D7RequestItem[];
  notifications: D7Notification[];
  auditLogs: D7AuditLog[];
  nextChargeSequence: number;
  nextRequestSequence: number;
  nextItemSequence: number;
  nextNotificationSequence: number;
};

type D7Store = {
  current: D7State;
};

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

function cloneState(state: D7State): D7State {
  return {
    users: state.users.map((user) => ({ ...user })),
    reservations: state.reservations.map((reservation) => ({
      ...reservation,
      confirmedAt: cloneDate(reservation.confirmedAt),
      updatedAt: new Date(reservation.updatedAt.getTime()),
    })),
    charges: state.charges.map((charge) => ({
      ...charge,
      amount: money(charge.amount.toFixed(2)),
      cancelledAt: cloneDate(charge.cancelledAt),
      createdAt: new Date(charge.createdAt.getTime()),
      updatedAt: new Date(charge.updatedAt.getTime()),
    })),
    requests: state.requests.map((request) => ({
      ...request,
      totalAmount: money(request.totalAmount.toFixed(2)),
      expiresAt: new Date(request.expiresAt.getTime()),
      paidAt: cloneDate(request.paidAt),
      cancelledAt: cloneDate(request.cancelledAt),
      createdAt: new Date(request.createdAt.getTime()),
      updatedAt: new Date(request.updatedAt.getTime()),
    })),
    requestItems: state.requestItems.map((item) => ({
      ...item,
      amountSnapshot: money(item.amountSnapshot.toFixed(2)),
      createdAt: new Date(item.createdAt.getTime()),
    })),
    notifications: state.notifications.map((notification) => ({
      ...notification,
      requestedAt: cloneDate(notification.requestedAt),
      lastAttemptAt: cloneDate(notification.lastAttemptAt),
      nextAttemptAt: cloneDate(notification.nextAttemptAt),
      sentAt: cloneDate(notification.sentAt),
      createdAt: new Date(notification.createdAt.getTime()),
      updatedAt: new Date(notification.updatedAt.getTime()),
    })),
    auditLogs: JSON.parse(JSON.stringify(state.auditLogs)) as D7AuditLog[],
    nextChargeSequence: state.nextChargeSequence,
    nextRequestSequence: state.nextRequestSequence,
    nextItemSequence: state.nextItemSequence,
    nextNotificationSequence: state.nextNotificationSequence,
  };
}

function baseStore(): D7Store {
  return {
    current: {
      users: [
        {
          id: "admin-final-d7",
          email: D7_ACTOR.email,
          name: D7_ACTOR.name,
          role: UserRole.ADMIN,
        },
      ],
      reservations: [
        {
          id: "reservation-confirmed-d7",
          status: ReservationStatus.CONFIRMED,
          confirmedAt: new Date("2026-09-01T12:00:00.000Z"),
          guestEmail: "guest.final-d7@juantzun.dev",
          preferredLocale: "es",
          currency: "USD",
          updatedAt: new Date("2026-09-18T10:00:00.000Z"),
        },
        {
          id: "reservation-cancelled-d7",
          status: ReservationStatus.CANCELLED,
          confirmedAt: new Date("2026-09-02T12:00:00.000Z"),
          guestEmail: "cancelled.final-d7@juantzun.dev",
          preferredLocale: "en",
          currency: "USD",
          updatedAt: new Date("2026-09-18T10:05:00.000Z"),
        },
        {
          id: "reservation-never-confirmed-d7",
          status: ReservationStatus.PENDING_PAYMENT,
          confirmedAt: null,
          guestEmail: "hold.final-d7@juantzun.dev",
          preferredLocale: "es",
          currency: "USD",
          updatedAt: new Date("2026-09-18T10:10:00.000Z"),
        },
      ],
      charges: [],
      requests: [],
      requestItems: [],
      notifications: [],
      auditLogs: [],
      nextChargeSequence: 1,
      nextRequestSequence: 1,
      nextItemSequence: 1,
      nextNotificationSequence: 1,
    },
  };
}

function adminFor(store: D7Store, adminId: string): D7User {
  return (
    store.current.users.find((user) => user.id === adminId) ??
    store.current.users[0]!
  );
}

function requestItemsFor(store: D7Store, requestId: string) {
  return store.current.requestItems
    .filter((item) => item.paymentRequestId === requestId)
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
}

function paymentRequestItemsForCharge(store: D7Store, chargeId: string) {
  return store.current.requestItems
    .filter((item) => item.additionalChargeId === chargeId)
    .map((item) => {
      const request = store.current.requests.find(
        (candidate) => candidate.id === item.paymentRequestId,
      );
      assert.ok(request);

      return {
        amountSnapshot: item.amountSnapshot,
        currencySnapshot: item.currencySnapshot,
        paymentRequest: {
          id: request.id,
          status: request.status,
          expiresAt: request.expiresAt,
          payment: null,
        },
      };
    });
}

function enrichCharge(store: D7Store, charge: D7Charge) {
  const admin = adminFor(store, charge.createdByAdminId);

  return {
    ...charge,
    createdByAdmin: {
      name: admin.name,
      email: admin.email,
    },
    paymentRequestItems: paymentRequestItemsForCharge(store, charge.id),
    refundAllocations: [],
  };
}

function enrichRequest(store: D7Store, request: D7Request) {
  const admin = adminFor(store, request.createdByAdminId);

  return {
    ...request,
    createdByAdmin: {
      name: admin.name,
      email: admin.email,
    },
    items: requestItemsFor(store, request.id),
    payment: null,
    emailNotifications: store.current.notifications
      .filter(
        (notification) =>
          notification.guestPaymentRequestId === request.id &&
          notification.type === EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
      )
      .map((notification) => ({
        ...notification,
        manualResends: [],
        requestedByAdmin: notification.requestedByAdminId
          ? adminFor(store, notification.requestedByAdminId)
          : null,
      })),
  };
}

function sameInstant(first: Date, second: Date): boolean {
  return first.getTime() === second.getTime();
}

function installD7Prisma(store: D7Store): void {
  const client = {
    async $transaction<T>(
      operation: (transaction: typeof client) => Promise<T>,
    ): Promise<T> {
      const before = cloneState(store.current);

      try {
        return await operation(client);
      } catch (error) {
        store.current = before;
        throw error;
      }
    },
    user: {
      async upsert(args: {
        where: { email: string };
        create: { email: string; name: string | null; role: UserRole };
        update: { name?: string; role: UserRole };
      }) {
        let user = store.current.users.find(
          (candidate) => candidate.email === args.where.email,
        );

        if (!user) {
          user = {
            id: `user-d7-${store.current.users.length + 1}`,
            email: args.create.email,
            name: args.create.name,
            role: args.create.role,
          };
          store.current.users.push(user);
        } else {
          user.name = args.update.name ?? user.name;
          user.role = args.update.role;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    },
    reservation: {
      async findUnique(args: { where?: { id?: string } }) {
        return (
          store.current.reservations.find(
            (reservation) => reservation.id === args.where?.id,
          ) ?? null
        );
      },
      async updateMany(args: {
        where: {
          id?: string;
          status?: ReservationStatus;
          confirmedAt?: { not?: null };
          currency?: string;
          updatedAt?: Date;
        };
      }) {
        const reservation = store.current.reservations.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (
          !reservation ||
          (args.where.status && reservation.status !== args.where.status) ||
          (args.where.confirmedAt?.not === null &&
            reservation.confirmedAt === null) ||
          (args.where.currency && reservation.currency !== args.where.currency) ||
          (args.where.updatedAt &&
            !sameInstant(reservation.updatedAt, args.where.updatedAt))
        ) {
          return { count: 0 };
        }

        return { count: 1 };
      },
    },
    additionalCharge: {
      async create(args: { data: Record<string, unknown> }) {
        const now = new Date(D7_NOW.getTime() + store.current.nextChargeSequence);
        const charge: D7Charge = {
          id: `charge-d7-${store.current.nextChargeSequence}`,
          reservationId: String(args.data.reservationId),
          category: args.data.category as AdditionalChargeCategory,
          description: String(args.data.description),
          internalNote:
            typeof args.data.internalNote === "string"
              ? args.data.internalNote
              : null,
          amount: args.data.amount as Prisma.Decimal,
          currency: String(args.data.currency),
          status: args.data.status as AdditionalChargeStatus,
          cancelledAt: null,
          createdAt: now,
          updatedAt: now,
          createdByAdminId: String(args.data.createdByAdminId),
        };

        store.current.nextChargeSequence += 1;
        store.current.charges.push(charge);

        return enrichCharge(store, charge);
      },
      async findUnique(args: { where: { id?: string } }) {
        const charge = store.current.charges.find(
          (candidate) => candidate.id === args.where.id,
        );

        return charge ? enrichCharge(store, charge) : null;
      },
      async findMany(args: {
        where: { id?: { in?: readonly string[] }; reservationId?: string };
      }) {
        const ids = args.where.id?.in ?? [];

        return store.current.charges
          .filter(
            (charge) =>
              (!args.where.reservationId ||
                charge.reservationId === args.where.reservationId) &&
              (ids.length === 0 || ids.includes(charge.id)),
          )
          .map((charge) => enrichCharge(store, charge));
      },
      async updateMany(args: {
        where: {
          id?: string;
          reservationId?: string;
          status?: AdditionalChargeStatus;
          currency?: string;
          updatedAt?: Date;
        };
        data: Record<string, unknown>;
      }) {
        let count = 0;

        for (const charge of store.current.charges) {
          if (args.where.id && charge.id !== args.where.id) continue;
          if (
            args.where.reservationId &&
            charge.reservationId !== args.where.reservationId
          ) {
            continue;
          }
          if (args.where.status && charge.status !== args.where.status) continue;
          if (args.where.currency && charge.currency !== args.where.currency) {
            continue;
          }
          if (
            args.where.updatedAt &&
            !sameInstant(charge.updatedAt, args.where.updatedAt)
          ) {
            continue;
          }

          if (args.data.category) {
            charge.category = args.data.category as AdditionalChargeCategory;
          }
          if (typeof args.data.description === "string") {
            charge.description = args.data.description;
          }
          if (
            typeof args.data.internalNote === "string" ||
            args.data.internalNote === null
          ) {
            charge.internalNote = args.data.internalNote as string | null;
          }
          if (args.data.amount instanceof Prisma.Decimal) {
            charge.amount = args.data.amount;
          }
          if (args.data.status) {
            charge.status = args.data.status as AdditionalChargeStatus;
          }
          if (args.data.cancelledAt instanceof Date) {
            charge.cancelledAt = args.data.cancelledAt;
          }

          count += 1;
        }

        return { count };
      },
    },
    guestPaymentRequestItem: {
      async findFirst(args: {
        where: {
          additionalChargeId:
            | string
            | { in?: readonly string[] };
          paymentRequest: {
            status: GuestPaymentRequestStatus;
            expiresAt: { gt?: Date };
          };
        };
      }) {
        const ids =
          typeof args.where.additionalChargeId === "string"
            ? [args.where.additionalChargeId]
            : args.where.additionalChargeId.in ?? [];
        const item = store.current.requestItems.find((candidate) => {
          if (!ids.includes(candidate.additionalChargeId)) return false;
          const request = store.current.requests.find(
            (paymentRequest) => paymentRequest.id === candidate.paymentRequestId,
          );

          return (
            request?.status === args.where.paymentRequest.status &&
            (!args.where.paymentRequest.expiresAt.gt ||
              request.expiresAt > args.where.paymentRequest.expiresAt.gt)
          );
        });

        return item
          ? {
              paymentRequestId: item.paymentRequestId,
              additionalChargeId: item.additionalChargeId,
            }
          : null;
      },
    },
    guestPaymentRequest: {
      async findUnique(args: { where: { id?: string; clientRequestId?: string } }) {
        const request = args.where.clientRequestId
          ? store.current.requests.find(
              (candidate) => candidate.clientRequestId === args.where.clientRequestId,
            )
          : store.current.requests.find(
              (candidate) => candidate.id === args.where.id,
            );

        return request ? enrichRequest(store, request) : null;
      },
      async create(args: { data: Record<string, unknown> }) {
        const request: D7Request = {
          id: `request-d7-${store.current.nextRequestSequence}`,
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
        const nestedItems = args.data.items as {
          create: Array<Record<string, unknown>>;
        };

        store.current.nextRequestSequence += 1;
        store.current.requests.push(request);
        for (const itemInput of nestedItems.create) {
          store.current.requestItems.push({
            id: `item-d7-${store.current.nextItemSequence}`,
            paymentRequestId: request.id,
            additionalChargeId: String(itemInput.additionalChargeId),
            categorySnapshot: itemInput.categorySnapshot as AdditionalChargeCategory,
            descriptionSnapshot: String(itemInput.descriptionSnapshot),
            amountSnapshot: itemInput.amountSnapshot as Prisma.Decimal,
            currencySnapshot: String(itemInput.currencySnapshot),
            createdAt: new Date(
              request.createdAt.getTime() + store.current.nextItemSequence,
            ),
          });
          store.current.nextItemSequence += 1;
        }

        return enrichRequest(store, request);
      },
      async updateMany(args: {
        where: {
          id?: string;
          reservationId?: string;
          status?: GuestPaymentRequestStatus;
          expiresAt?: { lte?: Date; gt?: Date };
          payment?: { is?: null };
          updatedAt?: Date;
        };
        data: Record<string, unknown>;
      }) {
        let count = 0;

        for (const request of store.current.requests) {
          if (args.where.id && request.id !== args.where.id) continue;
          if (
            args.where.reservationId &&
            request.reservationId !== args.where.reservationId
          ) {
            continue;
          }
          if (args.where.status && request.status !== args.where.status) continue;
          if (
            args.where.expiresAt?.lte &&
            request.expiresAt > args.where.expiresAt.lte
          ) {
            continue;
          }
          if (
            args.where.expiresAt?.gt &&
            request.expiresAt <= args.where.expiresAt.gt
          ) {
            continue;
          }
          if (
            args.where.updatedAt &&
            !sameInstant(request.updatedAt, args.where.updatedAt)
          ) {
            continue;
          }

          if (args.data.status) {
            request.status = args.data.status as GuestPaymentRequestStatus;
          }
          if (args.data.cancelledAt instanceof Date) {
            request.cancelledAt = args.data.cancelledAt;
          }

          count += 1;
        }

        return { count };
      },
    },
    emailNotification: {
      async findUnique(args: { where: { deduplicationKey?: string; id?: string } }) {
        return (
          store.current.notifications.find(
            (notification) =>
              (args.where.deduplicationKey &&
                notification.deduplicationKey === args.where.deduplicationKey) ||
              (args.where.id && notification.id === args.where.id),
          ) ?? null
        );
      },
      async create(args: { data: Record<string, unknown> }) {
        const notification: D7Notification = {
          id: `notification-d7-${store.current.nextNotificationSequence}`,
          reservationId: String(args.data.reservationId),
          guestPaymentRequestId:
            typeof args.data.guestPaymentRequestId === "string"
              ? args.data.guestPaymentRequestId
              : null,
          refundId: typeof args.data.refundId === "string" ? args.data.refundId : null,
          type: args.data.type as EmailNotificationType,
          recipient: String(args.data.recipient),
          locale: args.data.locale === "en" ? "en" : "es",
          deduplicationKey: String(args.data.deduplicationKey),
          origin: args.data.origin as EmailNotificationOrigin,
          parentNotificationId: null,
          requestedByAdminId: null,
          requestedAt: null,
          status: args.data.status as EmailNotificationStatus,
          attemptCount: 0,
          lastAttemptAt: null,
          nextAttemptAt: null,
          sentAt: null,
          errorCode: null,
          createdAt: D7_NOW,
          updatedAt: D7_NOW,
        };

        store.current.nextNotificationSequence += 1;
        store.current.notifications.push(notification);

        return notification;
      },
    },
    adminAuditLog: {
      async create(args: { data: D7AuditLog & { userId?: string } }) {
        store.current.auditLogs.push({
          action: args.data.action,
          entityType: args.data.entityType,
          entityId: args.data.entityId ?? null,
          metadata: args.data.metadata,
        });

        return store.current.auditLogs.at(-1);
      },
    },
  };

  Object.assign(prisma as unknown as typeof client, client);
}

function preserveD7Env(): () => void {
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
    "EMAIL_ADMIN_RECIPIENTS",
    "EMAIL_ADMIN_LOCALE",
    "EMAIL_TEST_RECIPIENT",
    "VERCEL_ENV",
  ] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  process.env.TRP_ENVIRONMENT = "local";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.DIRECT_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.AUTH_SECRET = "final-d7-test-auth-secret-at-least-32-chars";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.AUTH_GOOGLE_ID = "final-d7-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-d7-google-secret";
  process.env.AUTH_ALLOWED_ADMIN_EMAILS = "admin.final-d7@juantzun.dev";
  process.env.EXTERNAL_CALENDAR_ENCRYPTION_KEY =
    Buffer.alloc(32, 7).toString("base64");
  process.env.CLOUDINARY_CLOUD_NAME = "trpbookingtest";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "final-d7-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-d7";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-d7-api-key";
  process.env.TILOPAY_API_USER = "final-d7-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-d7-api-password";
  process.env.TILOPAY_REDIRECT_URL =
    "http://localhost:3000/api/payments/tilopay/redirect";
  process.env.TILOPAY_SUCCESS_URL =
    "http://localhost:3000/reservas/pago/exitoso";
  process.env.TILOPAY_CANCEL_URL =
    "http://localhost:3000/reservas/pago/cancelado";
  process.env.TILOPAY_ERROR_URL = "http://localhost:3000/reservas/pago/error";
  process.env.TILOPAY_WEBHOOK_URL =
    "http://localhost:3000/api/payments/tilopay/webhook";
  process.env.EMAIL_DELIVERY_MODE = "disabled";
  process.env.EMAIL_ADMIN_RECIPIENTS = "admin.final-d7@juantzun.dev";
  process.env.EMAIL_ADMIN_LOCALE = "es";
  process.env.EMAIL_TEST_RECIPIENT = "deliveries.final-d7@juantzun.dev";
  process.env.VERCEL_ENV = "development";

  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function assertAdminError(
  operation: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) =>
      error instanceof AdminAdditionalChargeError && error.code === code,
  );
}

test("D.7 integrated charge domain enforces eligibility, validation, and mutation boundaries", async () => {
  const restoreEnv = preserveD7Env();
  const store = baseStore();
  installD7Prisma(store);

  try {
    const created = await createAdminAdditionalCharge(
      {
        reservationId: "reservation-confirmed-d7",
        category: AdditionalChargeCategory.TRANSPORT,
        description: "Airport transfer",
        internalNote: "driver-only-note",
        amount: "45.25",
      },
      D7_ACTOR,
    );

    assert.equal(created.status, AdditionalChargeStatus.PENDING);
    assert.equal(created.amount, "45.25");
    assert.equal(created.currency, "USD");
    assert.equal(created.canEdit, true);
    assert.equal(created.canCancel, true);

    const updated = await updateAdminAdditionalCharge(
      {
        chargeId: created.id,
        category: AdditionalChargeCategory.EXTRA_SERVICE,
        description: "Private dinner setup",
        internalNote: null,
        amount: "55.00",
        expectedUpdatedAt: created.updatedAt,
      },
      D7_ACTOR,
    );

    assert.equal(updated.category, AdditionalChargeCategory.EXTRA_SERVICE);
    assert.equal(updated.description, "Private dinner setup");
    assert.equal(updated.internalNote, null);
    assert.equal(updated.amount, "55.00");

    const cancelled = await cancelAdminAdditionalCharge(
      { chargeId: created.id, expectedUpdatedAt: updated.updatedAt },
      D7_ACTOR,
    );

    assert.equal(cancelled.status, AdditionalChargeStatus.CANCELLED);
    assert.equal(cancelled.cancelledAt !== null, true);

    const cancelledReservationCharge = await createAdminAdditionalCharge(
      {
        reservationId: "reservation-cancelled-d7",
        category: AdditionalChargeCategory.DAMAGE,
        description: "Broken lamp",
        amount: "20.00",
      },
      D7_ACTOR,
    );

    assert.equal(cancelledReservationCharge.reservationId, "reservation-cancelled-d7");

    await assertAdminError(
      () =>
        createAdminAdditionalCharge(
          {
            reservationId: "reservation-never-confirmed-d7",
            category: AdditionalChargeCategory.CLEANING,
            description: "Extra cleaning",
            amount: "10.00",
          },
          D7_ACTOR,
        ),
      "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_ELIGIBLE",
    );
    await assertAdminError(
      () =>
        createAdminAdditionalCharge(
          {
            reservationId: "reservation-confirmed-d7",
            category: AdditionalChargeCategory.CLEANING,
            description: "Invalid amount",
            amount: "0.00",
          },
          D7_ACTOR,
        ),
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
    assert.deepEqual(
      store.current.auditLogs.map((log) => log.action),
      [
        "ADDITIONAL_CHARGE_CREATED",
        "ADDITIONAL_CHARGE_UPDATED",
        "ADDITIONAL_CHARGE_CANCELLED",
        "ADDITIONAL_CHARGE_CREATED",
      ],
    );
    assert.equal(
      JSON.stringify(store.current.auditLogs).includes("driver-only-note"),
      false,
      "internal notes must stay out of audit metadata",
    );
  } finally {
    restoreEnv();
  }
});

test("D.7 integrated payment-request grouping preserves snapshots, idempotency, active-request fencing, and re-request rules", async () => {
  const restoreEnv = preserveD7Env();
  const store = baseStore();
  installD7Prisma(store);

  try {
    const chargeA = await createAdminAdditionalCharge(
      {
        reservationId: "reservation-confirmed-d7",
        category: AdditionalChargeCategory.TRANSPORT,
        description: "Airport pickup",
        amount: "12.50",
      },
      D7_ACTOR,
    );
    const chargeB = await createAdminAdditionalCharge(
      {
        reservationId: "reservation-confirmed-d7",
        category: AdditionalChargeCategory.CLEANING,
        description: "Extra cleaning",
        internalNote: "housekeeping-only",
        amount: "17.50",
      },
      D7_ACTOR,
    );
    const otherReservationCharge = await createAdminAdditionalCharge(
      {
        reservationId: "reservation-cancelled-d7",
        category: AdditionalChargeCategory.DAMAGE,
        description: "Broken glass",
        amount: "9.00",
      },
      D7_ACTOR,
    );
    const requestInput = {
      reservationId: "reservation-confirmed-d7",
      clientRequestId: "final-d7-request-1",
      charges: [
        { chargeId: chargeA.id, expectedUpdatedAt: chargeA.updatedAt },
        { chargeId: chargeB.id, expectedUpdatedAt: chargeB.updatedAt },
      ],
    };
    const request = await createAdminGuestPaymentRequest(requestInput, D7_ACTOR);
    const replay = await createAdminGuestPaymentRequest(requestInput, D7_ACTOR);

    assert.equal(request.id, replay.id);
    assert.equal(store.current.requests.length, 1);
    assert.equal(request.totalAmount, "30.00");
    assert.equal(request.currency, "USD");
    assert.deepEqual(
      request.items.map((item) => [item.description, item.amount]),
      [
        ["Airport pickup", "12.50"],
        ["Extra cleaning", "17.50"],
      ],
    );
    assert.equal(request.items.some((item) => item.description.includes("housekeeping")), false);
    assert.equal(store.current.requests[0]?.accessTokenHash.length, 64);
    assert.ok(store.current.requests[0]?.accessTokenEncrypted);
    assert.equal("accessToken" in store.current.requests[0]!, false);

    const liveChargeA = store.current.charges.find((charge) => charge.id === chargeA.id)!;
    liveChargeA.description = "Mutated live description";
    liveChargeA.amount = money("99.99");

    assert.deepEqual(
      request.items.map((item) => [item.description, item.amount]),
      [
        ["Airport pickup", "12.50"],
        ["Extra cleaning", "17.50"],
      ],
      "request item snapshots must not follow later charge mutation",
    );

    liveChargeA.description = "Airport pickup";
    liveChargeA.amount = money("12.50");

    await assertAdminError(
      () =>
        updateAdminAdditionalCharge(
          {
            chargeId: chargeA.id,
            category: AdditionalChargeCategory.OTHER,
            description: "Rewrite after request",
            amount: "1.00",
            expectedUpdatedAt: chargeA.updatedAt,
          },
          D7_ACTOR,
        ),
      "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE",
    );
    await assertAdminError(
      () =>
        createAdminGuestPaymentRequest(
          {
            reservationId: "reservation-confirmed-d7",
            clientRequestId: "final-d7-request-active-conflict",
            charges: [{ chargeId: chargeA.id, expectedUpdatedAt: chargeA.updatedAt }],
          },
          D7_ACTOR,
        ),
      "ADMIN_GUEST_PAYMENT_REQUEST_ACTIVE_CONFLICT",
    );
    await assertAdminError(
      () =>
        createAdminGuestPaymentRequest(
          {
            reservationId: "reservation-confirmed-d7",
            clientRequestId: "final-d7-cross-reservation",
            charges: [
              { chargeId: otherReservationCharge.id, expectedUpdatedAt: otherReservationCharge.updatedAt },
            ],
          },
          D7_ACTOR,
        ),
      "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE",
    );

    store.current.requests[0]!.status = GuestPaymentRequestStatus.CANCELLED;
    store.current.requests[0]!.cancelledAt = D7_NOW;
    const rerequest = await createAdminGuestPaymentRequest(
      {
        reservationId: "reservation-confirmed-d7",
        clientRequestId: "final-d7-request-2",
        charges: [
          { chargeId: chargeA.id, expectedUpdatedAt: chargeA.updatedAt },
          { chargeId: chargeB.id, expectedUpdatedAt: chargeB.updatedAt },
        ],
      },
      D7_ACTOR,
    );

    assert.notEqual(rerequest.id, request.id);
    assert.equal(rerequest.totalAmount, "30.00");
    assert.deepEqual(
      rerequest.items.map((item) => [item.description, item.amount]),
      [
        ["Airport pickup", "12.50"],
        ["Extra cleaning", "17.50"],
      ],
    );

    const liveRequestTwo = store.current.requests.find(
      (candidate) => candidate.id === rerequest.id,
    )!;
    liveRequestTwo.status = GuestPaymentRequestStatus.EXPIRED;
    liveRequestTwo.expiresAt = new Date(D7_NOW.getTime() - 1_000);

    const expiredRerequest = await createAdminGuestPaymentRequest(
      {
        reservationId: "reservation-confirmed-d7",
        clientRequestId: "final-d7-request-3",
        charges: [
          { chargeId: chargeA.id, expectedUpdatedAt: chargeA.updatedAt },
          { chargeId: chargeB.id, expectedUpdatedAt: chargeB.updatedAt },
        ],
      },
      D7_ACTOR,
    );

    assert.notEqual(expiredRerequest.id, rerequest.id);
    assert.notEqual(expiredRerequest.id, request.id);
    assert.equal(expiredRerequest.totalAmount, "30.00");
    assert.deepEqual(
      expiredRerequest.items.map((item) => [item.description, item.amount]),
      [
        ["Airport pickup", "12.50"],
        ["Extra cleaning", "17.50"],
      ],
    );
    assert.equal(store.current.requests.length, 3);
    assert.equal(
      new Set(store.current.requests.map((historicalRequest) => historicalRequest.id)).size,
      3,
    );
    assert.equal(
      new Set(
        store.current.requests.map((historicalRequest) => historicalRequest.accessTokenHash),
      ).size,
      3,
    );
    assert.deepEqual(
      store.current.charges
        .filter((charge) => [chargeA.id, chargeB.id].includes(charge.id))
        .map((charge) => charge.status),
      [AdditionalChargeStatus.PENDING, AdditionalChargeStatus.PENDING],
    );
    assert.deepEqual(
      store.current.notifications.map((notification) => notification.type),
      [
        EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
      ],
    );
    assert.deepEqual(
      store.current.notifications.map((notification) => notification.guestPaymentRequestId),
      [
        request.id,
        request.id,
        rerequest.id,
        rerequest.id,
        expiredRerequest.id,
        expiredRerequest.id,
      ],
    );
    assert.equal(
      JSON.stringify(store.current.auditLogs).includes("accessToken"),
      false,
      "audit metadata must not include token material",
    );
  } finally {
    restoreEnv();
  }
});

test("D.7 integrated source contract maps the permanent Final-D gate and cross-package boundaries", () => {
  const packageJson = source("package.json");
  const chargeTypes = source("types/additional-charge.ts");
  const messagesEs = source("messages/es.ts");
  const messagesEn = source("messages/en.ts");
  const financialSummary = source("lib/reservations/financial-summary.ts");
  const adminAdditionalCharges = source(
    "features/admin/components/admin-additional-charges-section.tsx",
  );
  const privatePaymentPage = source(
    "features/payments/components/additional-charge-payment-page.tsx",
  );

  assert.match(
    packageJson,
    /"final-d:validate":\s*"tsx --tsconfig tests\/final-d\/tsconfig\.json tests\/final-d\/run\.ts"/,
  );

  for (const category of [
    "CLEANING",
    "DAMAGE",
    "TRANSPORT",
    "LATE_CHECKOUT",
    "EXTRA_SERVICE",
    "OTHER",
  ]) {
    assert.match(chargeTypes, new RegExp(category));
    assert.match(messagesEs, new RegExp(category));
    assert.match(messagesEn, new RegExp(category));
  }

  assert.match(financialSummary, /additionalChargeGrossAmount/);
  assert.match(financialSummary, /additionalChargeCapturedAmount/);
  assert.match(financialSummary, /additionalChargeRefundedAmount/);
  assert.match(financialSummary, /PaymentPurpose\.ADDITIONAL_CHARGE/);
  assert.match(financialSummary, /RefundAuthorizationType\.ADDITIONAL_CHARGE/);
  const stayPoolBlock =
    financialSummary.match(
      /const initialPayments[\s\S]*?const additionalChargeGrossAmount/,
    )?.[0] ?? "";
  assert.match(stayPoolBlock, /isEligibleInitialPayment/);
  assert.match(stayPoolBlock, /isEligibleCompletedPositiveAdjustment/);
  assert.doesNotMatch(
    stayPoolBlock,
    /PaymentPurpose\.ADDITIONAL_CHARGE/,
  );

  for (const text of [adminAdditionalCharges, privatePaymentPage]) {
    assert.doesNotMatch(text, /\balert\s*\(/);
    assert.doesNotMatch(text, /\bconfirm\s*\(/);
    assert.doesNotMatch(text, /\bprompt\s*\(/);
  }
  assert.match(adminAdditionalCharges, /additionalCharges/);
  assert.match(privatePaymentPage, /messages\.payments\.additionalCharge/);
  assert.equal(privatePaymentPage.includes("internalNote"), false);
  assert.equal(privatePaymentPage.includes("AdminAuditLog"), false);
  assert.equal(privatePaymentPage.includes("providerReference"), false);
});
