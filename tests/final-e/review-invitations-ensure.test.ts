import assert from "node:assert/strict";

import {
  ReservationStatus,
  ReviewInvitationStatus,
  type Prisma,
} from "@prisma/client";

import {
  ensureReviewInvitationInTransaction,
  hashReviewInvitationAccessToken,
  type ReviewInvitationLifecycleRecord,
  type ReviewInvitationTokenMaterial,
} from "@/lib/reviews";

import { test } from "./harness";

const rawToken = "abcdef0123456789".repeat(4);
const tokenMaterial: ReviewInvitationTokenMaterial = {
  rawToken,
  tokenHash: hashReviewInvitationAccessToken(rawToken),
  encryptedToken: "encrypted-review-token-without-raw-value",
};
const winningRawToken = "0123456789abcdef".repeat(4);
const winningTokenHash = hashReviewInvitationAccessToken(winningRawToken);
const now = new Date("2026-09-18T19:00:00.000Z");
const checkoutAtSnapshot = new Date("2026-09-18T17:00:00.000Z");
const eligibleAt = new Date("2026-09-18T19:00:00.000Z");
const expiresAt = new Date("2026-10-18T19:00:00.000Z");

type FakeReservation = Readonly<{
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  checkOutDate: Date;
  property: Readonly<{
    checkOutTime: string | null;
  }>;
  review: Readonly<{ id: string }> | null;
  reviewInvitation: ReviewInvitationLifecycleRecord | null;
}>;

function buildReservation(
  overrides: Partial<FakeReservation> = {},
): FakeReservation {
  return {
    id: "reservation-review-ensure",
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-09-15T15:00:00.000Z"),
    cancelledAt: null,
    checkOutDate: new Date("2026-09-18T00:00:00.000Z"),
    property: {
      checkOutTime: "11:00",
    },
    review: null,
    reviewInvitation: null,
    ...overrides,
  };
}

function containsRawToken(value: unknown): boolean {
  return containsToken(value, rawToken);
}

function containsToken(value: unknown, token: string): boolean {
  if (value === token) {
    return true;
  }

  if (typeof value === "string") {
    return value.includes(token);
  }

  if (value instanceof Date || value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsToken(entry, token));
  }

  if (typeof value === "object") {
    return Object.values(value).some((entry) => containsToken(entry, token));
  }

  return false;
}

type FakeCreateManyData = Omit<
  ReviewInvitationLifecycleRecord,
  "id" | "updatedAt"
>;

type CreateEnsureTxOptions = Readonly<{
  createRaceWinner?: ReviewInvitationLifecycleRecord;
}>;

function buildInvitationFromCreateManyData(
  data: FakeCreateManyData,
  id: string,
): ReviewInvitationLifecycleRecord {
  return {
    id,
    reservationId: data.reservationId,
    status: data.status,
    accessTokenHash: data.accessTokenHash,
    accessTokenEncrypted: data.accessTokenEncrypted,
    checkoutAtSnapshot: data.checkoutAtSnapshot,
    eligibleAt: data.eligibleAt,
    expiresAt: data.expiresAt,
    consumedAt: data.consumedAt,
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
  };
}

function buildWinningInvitation(): ReviewInvitationLifecycleRecord {
  return {
    id: "review-invitation-winning-race",
    reservationId: "reservation-review-ensure",
    status: ReviewInvitationStatus.ACTIVE,
    accessTokenHash: winningTokenHash,
    accessTokenEncrypted: "encrypted-winning-review-token",
    checkoutAtSnapshot,
    eligibleAt,
    expiresAt,
    consumedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createEnsureTx(
  initialReservation: FakeReservation,
  options: CreateEnsureTxOptions = {},
) {
  let reservation = initialReservation;
  const createdInvitations: ReviewInvitationLifecycleRecord[] = [];
  const createWrites: unknown[] = [];
  let createManyCalls = 0;

  const tx = {
    reservation: {
      async findUnique(args: { where: { id: string } }) {
        if (args.where.id !== reservation.id) {
          return null;
        }

        return reservation;
      },
    },
    reviewInvitation: {
      async createMany(args: {
        data: FakeCreateManyData;
        skipDuplicates: boolean;
      }) {
        createWrites.push(args.data);
        createManyCalls += 1;

        if (options.createRaceWinner && createManyCalls === 1) {
          reservation = {
            ...reservation,
            reviewInvitation: options.createRaceWinner,
          };
          createdInvitations.push(options.createRaceWinner);

          return { count: 0 };
        }

        if (reservation.reviewInvitation) {
          return { count: 0 };
        }

        const invitation = buildInvitationFromCreateManyData(
          args.data,
          `review-invitation-${createdInvitations.length + 1}`,
        );

        createdInvitations.push(invitation);
        reservation = {
          ...reservation,
          reviewInvitation: invitation,
        };

        return { count: 1 };
      },
      async findUnique(args: { where: { reservationId: string } }) {
        if (args.where.reservationId !== reservation.id) {
          return null;
        }

        return reservation.reviewInvitation;
      },
    },
  };

  return {
    tx: tx as unknown as Prisma.TransactionClient,
    get reservation() {
      return reservation;
    },
    createdInvitations,
    createWrites,
    get createManyCalls() {
      return createManyCalls;
    },
  };
}

test("E.3 ensure creates one ACTIVE ReviewInvitation for an eligible scheduler candidate", async () => {
  const fake = createEnsureTx(buildReservation());
  const result = await ensureReviewInvitationInTransaction(
    fake.tx,
    "reservation-review-ensure",
    {
      now,
      tokenMaterialFactory: () => tokenMaterial,
    },
  );

  assert.equal(result.outcome, "created");
  assert.equal(fake.createdInvitations.length, 1);

  if (result.outcome !== "created") {
    throw new Error("Expected review invitation creation.");
  }

  assert.equal(result.invitation.status, ReviewInvitationStatus.ACTIVE);
  assert.equal(
    result.invitation.checkoutAtSnapshot.toISOString(),
    checkoutAtSnapshot.toISOString(),
  );
  assert.equal(result.invitation.eligibleAt.toISOString(), eligibleAt.toISOString());
  assert.equal(result.invitation.expiresAt.toISOString(), expiresAt.toISOString());
  assert.equal(result.invitation.createdAt.toISOString(), now.toISOString());
  assert.equal(result.invitation.consumedAt, null);
  assert.equal(result.invitation.accessTokenHash, tokenMaterial.tokenHash);
  assert.equal(
    result.invitation.accessTokenEncrypted,
    tokenMaterial.encryptedToken,
  );
  assert.equal(containsRawToken(fake.createWrites), false);
  assert.equal(containsRawToken(result.invitation), false);
});

test("E.3 ensure replay returns the same invitation without token rotation", async () => {
  const fake = createEnsureTx(buildReservation());
  const first = await ensureReviewInvitationInTransaction(
    fake.tx,
    "reservation-review-ensure",
    {
      now,
      tokenMaterialFactory: () => tokenMaterial,
    },
  );
  const second = await ensureReviewInvitationInTransaction(
    fake.tx,
    "reservation-review-ensure",
    {
      now: new Date(now.getTime() + 1),
      tokenMaterialFactory: () => {
        throw new Error("Token material must not rotate for an existing invitation.");
      },
    },
  );

  assert.equal(first.outcome, "created");
  assert.equal(second.outcome, "existing");
  assert.equal(fake.createdInvitations.length, 1);

  if (first.outcome === "created" && second.outcome === "existing") {
    assert.equal(second.invitation.id, first.invitation.id);
    assert.equal(
      second.invitation.accessTokenHash,
      first.invitation.accessTokenHash,
    );
    assert.equal(second.effectiveStatus, ReviewInvitationStatus.ACTIVE);
  }
});

test("E.3 ensure converges when another transaction wins the creation race", async () => {
  const fake = createEnsureTx(buildReservation(), {
    createRaceWinner: buildWinningInvitation(),
  });
  const result = await ensureReviewInvitationInTransaction(
    fake.tx,
    "reservation-review-ensure",
    {
      now,
      tokenMaterialFactory: () => tokenMaterial,
    },
  );

  assert.equal(result.outcome, "existing");
  assert.equal(fake.createManyCalls, 1);
  assert.equal(fake.createWrites.length, 1);
  assert.equal(fake.createdInvitations.length, 1);

  if (result.outcome !== "existing") {
    throw new Error("Expected review invitation race convergence.");
  }

  assert.equal(result.invitation.id, "review-invitation-winning-race");
  assert.equal(result.invitation.accessTokenHash, winningTokenHash);
  assert.notEqual(result.invitation.accessTokenHash, tokenMaterial.tokenHash);
  assert.equal(result.effectiveStatus, ReviewInvitationStatus.ACTIVE);
  assert.equal("tokenMaterial" in result, false);
  assert.equal(containsToken(result, rawToken), false);
  assert.equal(containsToken(fake.createdInvitations, rawToken), false);
});

test("E.3 ensure does not create an invitation when a Review already exists", async () => {
  const fake = createEnsureTx(
    buildReservation({
      review: {
        id: "review-existing",
      },
    }),
  );
  const result = await ensureReviewInvitationInTransaction(
    fake.tx,
    "reservation-review-ensure",
    {
      now,
      tokenMaterialFactory: () => tokenMaterial,
    },
  );

  assert.equal(result.outcome, "review-already-exists");
  assert.equal(fake.createdInvitations.length, 0);
});
