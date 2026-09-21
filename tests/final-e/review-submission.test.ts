import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
  ReservationStatus,
  ReviewInvitationStatus,
  ReviewModerationStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  getReviewSubmissionTerminalCopyKind,
  readReviewSubmissionTokenFromPathname,
  resolveReviewSubmissionClientState,
} from "@/features/reviews/review-submission-client-state";
import type {
  ReviewSubmissionClientState,
} from "@/features/reviews/review-submission-client-state";
import {
  createReviewInvitationTokenMaterial,
  deriveReviewGuestDisplayNameSnapshot,
  getReviewSubmissionSummary,
  hashReviewInvitationAccessToken,
  normalizeReviewSubmissionComment,
  parseReviewSubmissionInput,
  ReviewSubmissionError,
  submitReviewSubmission,
} from "@/lib/reviews";

import { test } from "./harness";

const ROOT = process.cwd();
const E5_NOW = new Date("2026-09-21T18:00:00.000Z");
const E5_TOKEN = "abcdef1234567890".repeat(4);
const E5_TOKEN_HASH = hashReviewInvitationAccessToken(E5_TOKEN);
const E5_ADMIN_SOURCE = {
  TRP_ENVIRONMENT: "test",
  EMAIL_ADMIN_RECIPIENTS:
    " Admin@Example.com, second@example.com, admin@example.com, not-an-email ",
  EMAIL_ADMIN_LOCALE: "en",
} as NodeJS.ProcessEnv;

type MutableReview = {
  id: string;
  reservationId: string;
  propertyId: string;
  rating: number;
  comment: string;
  guestDisplayName: string;
  moderationStatus: ReviewModerationStatus;
  submittedAt: Date;
  publishedAt: Date | null;
  moderatedAt: Date | null;
  moderatedByAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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
  propertyId: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  guestName: string;
  preferredLocale: string;
  property: {
    nameEs: string;
    nameEn: string;
  };
  review: { id: string } | null;
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
  scheduledFor: Date | null;
  nextAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MutableNotificationIntentData = Omit<
  MutableNotification,
  | "id"
  | "lifecycleRequestId"
  | "refundId"
  | "guestPaymentRequestId"
  | "reviewInvitationId"
  | "createdAt"
  | "updatedAt"
>;

type E5Store = {
  reservations: MutableReservation[];
  invitations: MutableInvitation[];
  reviews: MutableReview[];
  notifications: MutableNotification[];
  auditLogs: unknown[];
  nextReview: number;
  nextNotification: number;
};

type E5ClientOptions = Readonly<{
  failReviewCreate?: boolean;
  failNotificationIntent?: boolean;
  onTransactionAttempt?: () => void;
  serializationConflictsBeforeSuccess?: number;
  uniqueRaceOnReviewCreate?: boolean;
}>;

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
    property: { ...reservation.property },
    review: reservation.review ? { ...reservation.review } : null,
  };
}

function cloneReview(review: MutableReview): MutableReview {
  return {
    ...review,
    submittedAt: cloneDate(review.submittedAt),
    publishedAt: review.publishedAt ? cloneDate(review.publishedAt) : null,
    moderatedAt: review.moderatedAt ? cloneDate(review.moderatedAt) : null,
    createdAt: cloneDate(review.createdAt),
    updatedAt: cloneDate(review.updatedAt),
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
    createdAt: cloneDate(notification.createdAt),
    updatedAt: cloneDate(notification.updatedAt),
  };
}

function snapshotStore(store: E5Store): E5Store {
  return {
    reservations: store.reservations.map(cloneReservation),
    invitations: store.invitations.map(cloneInvitation),
    reviews: store.reviews.map(cloneReview),
    notifications: store.notifications.map(cloneNotification),
    auditLogs: [...store.auditLogs],
    nextReview: store.nextReview,
    nextNotification: store.nextNotification,
  };
}

function restoreStore(store: E5Store, snapshot: E5Store): void {
  store.reservations = snapshot.reservations.map(cloneReservation);
  store.invitations = snapshot.invitations.map(cloneInvitation);
  store.reviews = snapshot.reviews.map(cloneReview);
  store.notifications = snapshot.notifications.map(cloneNotification);
  store.auditLogs = [...snapshot.auditLogs];
  store.nextReview = snapshot.nextReview;
  store.nextNotification = snapshot.nextNotification;
}

function buildReservation(
  overrides: Partial<MutableReservation> = {},
): MutableReservation {
  return {
    id: "reservation-e5-1",
    propertyId: "property-e5-1",
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-09-18T16:00:00.000Z"),
    cancelledAt: null,
    guestName: "Juan Jose Tzun",
    preferredLocale: "es",
    property: {
      nameEs: "Bungalow del Lago",
      nameEn: "Lake Bungalow",
    },
    review: null,
    ...overrides,
  };
}

function buildInvitation(
  overrides: Partial<MutableInvitation> = {},
): MutableInvitation {
  return {
    id: "review-invitation-e5-1",
    reservationId: "reservation-e5-1",
    status: ReviewInvitationStatus.ACTIVE,
    accessTokenHash: E5_TOKEN_HASH,
    accessTokenEncrypted: "encrypted-review-token",
    checkoutAtSnapshot: new Date("2026-09-21T15:00:00.000Z"),
    eligibleAt: new Date("2026-09-21T17:00:00.000Z"),
    expiresAt: new Date("2026-10-21T18:00:00.000Z"),
    consumedAt: null,
    createdAt: new Date("2026-09-21T16:00:00.000Z"),
    updatedAt: new Date("2026-09-21T16:00:00.000Z"),
    ...overrides,
  };
}

function buildReview(overrides: Partial<MutableReview> = {}): MutableReview {
  return {
    id: "review-e5-existing",
    reservationId: "reservation-e5-1",
    propertyId: "property-e5-1",
    rating: 5,
    comment: "Existing review",
    guestDisplayName: "Juan T.",
    moderationStatus: ReviewModerationStatus.PENDING,
    submittedAt: new Date("2026-09-21T17:30:00.000Z"),
    publishedAt: null,
    moderatedAt: null,
    moderatedByAdminId: null,
    createdAt: new Date("2026-09-21T17:30:00.000Z"),
    updatedAt: new Date("2026-09-21T17:30:00.000Z"),
    ...overrides,
  };
}

function createStore(
  input: Readonly<{
    reservation?: MutableReservation;
    invitation?: MutableInvitation;
    review?: MutableReview | null;
  }> = {},
): E5Store {
  const reservation = input.reservation ?? buildReservation();
  const invitation = input.invitation ?? buildInvitation({
    reservationId: reservation.id,
  });
  const review = input.review ?? null;

  if (review) {
    reservation.review = { id: review.id };
  }

  return {
    reservations: [reservation],
    invitations: [invitation],
    reviews: review ? [review] : [],
    notifications: [],
    auditLogs: [],
    nextReview: review ? 2 : 1,
    nextNotification: 1,
  };
}

function makeP2002Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed",
    {
      code: "P2002",
      clientVersion: "final-e5-test",
    },
  );
}

function makeP2034Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Transaction failed due to a write conflict or deadlock.",
    {
      code: "P2034",
      clientVersion: "final-e5-test",
    },
  );
}

function findReservation(store: E5Store, reservationId: string) {
  return store.reservations.find((reservation) => reservation.id === reservationId) ?? null;
}

function selectedInvitation(store: E5Store, accessTokenHash: string) {
  const invitation =
    store.invitations.find(
      (candidate) => candidate.accessTokenHash === accessTokenHash,
    ) ?? null;

  if (!invitation) {
    return null;
  }

  const reservation = findReservation(store, invitation.reservationId);

  if (!reservation) {
    return null;
  }

  const review =
    store.reviews.find((candidate) => candidate.reservationId === reservation.id) ??
    null;

  reservation.review = review ? { id: review.id } : null;

  return {
    ...invitation,
    reservation: {
      id: reservation.id,
      propertyId: reservation.propertyId,
      status: reservation.status,
      confirmedAt: reservation.confirmedAt,
      cancelledAt: reservation.cancelledAt,
      guestName: reservation.guestName,
      preferredLocale: reservation.preferredLocale,
      property: { ...reservation.property },
      review: reservation.review,
    },
  };
}

function addExternalWinnerReview(store: E5Store): void {
  const reservation = store.reservations[0];
  const review = buildReview({
    id: "review-e5-external-winner",
    reservationId: reservation.id,
    propertyId: reservation.propertyId,
    comment: "External winner",
  });

  store.reviews.push(review);
  reservation.review = { id: review.id };
}

function insertNotificationIntent(
  store: E5Store,
  data: MutableNotificationIntentData,
): MutableNotification {
  const notification: MutableNotification = {
    ...data,
    id: `review-submitted-notification-e5-${store.nextNotification}`,
    lifecycleRequestId: null,
    refundId: null,
    guestPaymentRequestId: null,
    reviewInvitationId: null,
    scheduledFor: data.scheduledFor ?? null,
    nextAttemptAt: data.nextAttemptAt ?? null,
    createdAt: E5_NOW,
    updatedAt: E5_NOW,
  };

  store.nextNotification += 1;
  store.notifications.push(notification);

  return notification;
}

function makeClient(store: E5Store, options: E5ClientOptions = {}): PrismaClient {
  let transactionQueue = Promise.resolve<unknown>(undefined);
  let serializationConflictAttempts = 0;
  const tx = {
    reviewInvitation: {
      async findUnique(args: { where: { accessTokenHash: string } }) {
        return selectedInvitation(store, args.where.accessTokenHash);
      },
      async updateMany(args: {
        where: {
          id: string;
          status: ReviewInvitationStatus;
          consumedAt?: null;
          expiresAt?: { gt?: Date; lte?: Date };
        };
        data: Partial<MutableInvitation>;
      }) {
        const invitation = store.invitations.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (!invitation || invitation.status !== args.where.status) {
          return { count: 0 };
        }

        if (
          Object.hasOwn(args.where, "consumedAt") &&
          invitation.consumedAt !== null
        ) {
          return { count: 0 };
        }

        if (
          args.where.expiresAt?.gt &&
          invitation.expiresAt <= args.where.expiresAt.gt
        ) {
          return { count: 0 };
        }

        if (
          args.where.expiresAt?.lte &&
          invitation.expiresAt > args.where.expiresAt.lte
        ) {
          return { count: 0 };
        }

        Object.assign(invitation, args.data);
        return { count: 1 };
      },
    },
    review: {
      async create(args: { data: Omit<MutableReview, "id" | "createdAt" | "updatedAt"> }) {
        if (options.failReviewCreate) {
          throw new Error("REVIEW_CREATE_FAILED");
        }

        if (options.uniqueRaceOnReviewCreate) {
          throw makeP2002Error();
        }

        if (
          store.reviews.some(
            (review) => review.reservationId === args.data.reservationId,
          )
        ) {
          throw makeP2002Error();
        }

        const review = buildReview({
          ...args.data,
          id: `review-e5-${store.nextReview}`,
          createdAt: args.data.submittedAt,
          updatedAt: args.data.submittedAt,
        });
        const reservation = findReservation(store, args.data.reservationId);

        store.nextReview += 1;
        store.reviews.push(review);

        if (reservation) {
          reservation.review = { id: review.id };
        }

        return review;
      },
    },
    emailNotification: {
      async createMany(args: {
        data: MutableNotificationIntentData;
        skipDuplicates?: boolean;
      }) {
        if (options.failNotificationIntent) {
          throw new Error("ADMIN_REVIEW_SUBMITTED_INTENT_FAILED");
        }

        const existing = store.notifications.find(
          (notification) =>
            notification.deduplicationKey === args.data.deduplicationKey,
        );

        if (existing) {
          return { count: 0 };
        }

        insertNotificationIntent(store, args.data);
        return { count: 1 };
      },
      async findUnique(args: { where: { deduplicationKey: string } }) {
        return (
          store.notifications.find(
            (notification) =>
              notification.deduplicationKey === args.where.deduplicationKey,
          ) ?? null
        );
      },
    },
    adminAuditLog: {
      async create(args: { data: unknown }) {
        store.auditLogs.push(args.data);
      },
    },
  };

  const client = {
    async $transaction(
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) {
      const runTransaction = async () => {
        const snapshot = snapshotStore(store);

        try {
          options.onTransactionAttempt?.();

          if (
            serializationConflictAttempts <
            (options.serializationConflictsBeforeSuccess ?? 0)
          ) {
            serializationConflictAttempts += 1;
            throw makeP2034Error();
          }

          return await callback(tx as unknown as Prisma.TransactionClient);
        } catch (error) {
          restoreStore(store, snapshot);

          if (
            options.uniqueRaceOnReviewCreate &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            addExternalWinnerReview(store);
          }

          throw error;
        }
      };
      const transactionResult = transactionQueue.then(runTransaction, runTransaction);

      transactionQueue = transactionResult.catch(() => undefined);

      return transactionResult;
    },
  };

  return client as unknown as PrismaClient;
}

async function assertSubmissionError(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) =>
      error instanceof ReviewSubmissionError && error.code === code,
  );
}

test("E.5 derives safe guestDisplayName snapshots with Unicode whitespace", () => {
  assert.equal(deriveReviewGuestDisplayNameSnapshot("Juan"), "Juan");
  assert.equal(
    deriveReviewGuestDisplayNameSnapshot("Juan Jose Tzun"),
    "Juan T.",
  );
  assert.equal(
    deriveReviewGuestDisplayNameSnapshot("  María   del   Carmen López  "),
    "María L.",
  );
  assert.equal(
    deriveReviewGuestDisplayNameSnapshot("Élodie Brontë"),
    "Élodie B.",
  );
  assert.equal(deriveReviewGuestDisplayNameSnapshot(" \t \n 123 456 "), null);
});

test("E.5 validates rating and plain-text comment input exactly", () => {
  assert.equal(parseReviewSubmissionInput({
    rating: 1,
    comment: "Great",
    locale: "en",
  }).rating, 1);
  assert.equal(parseReviewSubmissionInput({
    rating: 5,
    comment: "Excelente",
    locale: "es",
  }).rating, 5);

  for (const rating of [0, 6, 1.5]) {
    assert.throws(
      () => parseReviewSubmissionInput({ rating, comment: "Ok", locale: "es" }),
      ReviewSubmissionError,
    );
  }

  assert.equal(normalizeReviewSubmissionComment("  Gracias  "), "Gracias");
  assert.throws(() => normalizeReviewSubmissionComment("   "), ReviewSubmissionError);
  assert.equal(normalizeReviewSubmissionComment("x"), "x");
  assert.equal(normalizeReviewSubmissionComment("a".repeat(2_000)).length, 2_000);
  assert.throws(
    () => normalizeReviewSubmissionComment("a".repeat(2_001)),
    ReviewSubmissionError,
  );
  assert.equal(normalizeReviewSubmissionComment("uno\r\ndos"), "uno\ndos");
  assert.equal(
    normalizeReviewSubmissionComment("<strong>Great stay</strong>"),
    "<strong>Great stay</strong>",
  );
});

test("E.5 client state converges stale terminals and rejects malformed paths safely", () => {
  const active: ReviewSubmissionClientState = "ACTIVE";

  assert.equal(
    resolveReviewSubmissionClientState(active, {
      errorCode: "REVIEW_INVITATION_EXPIRED",
    }),
    "EXPIRED",
  );
  assert.equal(
    resolveReviewSubmissionClientState(active, {
      errorCode: "REVIEW_INVITATION_UNAVAILABLE",
    }),
    "UNAVAILABLE",
  );
  assert.equal(
    resolveReviewSubmissionClientState(active, {
      errorCode: "INVALID_REVIEW_SUBMISSION",
    }),
    "ACTIVE",
  );
  assert.equal(
    resolveReviewSubmissionClientState(active, {
      errorCode: "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
    }),
    "ACTIVE",
  );
  assert.equal(
    resolveReviewSubmissionClientState(active, { outcome: "submitted" }),
    "SUBMITTED",
  );
  assert.equal(
    resolveReviewSubmissionClientState(active, {
      outcome: "already-submitted",
    }),
    "ALREADY_SUBMITTED",
  );
  assert.equal(
    getReviewSubmissionTerminalCopyKind(
      "UNAVAILABLE",
      "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
    ),
    "unavailable",
  );
  assert.equal(
    getReviewSubmissionTerminalCopyKind(
      "UNAVAILABLE",
      "INVALID_REVIEW_INVITATION",
    ),
    "invalid",
  );
  assert.equal(
    readReviewSubmissionTokenFromPathname(`/resenas/${E5_TOKEN}`),
    E5_TOKEN,
  );
  assert.equal(readReviewSubmissionTokenFromPathname("/resenas/"), null);
  assert.equal(
    readReviewSubmissionTokenFromPathname("/resenas/%E0%A4%A"),
    null,
  );
});

test("E.5 GET rejects invalid and unknown review invitation tokens safely", async () => {
  const store = createStore();
  const client = makeClient(store);
  const unknownToken = "1111111111111111".repeat(4);

  await assertSubmissionError(
    getReviewSubmissionSummary("not-a-token", { now: E5_NOW, prismaClient: client }),
    "INVALID_REVIEW_INVITATION",
  );
  await assertSubmissionError(
    getReviewSubmissionSummary(unknownToken, { now: E5_NOW, prismaClient: client }),
    "INVALID_REVIEW_INVITATION",
  );
});

test("E.5 GET returns only the safe ACTIVE summary DTO", async () => {
  const store = createStore();
  const client = makeClient(store);
  const summary = await getReviewSubmissionSummary(E5_TOKEN, {
    now: E5_NOW,
    prismaClient: client,
  });
  const keys = Object.keys(summary).sort();
  const serialized = JSON.stringify(summary);

  assert.deepEqual(keys, ["expiresAt", "locale", "propertyName", "state"]);
  assert.equal(summary.state, "ACTIVE");
  assert.equal(summary.locale, "es");
  assert.equal(summary.propertyName, "Bungalow del Lago");
  assert.equal(summary.expiresAt, "2026-10-21T18:00:00.000Z");
  assert.equal(serialized.includes("reservation-e5-1"), false);
  assert.equal(serialized.includes("review-invitation-e5-1"), false);
  assert.equal(serialized.includes(E5_TOKEN), false);
  assert.equal(serialized.includes(E5_TOKEN_HASH), false);
  assert.equal(serialized.includes("guest"), false);
  assert.equal(serialized.includes("payment"), false);
  assert.equal(serialized.includes("refund"), false);
});

test("E.5 GET converges overdue ACTIVE invitations to EXPIRED", async () => {
  const store = createStore({
    invitation: buildInvitation({
      expiresAt: new Date("2026-09-21T17:59:59.999Z"),
    }),
  });
  const client = makeClient(store);
  const summary = await getReviewSubmissionSummary(E5_TOKEN, {
    now: E5_NOW,
    prismaClient: client,
  });

  assert.equal(summary.state, "EXPIRED");
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.EXPIRED);
  assert.equal(store.invitations[0].accessTokenEncrypted, null);
  assert.equal(store.invitations[0].consumedAt, null);
});

test("E.5 GET cancels business-revoked ACTIVE invitations without creating Review", async () => {
  const store = createStore({
    reservation: buildReservation({ confirmedAt: null }),
  });
  const client = makeClient(store);
  const summary = await getReviewSubmissionSummary(E5_TOKEN, {
    now: E5_NOW,
    prismaClient: client,
  });

  assert.equal(summary.state, "UNAVAILABLE");
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.CANCELLED);
  assert.equal(store.invitations[0].accessTokenEncrypted, null);
  assert.equal(store.reviews.length, 0);
});

test("E.5 GET treats not-yet-eligible ACTIVE invitations as temporarily unavailable", async () => {
  const store = createStore({
    invitation: buildInvitation({
      eligibleAt: new Date("2026-09-21T19:00:00.000Z"),
    }),
  });
  const client = makeClient(store);
  const summary = await getReviewSubmissionSummary(E5_TOKEN, {
    now: E5_NOW,
    prismaClient: client,
  });

  assert.equal(summary.state, "UNAVAILABLE");
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
  assert.equal(store.reviews.length, 0);
});

test("E.5 GET maps terminal invitation states safely", async () => {
  const consumedReview = buildReview();
  const consumedStore = createStore({
    invitation: buildInvitation({
      status: ReviewInvitationStatus.CONSUMED,
      consumedAt: E5_NOW,
      accessTokenEncrypted: null,
    }),
    review: consumedReview,
  });
  const consumedSummary = await getReviewSubmissionSummary(E5_TOKEN, {
    now: E5_NOW,
    prismaClient: makeClient(consumedStore),
  });

  assert.equal(consumedSummary.state, "ALREADY_SUBMITTED");

  for (const status of [
    ReviewInvitationStatus.EXPIRED,
    ReviewInvitationStatus.CANCELLED,
    ReviewInvitationStatus.CONSUMED,
  ] as const) {
    const store = createStore({
      invitation: buildInvitation({ status, accessTokenEncrypted: null }),
    });
    const summary = await getReviewSubmissionSummary(E5_TOKEN, {
      now: E5_NOW,
      prismaClient: makeClient(store),
    });

    assert.equal(
      summary.state,
      status === ReviewInvitationStatus.EXPIRED ? "EXPIRED" : "UNAVAILABLE",
    );
  }
});

test("E.5 POST atomically creates Review and consumes the invitation", async () => {
  const store = createStore();
  const client = makeClient(store);
  const result = await submitReviewSubmission(
    E5_TOKEN,
    {
      rating: 5,
      comment: "  Excelente estadía\r\nMuchas gracias  ",
      locale: "es",
    },
    { now: E5_NOW, prismaClient: client },
  );
  const review = store.reviews[0];
  const invitation = store.invitations[0];

  assert.equal(result.outcome, "submitted");
  assert.equal(store.reviews.length, 1);
  assert.equal(review.reservationId, "reservation-e5-1");
  assert.equal(review.propertyId, "property-e5-1");
  assert.equal(review.rating, 5);
  assert.equal(review.comment, "Excelente estadía\nMuchas gracias");
  assert.equal(review.guestDisplayName, "Juan T.");
  assert.equal(review.moderationStatus, ReviewModerationStatus.PENDING);
  assert.equal(review.submittedAt.toISOString(), E5_NOW.toISOString());
  assert.equal(review.publishedAt, null);
  assert.equal(review.moderatedAt, null);
  assert.equal(review.moderatedByAdminId, null);
  assert.equal(invitation.status, ReviewInvitationStatus.CONSUMED);
  assert.equal(invitation.consumedAt?.toISOString(), E5_NOW.toISOString());
  assert.equal(invitation.accessTokenEncrypted, null);
  assert.equal(invitation.accessTokenHash, E5_TOKEN_HASH);
  assert.equal(store.auditLogs.length, 0);
});

test("Final-E follow-up creates ADMIN_REVIEW_SUBMITTED intents for normalized admin recipients", async () => {
  const store = createStore();
  const client = makeClient(store);
  const result = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Great stay", locale: "en" },
    { now: E5_NOW, prismaClient: client, source: E5_ADMIN_SOURCE },
  );
  const review = store.reviews[0];

  assert.deepEqual(Object.keys(result), ["outcome"]);
  assert.equal(result.outcome, "submitted");
  assert.equal(store.notifications.length, 2);
  assert.deepEqual(
    store.notifications.map((notification) => notification.recipient).sort(),
    ["admin@example.com", "second@example.com"],
  );

  for (const notification of store.notifications) {
    assert.equal(notification.reservationId, "reservation-e5-1");
    assert.equal(notification.type, EmailNotificationType.ADMIN_REVIEW_SUBMITTED);
    assert.equal(notification.locale, "en");
    assert.equal(notification.origin, EmailNotificationOrigin.AUTOMATIC);
    assert.equal(notification.status, EmailNotificationStatus.PENDING);
    assert.equal(notification.reviewInvitationId, null);
    assert.equal(notification.guestPaymentRequestId, null);
    assert.equal(notification.lifecycleRequestId, null);
    assert.equal(notification.refundId, null);
    assert.equal(
      notification.deduplicationKey,
      `admin-review-submitted/${review.id}/${notification.recipient}`,
    );
  }
});

test("Final-E follow-up rolls back Review and invitation consumption when admin intent creation fails", async () => {
  const store = createStore();
  const client = makeClient(store, { failNotificationIntent: true });

  await assertSubmissionError(
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Great", locale: "en" },
      { now: E5_NOW, prismaClient: client, source: E5_ADMIN_SOURCE },
    ),
    "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
  );

  assert.equal(store.reviews.length, 0);
  assert.equal(store.notifications.length, 0);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
  assert.equal(store.invitations[0].consumedAt, null);
  assert.equal(store.invitations[0].accessTokenEncrypted, "encrypted-review-token");
});

test("Final-E follow-up replay reuses the submitted Review without duplicate admin intents", async () => {
  const store = createStore();
  const client = makeClient(store);
  const source = {
    TRP_ENVIRONMENT: "test",
    EMAIL_ADMIN_RECIPIENTS: "admin@example.com",
    EMAIL_ADMIN_LOCALE: "es",
  } as NodeJS.ProcessEnv;
  const first = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Winner", locale: "en" },
    { now: E5_NOW, prismaClient: client, source },
  );
  const second = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 1, comment: "Loser edit attempt", locale: "en" },
    { now: new Date(E5_NOW.getTime() + 1_000), prismaClient: client, source },
  );

  assert.equal(first.outcome, "submitted");
  assert.equal(second.outcome, "already-submitted");
  assert.equal(store.reviews.length, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].recipient, "admin@example.com");
  assert.equal(store.notifications[0].locale, "es");
});

test("Final-E follow-up concurrent submissions create one Review and one intent per admin recipient", async () => {
  const store = createStore();
  const client = makeClient(store);
  const [first, second] = await Promise.all([
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 4, comment: "First payload", locale: "en" },
      { now: E5_NOW, prismaClient: client, source: E5_ADMIN_SOURCE },
    ),
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 2, comment: "Second payload", locale: "en" },
      { now: E5_NOW, prismaClient: client, source: E5_ADMIN_SOURCE },
    ),
  ]);

  assert.deepEqual(
    [first.outcome, second.outcome].sort(),
    ["already-submitted", "submitted"],
  );
  assert.equal(store.reviews.length, 1);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.CONSUMED);
  assert.equal(store.notifications.length, 2);
  assert.deepEqual(
    store.notifications.map((notification) => notification.recipient).sort(),
    ["admin@example.com", "second@example.com"],
  );
});

test("Final-E follow-up admin intent creation does not couple submission to moderation", async () => {
  const store = createStore();
  const client = makeClient(store);
  const result = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Pending moderation", locale: "en" },
    { now: E5_NOW, prismaClient: client, source: E5_ADMIN_SOURCE },
  );
  const review = store.reviews[0];

  assert.deepEqual(result, { outcome: "submitted" });
  assert.equal(review.moderationStatus, ReviewModerationStatus.PENDING);
  assert.equal(review.publishedAt, null);
  assert.equal(review.moderatedAt, null);
  assert.equal(review.moderatedByAdminId, null);
  assert.equal(store.notifications.length, 2);
});

test("E.5 POST rolls back invitation consumption when Review creation fails", async () => {
  const store = createStore();
  const client = makeClient(store, { failReviewCreate: true });

  await assertSubmissionError(
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Great", locale: "en" },
      { now: E5_NOW, prismaClient: client },
    ),
    "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
  );

  assert.equal(store.reviews.length, 0);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
  assert.equal(store.invitations[0].consumedAt, null);
  assert.equal(store.invitations[0].accessTokenEncrypted, "encrypted-review-token");
});

test("E.5 POST replay returns already-submitted without editing the existing Review", async () => {
  const store = createStore();
  const client = makeClient(store);
  const first = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Winner", locale: "en" },
    { now: E5_NOW, prismaClient: client },
  );
  const second = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 1, comment: "Loser edit attempt", locale: "en" },
    { now: new Date(E5_NOW.getTime() + 1_000), prismaClient: client },
  );

  assert.equal(first.outcome, "submitted");
  assert.equal(second.outcome, "already-submitted");
  assert.equal(store.reviews.length, 1);
  assert.equal(store.reviews[0].rating, 5);
  assert.equal(store.reviews[0].comment, "Winner");
});

test("E.5 POST concurrent submissions preserve exactly one winning payload", async () => {
  const store = createStore();
  const client = makeClient(store);
  const [first, second] = await Promise.all([
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 4, comment: "First payload", locale: "en" },
      { now: E5_NOW, prismaClient: client },
    ),
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 2, comment: "Second payload", locale: "en" },
      { now: E5_NOW, prismaClient: client },
    ),
  ]);

  assert.deepEqual(
    [first.outcome, second.outcome].sort(),
    ["already-submitted", "submitted"],
  );
  assert.equal(store.reviews.length, 1);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.CONSUMED);
  assert.equal(store.reviews[0].comment, "First payload");
  assert.equal(store.reviews[0].rating, 4);
});

test("E.5 POST converges Review uniqueness races to already-submitted without P2002 leakage", async () => {
  const store = createStore();
  const client = makeClient(store, { uniqueRaceOnReviewCreate: true });
  const result = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Will lose uniqueness race", locale: "en" },
    { now: E5_NOW, prismaClient: client },
  );

  assert.equal(result.outcome, "already-submitted");
  assert.equal(store.reviews.length, 1);
  assert.equal(store.reviews[0].comment, "External winner");
});

test("E.5 POST retries one P2034 serialization conflict and commits once", async () => {
  const store = createStore();
  let transactionAttempts = 0;
  const client = makeClient(store, {
    onTransactionAttempt: () => {
      transactionAttempts += 1;
    },
    serializationConflictsBeforeSuccess: 1,
  });
  const result = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Retry after conflict", locale: "en" },
    { now: E5_NOW, prismaClient: client },
  );

  assert.equal(result.outcome, "submitted");
  assert.equal(transactionAttempts, 2);
  assert.equal(store.reviews.length, 1);
  assert.equal(store.reviews[0].comment, "Retry after conflict");
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.CONSUMED);
  assert.equal(
    store.invitations[0].consumedAt?.toISOString(),
    E5_NOW.toISOString(),
  );
  assert.equal(store.invitations[0].accessTokenEncrypted, null);
});

test("E.5 POST maps exhausted P2034 conflicts to a safe unexpected error", async () => {
  const store = createStore();
  let transactionAttempts = 0;
  const client = makeClient(store, {
    onTransactionAttempt: () => {
      transactionAttempts += 1;
    },
    serializationConflictsBeforeSuccess: 3,
  });
  let caughtError: unknown = null;

  try {
    await submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Will exhaust conflicts", locale: "en" },
      { now: E5_NOW, prismaClient: client },
    );
  } catch (error) {
    caughtError = error;
  }

  if (!(caughtError instanceof ReviewSubmissionError)) {
    assert.fail("Expected ReviewSubmissionError after P2034 exhaustion.");
  }

  assert.equal(caughtError.code, "REVIEW_SUBMISSION_UNEXPECTED_ERROR");
  assert.equal(caughtError.message.includes("P2034"), false);
  assert.equal(caughtError.message.includes("Prisma"), false);
  assert.equal(caughtError.message.includes("write conflict"), false);
  assert.equal(transactionAttempts, 3);
  assert.equal(store.reviews.length, 0);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
  assert.equal(store.invitations[0].consumedAt, null);
  assert.equal(
    store.invitations[0].accessTokenEncrypted,
    "encrypted-review-token",
  );
});

test("E.5 POST rejects expired and business-revoked invitations without Review creation", async () => {
  const expiredStore = createStore({
    invitation: buildInvitation({
      expiresAt: new Date("2026-09-21T17:59:59.999Z"),
    }),
  });

  await assertSubmissionError(
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Great", locale: "en" },
      { now: E5_NOW, prismaClient: makeClient(expiredStore) },
    ),
    "REVIEW_INVITATION_EXPIRED",
  );
  assert.equal(expiredStore.reviews.length, 0);
  assert.equal(expiredStore.invitations[0].status, ReviewInvitationStatus.EXPIRED);
  assert.equal(expiredStore.invitations[0].accessTokenEncrypted, null);

  const revokedStore = createStore({
    reservation: buildReservation({
      cancelledAt: new Date("2026-09-21T14:59:59.999Z"),
    }),
  });

  await assertSubmissionError(
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Great", locale: "en" },
      { now: E5_NOW, prismaClient: makeClient(revokedStore) },
    ),
    "REVIEW_INVITATION_UNAVAILABLE",
  );
  assert.equal(revokedStore.reviews.length, 0);
  assert.equal(revokedStore.invitations[0].status, ReviewInvitationStatus.CANCELLED);
  assert.equal(revokedStore.invitations[0].accessTokenEncrypted, null);
});

test("E.5 POST rejects invalid historical guestName without consuming invitation", async () => {
  const store = createStore({
    reservation: buildReservation({ guestName: "  123 456  " }),
  });

  await assertSubmissionError(
    submitReviewSubmission(
      E5_TOKEN,
      { rating: 5, comment: "Great", locale: "en" },
      { now: E5_NOW, prismaClient: makeClient(store) },
    ),
    "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
  );

  assert.equal(store.reviews.length, 0);
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.ACTIVE);
  assert.equal(store.invitations[0].consumedAt, null);
});

test("E.5 does not persist raw review tokens or create guest AdminAuditLog evidence", async () => {
  const store = createStore();
  const tokenMaterial = createReviewInvitationTokenMaterial(
    "reservation-e5-1",
    E5_TOKEN,
  );

  store.invitations[0].accessTokenEncrypted = tokenMaterial.encryptedToken;

  const result = await submitReviewSubmission(
    E5_TOKEN,
    { rating: 5, comment: "Great", locale: "en" },
    { now: E5_NOW, prismaClient: makeClient(store) },
  );
  const persisted = JSON.stringify(store);

  assert.equal(result.outcome, "submitted");
  assert.equal(persisted.includes(E5_TOKEN), false);
  assert.equal(store.auditLogs.length, 0);
});

test("E.5 private submission route coexists with E.6 public and admin review surfaces", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const vercelConfig = JSON.parse(
    readFileSync(path.join(ROOT, "vercel.json"), "utf8"),
  ) as { crons?: unknown[] };

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
    packageJson.scripts["final-e:validate"],
    "tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts",
  );
  assert.deepEqual(vercelConfig.crons, []);
});
