import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  Prisma,
  PropertyStatus,
  ReviewModerationStatus,
  UserRole,
  type PrismaClient,
} from "@prisma/client";

import { getAdminReviewsPage, moderateAdminReview } from "@/lib/admin";
import { AdminReviewError } from "@/lib/admin/reviews";
import { getPublishedReviews } from "@/lib/reviews";
import { enMessages, esMessages } from "@/messages";
import type { AdminActor } from "@/types/admin";

import { test } from "./harness";

const ROOT = process.cwd();
const E6_NOW = new Date("2026-09-21T20:00:00.000Z");
const ADMIN_ACTOR: AdminActor = {
  email: "Owner.E6@Example.com",
  name: "Owner E6",
};

type MutableProperty = {
  id: string;
  nameEs: string;
  nameEn: string;
  slug: string;
  status: PropertyStatus;
  deletedAt: Date | null;
};

type MutableUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

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

type MutableAuditLog = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
};

type E6Store = {
  properties: MutableProperty[];
  reviews: MutableReview[];
  users: MutableUser[];
  auditLogs: MutableAuditLog[];
  nextUser: number;
};

type FakeReviewWhere = {
  moderationStatus?: ReviewModerationStatus;
  propertyId?: string;
  property?: {
    status?: PropertyStatus;
    deletedAt?: null;
  };
};

type FakeClientOptions = Readonly<{
  staleUpdateManyOnce?: boolean;
  throwP2034OnTransaction?: boolean;
}>;

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

function cloneNullableDate(value: Date | null): Date | null {
  return value ? cloneDate(value) : null;
}

function cloneProperty(property: MutableProperty): MutableProperty {
  return {
    ...property,
    deletedAt: cloneNullableDate(property.deletedAt),
  };
}

function cloneReview(review: MutableReview): MutableReview {
  return {
    ...review,
    submittedAt: cloneDate(review.submittedAt),
    publishedAt: cloneNullableDate(review.publishedAt),
    moderatedAt: cloneNullableDate(review.moderatedAt),
    createdAt: cloneDate(review.createdAt),
    updatedAt: cloneDate(review.updatedAt),
  };
}

function snapshotStore(store: E6Store): E6Store {
  return {
    properties: store.properties.map(cloneProperty),
    reviews: store.reviews.map(cloneReview),
    users: store.users.map((user) => ({ ...user })),
    auditLogs: store.auditLogs.map((auditLog) => ({
      ...auditLog,
      metadata:
        auditLog.metadata && typeof auditLog.metadata === "object"
          ? JSON.parse(JSON.stringify(auditLog.metadata))
          : auditLog.metadata,
    })),
    nextUser: store.nextUser,
  };
}

function restoreStore(store: E6Store, snapshot: E6Store): void {
  store.properties = snapshot.properties.map(cloneProperty);
  store.reviews = snapshot.reviews.map(cloneReview);
  store.users = snapshot.users.map((user) => ({ ...user }));
  store.auditLogs = snapshot.auditLogs.map((auditLog) => ({
    ...auditLog,
    metadata:
      auditLog.metadata && typeof auditLog.metadata === "object"
        ? JSON.parse(JSON.stringify(auditLog.metadata))
        : auditLog.metadata,
  }));
  store.nextUser = snapshot.nextUser;
}

function makeP2034Error(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Transaction failed due to a write conflict.",
    {
      code: "P2034",
      clientVersion: "final-e6-test",
    },
  );
}

function buildProperty(
  overrides: Partial<MutableProperty> = {},
): MutableProperty {
  return {
    id: "black-white-apartment",
    nameEs: "Apartamento Blanco y Negro",
    nameEn: "Black and White Apartment",
    slug: "apartamento-blanco-y-negro",
    status: PropertyStatus.ACTIVE,
    deletedAt: null,
    ...overrides,
  };
}

function buildReview(overrides: Partial<MutableReview> = {}): MutableReview {
  return {
    id: "review-e6-1",
    reservationId: "reservation-e6-1",
    propertyId: "black-white-apartment",
    rating: 5,
    comment: "Excelente estadia",
    guestDisplayName: "Maria G.",
    moderationStatus: ReviewModerationStatus.PENDING,
    submittedAt: new Date("2026-09-21T18:00:00.000Z"),
    publishedAt: null,
    moderatedAt: null,
    moderatedByAdminId: null,
    createdAt: new Date("2026-09-21T18:00:00.000Z"),
    updatedAt: new Date("2026-09-21T18:00:00.000Z"),
    ...overrides,
  };
}

function createStore(
  input: Readonly<{
    properties?: MutableProperty[];
    reviews?: MutableReview[];
    users?: MutableUser[];
  }> = {},
): E6Store {
  return {
    properties:
      input.properties ??
      [
        buildProperty(),
        buildProperty({
          id: "perfect-retreat-bungalow",
          nameEs: "Bungalow Refugio Perfecto",
          nameEn: "Perfect Retreat Bungalow",
          slug: "bungalow-refugio-perfecto",
        }),
        buildProperty({
          id: "complete-retreat",
          nameEs: "Refugio Completo",
          nameEn: "Complete Retreat",
          slug: "refugio-completo",
        }),
      ],
    reviews: input.reviews ?? [buildReview()],
    users: input.users ?? [],
    auditLogs: [],
    nextUser: (input.users?.length ?? 0) + 1,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function findProperty(store: E6Store, propertyId: string): MutableProperty {
  const property = store.properties.find((candidate) => candidate.id === propertyId);

  if (!property) {
    throw new Error(`Missing fake property ${propertyId}`);
  }

  return property;
}

function findUser(store: E6Store, userId: string | null): MutableUser | null {
  if (!userId) {
    return null;
  }

  return store.users.find((candidate) => candidate.id === userId) ?? null;
}

function toReviewRecord(store: E6Store, review: MutableReview) {
  const property = findProperty(store, review.propertyId);
  const moderator = findUser(store, review.moderatedByAdminId);

  return {
    ...review,
    property: {
      id: property.id,
      nameEs: property.nameEs,
      nameEn: property.nameEn,
      slug: property.slug,
      status: property.status,
      deletedAt: property.deletedAt,
    },
    moderatedByAdmin: moderator
      ? {
          name: moderator.name,
          email: moderator.email,
        }
      : null,
  };
}

function filterReviews(store: E6Store, where: FakeReviewWhere = {}) {
  return store.reviews.filter((review) => {
    const property = findProperty(store, review.propertyId);

    if (
      where.moderationStatus &&
      review.moderationStatus !== where.moderationStatus
    ) {
      return false;
    }

    if (where.propertyId && review.propertyId !== where.propertyId) {
      return false;
    }

    if (
      where.property?.status &&
      property.status !== where.property.status
    ) {
      return false;
    }

    if (
      Object.hasOwn(where.property ?? {}, "deletedAt") &&
      property.deletedAt !== null
    ) {
      return false;
    }

    return true;
  });
}

function sortNewestFirst(reviews: MutableReview[]): MutableReview[] {
  return [...reviews].sort(
    (left, right) =>
      right.submittedAt.getTime() - left.submittedAt.getTime() ||
      right.id.localeCompare(left.id),
  );
}

function makeClient(
  store: E6Store,
  options: FakeClientOptions = {},
): PrismaClient {
  let staleUpdateManyUsed = false;
  const tx = {
    property: {
      async findMany() {
        return store.properties
          .filter((property) => property.deletedAt === null)
          .sort((left, right) => left.nameEs.localeCompare(right.nameEs))
          .map(({ id, nameEs, nameEn }) => ({ id, nameEs, nameEn }));
      },
    },
    review: {
      async count(args: { where?: FakeReviewWhere }) {
        return filterReviews(store, args.where).length;
      },
      async findMany(args: {
        where?: FakeReviewWhere;
        skip?: number;
        take?: number;
      }) {
        return sortNewestFirst(filterReviews(store, args.where))
          .slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? store.reviews.length))
          .map((review) => toReviewRecord(store, review));
      },
      async findUnique(args: { where: { id: string } }) {
        const review =
          store.reviews.find((candidate) => candidate.id === args.where.id) ??
          null;

        return review ? toReviewRecord(store, review) : null;
      },
      async updateMany(args: {
        where: {
          id: string;
          moderationStatus: ReviewModerationStatus;
          updatedAt: Date;
        };
        data: Partial<MutableReview>;
      }) {
        if (options.staleUpdateManyOnce && !staleUpdateManyUsed) {
          staleUpdateManyUsed = true;
          return { count: 0 };
        }

        const review = store.reviews.find(
          (candidate) =>
            candidate.id === args.where.id &&
            candidate.moderationStatus === args.where.moderationStatus &&
            candidate.updatedAt.getTime() === args.where.updatedAt.getTime(),
        );

        if (!review) {
          return { count: 0 };
        }

        Object.assign(review, args.data);
        review.updatedAt = args.data.moderatedAt
          ? cloneDate(args.data.moderatedAt)
          : new Date(review.updatedAt.getTime() + 1);

        return { count: 1 };
      },
    },
    user: {
      async upsert(args: {
        where: { email: string };
        update: { name?: string; role: UserRole };
        create: { email: string; name: string | null; role: UserRole };
      }) {
        const email = normalizeEmail(args.where.email);
        let user =
          store.users.find((candidate) => candidate.email === email) ?? null;

        if (!user) {
          user = {
            id: `admin-e6-${store.nextUser}`,
            email,
            name: args.create.name,
            role: args.create.role,
          };
          store.nextUser += 1;
          store.users.push(user);
        } else {
          user.name = args.update.name ?? user.name;
          user.role = args.update.role;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    },
    adminAuditLog: {
      async create(args: { data: MutableAuditLog }) {
        store.auditLogs.push(args.data);
      },
    },
  };
  const client = {
    property: tx.property,
    review: tx.review,
    async $transaction(
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) {
      if (options.throwP2034OnTransaction) {
        throw makeP2034Error();
      }

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

async function assertAdminReviewError(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) =>
      error instanceof AdminReviewError && error.code === code,
  );
}

function assertExactKeys(value: object, expected: readonly string[]): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}

function assertSafeAuditLog(
  auditLog: MutableAuditLog,
  review: MutableReview,
): void {
  const serialized = JSON.stringify(auditLog);

  assert.equal(auditLog.action, "REVIEW_MODERATION_STATUS_CHANGED");
  assert.equal(auditLog.entityType, "Review");
  assert.equal(auditLog.entityId, review.id);
  assert.equal(serialized.includes(review.comment), false);
  assert.equal(serialized.includes(review.guestDisplayName), false);
  assert.equal(serialized.includes("guest.e6@example.com"), false);
  assert.equal(serialized.includes("Maria Fernanda Morales"), false);
  assert.equal(serialized.includes("raw-review-token"), false);
  assert.equal(serialized.includes("hashed-review-token"), false);
  assert.equal(serialized.includes("encrypted-review-token"), false);
  assert.equal(serialized.includes("payment"), false);
  assert.equal(serialized.includes("refund"), false);
}

function stableReviewContent(review: MutableReview) {
  return {
    reservationId: review.reservationId,
    propertyId: review.propertyId,
    rating: review.rating,
    comment: review.comment,
    guestDisplayName: review.guestDisplayName,
    submittedAt: review.submittedAt.toISOString(),
  };
}

test("E.6 moderation publishes PENDING reviews with first-publication evidence and safe audit metadata", async () => {
  const review = buildReview({
    comment: "<strong>Great stay</strong>",
    guestDisplayName: "Maria G.",
  });
  const store = createStore({ reviews: [review] });
  const client = makeClient(store);
  const updated = await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "PUBLISHED",
      expectedUpdatedAt: review.updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: E6_NOW, prismaClient: client },
  );

  assert.equal(updated.moderationStatus, "PUBLISHED");
  assert.equal(store.reviews[0].moderationStatus, ReviewModerationStatus.PUBLISHED);
  assert.equal(store.reviews[0].publishedAt?.toISOString(), E6_NOW.toISOString());
  assert.equal(store.reviews[0].moderatedAt?.toISOString(), E6_NOW.toISOString());
  assert.equal(store.reviews[0].moderatedByAdminId, "admin-e6-1");
  assert.equal(store.auditLogs.length, 1);
  assertSafeAuditLog(store.auditLogs[0], review);
});

test("E.6 moderation hides and republishes reviews while preserving first publishedAt", async () => {
  const firstPublication = new Date("2026-09-21T18:30:00.000Z");
  const review = buildReview({
    moderationStatus: ReviewModerationStatus.PUBLISHED,
    publishedAt: firstPublication,
    moderatedAt: firstPublication,
    moderatedByAdminId: "admin-e6-existing",
    updatedAt: new Date("2026-09-21T18:30:00.000Z"),
  });
  const store = createStore({
    reviews: [review],
    users: [
      {
        id: "admin-e6-existing",
        email: "existing.admin@example.com",
        name: "Existing Admin",
        role: UserRole.ADMIN,
      },
    ],
  });
  const client = makeClient(store);
  const hiddenAt = new Date("2026-09-21T20:10:00.000Z");
  const republishedAt = new Date("2026-09-21T20:20:00.000Z");

  const hidden = await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "HIDDEN",
      expectedUpdatedAt: review.updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: hiddenAt, prismaClient: client },
  );

  assert.equal(hidden.moderationStatus, "HIDDEN");
  assert.equal(store.reviews[0].publishedAt?.toISOString(), firstPublication.toISOString());
  assert.equal(store.reviews[0].moderatedAt?.toISOString(), hiddenAt.toISOString());

  const republished = await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "PUBLISHED",
      expectedUpdatedAt: store.reviews[0].updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: republishedAt, prismaClient: client },
  );

  assert.equal(republished.moderationStatus, "PUBLISHED");
  assert.equal(store.reviews[0].publishedAt?.toISOString(), firstPublication.toISOString());
  assert.equal(store.reviews[0].moderatedAt?.toISOString(), republishedAt.toISOString());
  assert.equal(store.auditLogs.length, 2);
});

test("E.6 moderation repairs anomalous HIDDEN reviews without publishedAt on republish", async () => {
  const review = buildReview({
    moderationStatus: ReviewModerationStatus.HIDDEN,
    publishedAt: null,
  });
  const store = createStore({ reviews: [review] });
  const client = makeClient(store);

  const updated = await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "PUBLISHED",
      expectedUpdatedAt: review.updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: E6_NOW, prismaClient: client },
  );

  assert.equal(updated.moderationStatus, "PUBLISHED");
  assert.equal(updated.publishedAt, E6_NOW.toISOString());
  assert.equal(store.reviews[0].publishedAt?.toISOString(), E6_NOW.toISOString());
});

test("E.6 moderation rejects invalid transitions without mutation or audit evidence", async () => {
  for (const [status, targetStatus, expectedCode] of [
    [ReviewModerationStatus.PENDING, "HIDDEN", "ADMIN_REVIEW_INVALID_TRANSITION"],
    [ReviewModerationStatus.PUBLISHED, "PUBLISHED", "ADMIN_REVIEW_INVALID_TRANSITION"],
    [ReviewModerationStatus.HIDDEN, "HIDDEN", "ADMIN_REVIEW_INVALID_TRANSITION"],
    [ReviewModerationStatus.PUBLISHED, "PENDING", "INVALID_ADMIN_REVIEW_REQUEST"],
  ] as const) {
    const review = buildReview({
      moderationStatus: status,
      publishedAt:
        status === ReviewModerationStatus.PENDING
          ? null
          : new Date("2026-09-21T18:30:00.000Z"),
    });
    const before = stableReviewContent(review);
    const store = createStore({ reviews: [review] });

    await assertAdminReviewError(
      moderateAdminReview(
        {
          reviewId: review.id,
          targetStatus: targetStatus as "PUBLISHED",
          expectedUpdatedAt: review.updatedAt.toISOString(),
        },
        ADMIN_ACTOR,
        { now: E6_NOW, prismaClient: makeClient(store) },
      ),
      expectedCode,
    );

    assert.equal(store.reviews[0].moderationStatus, status);
    assert.deepEqual(stableReviewContent(store.reviews[0]), before);
    assert.equal(store.auditLogs.length, 0);
  }
});

test("E.6 moderation enforces expectedUpdatedAt and updateMany concurrency fences", async () => {
  const review = buildReview();
  const mismatchStore = createStore({ reviews: [cloneReview(review)] });

  await assertAdminReviewError(
    moderateAdminReview(
      {
        reviewId: review.id,
        targetStatus: "PUBLISHED",
        expectedUpdatedAt: new Date("2026-09-21T19:59:59.000Z").toISOString(),
      },
      ADMIN_ACTOR,
      { now: E6_NOW, prismaClient: makeClient(mismatchStore) },
    ),
    "ADMIN_REVIEW_STALE",
  );
  assert.equal(mismatchStore.reviews[0].moderationStatus, ReviewModerationStatus.PENDING);
  assert.equal(mismatchStore.auditLogs.length, 0);

  const updateRaceStore = createStore({ reviews: [cloneReview(review)] });
  await assertAdminReviewError(
    moderateAdminReview(
      {
        reviewId: review.id,
        targetStatus: "PUBLISHED",
        expectedUpdatedAt: review.updatedAt.toISOString(),
      },
      ADMIN_ACTOR,
      {
        now: E6_NOW,
        prismaClient: makeClient(updateRaceStore, { staleUpdateManyOnce: true }),
      },
    ),
    "ADMIN_REVIEW_STALE",
  );
  assert.equal(updateRaceStore.reviews[0].moderationStatus, ReviewModerationStatus.PENDING);
  assert.equal(updateRaceStore.auditLogs.length, 0);

  const conflictStore = createStore({ reviews: [cloneReview(review)] });
  await assertAdminReviewError(
    moderateAdminReview(
      {
        reviewId: review.id,
        targetStatus: "PUBLISHED",
        expectedUpdatedAt: review.updatedAt.toISOString(),
      },
      ADMIN_ACTOR,
      {
        now: E6_NOW,
        prismaClient: makeClient(conflictStore, {
          throwP2034OnTransaction: true,
        }),
      },
    ),
    "ADMIN_REVIEW_STALE",
  );
});

test("E.6 admin listing uses DB-backed filters, bounded pagination, deterministic order and safe DTOs", async () => {
  const reviews = Array.from({ length: 23 }, (_, index) =>
    buildReview({
      id: `review-e6-pending-${String(index).padStart(2, "0")}`,
      reservationId: `reservation-e6-pending-${index}`,
      submittedAt: new Date(`2026-09-21T${String(10 + Math.floor(index / 2)).padStart(2, "0")}:${String(index % 2).padStart(2, "0")}:00.000Z`),
      updatedAt: new Date(`2026-09-21T${String(10 + Math.floor(index / 2)).padStart(2, "0")}:${String(index % 2).padStart(2, "0")}:00.000Z`),
    }),
  );

  reviews.push(
    buildReview({
      id: "review-e6-published",
      reservationId: "reservation-e6-published",
      propertyId: "perfect-retreat-bungalow",
      moderationStatus: ReviewModerationStatus.PUBLISHED,
      publishedAt: new Date("2026-09-21T19:00:00.000Z"),
    }),
    buildReview({
      id: "review-e6-hidden",
      reservationId: "reservation-e6-hidden",
      propertyId: "complete-retreat",
      moderationStatus: ReviewModerationStatus.HIDDEN,
    }),
  );

  const data = await getAdminReviewsPage(
    { status: "PENDING", page: 1 },
    { prismaClient: makeClient(createStore({ reviews })) },
  );
  const propertyFiltered = await getAdminReviewsPage(
    { propertyId: "perfect-retreat-bungalow", page: 99 },
    { prismaClient: makeClient(createStore({ reviews })) },
  );
  const firstRow = data.reviews[0];
  const serialized = JSON.stringify(firstRow);

  assert.equal(data.pagination.pageSize, 20);
  assert.equal(data.pagination.totalItems, 23);
  assert.equal(data.reviews.length, 20);
  assert.equal(data.reviews[0].id > data.reviews[1].id, true);
  assert.equal(propertyFiltered.pagination.page, 1);
  assert.equal(propertyFiltered.reviews.length, 1);
  assert.equal(propertyFiltered.reviews[0].id, "review-e6-published");
  assertExactKeys(firstRow, [
    "id",
    "reservationId",
    "rating",
    "comment",
    "guestDisplayName",
    "moderationStatus",
    "submittedAt",
    "publishedAt",
    "moderatedAt",
    "updatedAt",
    "property",
    "moderatedByAdmin",
  ]);
  assert.doesNotMatch(serialized, /ReviewInvitation|token|guestEmail|guestPhone|provider|payment|refund|total/i);
});

test("E.6 public query returns only PUBLISHED active-property reviews with safe DTOs and bounded pagination", async () => {
  const plainTextComment = "<strong>Great stay</strong>\n<script>alert(1)</script>";
  const reviews = Array.from({ length: 14 }, (_, index) =>
    buildReview({
      id: `review-secret-public-${String(index).padStart(2, "0")}`,
      reservationId: `reservation-secret-public-${index}`,
      moderationStatus: ReviewModerationStatus.PUBLISHED,
      comment: index === 0 ? plainTextComment : `Visible review ${index}`,
      submittedAt: new Date(`2026-09-21T${String(19 - Math.floor(index / 2)).padStart(2, "0")}:${String(index % 2).padStart(2, "0")}:00.000Z`),
    }),
  );
  const store = createStore({
    properties: [
      buildProperty({
        id: "black-white-apartment",
        slug: "apartamento-publico",
      }),
      buildProperty({
        id: "inactive-property",
        slug: "inactive-property",
        status: PropertyStatus.INACTIVE,
      }),
      buildProperty({
        id: "deleted-property",
        slug: "deleted-property",
        deletedAt: new Date("2026-09-21T00:00:00.000Z"),
      }),
    ],
    reviews: [
      ...reviews,
      buildReview({
        id: "review-pending-hidden-from-public",
        reservationId: "reservation-pending-hidden-from-public",
        moderationStatus: ReviewModerationStatus.PENDING,
      }),
      buildReview({
        id: "review-hidden-hidden-from-public",
        reservationId: "reservation-hidden-hidden-from-public",
        moderationStatus: ReviewModerationStatus.HIDDEN,
      }),
      buildReview({
        id: "review-inactive-hidden-from-public",
        reservationId: "reservation-inactive-hidden-from-public",
        propertyId: "inactive-property",
        moderationStatus: ReviewModerationStatus.PUBLISHED,
      }),
      buildReview({
        id: "review-deleted-hidden-from-public",
        reservationId: "reservation-deleted-hidden-from-public",
        propertyId: "deleted-property",
        moderationStatus: ReviewModerationStatus.PUBLISHED,
      }),
    ],
  });
  const client = makeClient(store);
  const pageOne = await getPublishedReviews({ page: 1 }, { prismaClient: client });
  const pageTwo = await getPublishedReviews({ page: 2 }, { prismaClient: client });
  const invalidPage = await getPublishedReviews({ page: -1 }, { prismaClient: client });
  const outOfRangePage = await getPublishedReviews({ page: 99 }, { prismaClient: client });
  const serialized = JSON.stringify(pageOne);
  const firstReview = pageOne.reviews.find(
    (review) => review.comment === plainTextComment,
  );

  assert.equal(pageOne.pagination.pageSize, 12);
  assert.equal(pageOne.pagination.totalItems, 14);
  assert.equal(pageOne.reviews.length, 12);
  assert.equal(pageTwo.reviews.length, 2);
  assert.equal(invalidPage.pagination.page, 1);
  assert.equal(outOfRangePage.pagination.page, 2);
  assert.ok(firstReview);
  assert.equal(firstReview.comment, plainTextComment);
  assertExactKeys(pageOne.reviews[0], [
    "rating",
    "comment",
    "submittedAt",
    "guestDisplayName",
    "property",
  ]);
  assertExactKeys(pageOne.reviews[0].property, ["nameEs", "nameEn", "slug"]);
  assert.doesNotMatch(serialized, /review-secret-public|reservation-secret-public|propertyId|moderatedAt|moderatedByAdminId|updatedAt|token|guestEmail|guestPhone|payment|refund/i);
  assert.equal(serialized.includes("review-pending-hidden-from-public"), false);
  assert.equal(serialized.includes("review-hidden-hidden-from-public"), false);
  assert.equal(serialized.includes("inactive-property"), false);
  assert.equal(serialized.includes("deleted-property"), false);
});

test("E.6 public rendering keeps comments as plain text and links only to public accommodations", () => {
  const source = readFileSync(
    path.join(ROOT, "features/reviews/components/public-reviews-page.tsx"),
    "utf8",
  );

  assert.match(source, /whitespace-pre-wrap/);
  assert.match(source, /\{review\.comment\}/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|Markdown|markdown|parseHTML|html-react-parser|marked|remark/i);
  assert.match(source, /\/alojamientos\//);
  assert.doesNotMatch(source, /\/admin|reservationId|reviewInvitation|token/i);
});

test("E.6 moderation API, navigation and destructive-source boundaries stay inside accepted scope", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const vercelConfig = JSON.parse(
    readFileSync(path.join(ROOT, "vercel.json"), "utf8"),
  ) as { crons?: unknown[] };
  const moderationRoute = readFileSync(
    path.join(ROOT, "app/api/admin/reviews/[reviewId]/moderation/route.ts"),
    "utf8",
  );
  const adminShell = readFileSync(
    path.join(ROOT, "features/admin/components/admin-shell.tsx"),
    "utf8",
  );
  const siteHeader = readFileSync(
    path.join(ROOT, "components/layout/site-header.tsx"),
    "utf8",
  );
  const e6RuntimeSources = [
    "lib/admin/reviews.ts",
    "lib/reviews/public-reviews.ts",
    "app/admin/reviews/page.tsx",
    "features/admin/components/admin-reviews-page.tsx",
    "app/api/admin/reviews/[reviewId]/moderation/route.ts",
    "app/resenas/page.tsx",
    "features/reviews/components/public-reviews-page.tsx",
  ]
    .map((relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8"))
    .join("\n");

  assert.match(moderationRoute, /getAdminSessionActor/);
  assert.match(moderationRoute, /isValidAdminMutationOrigin/);
  assert.match(moderationRoute, /export async function PATCH/);
  assert.doesNotMatch(moderationRoute, /export async function (POST|PUT|DELETE)/);
  assert.equal(
    existsSync(
      path.join(ROOT, "app/api/reviews/[token]/moderation/route.ts"),
    ),
    false,
  );
  assert.match(adminShell, /href: "\/admin\/reviews"/);
  assert.match(adminShell, /key: "reviews"/);
  assert.doesNotMatch(adminShell, /Reviews|Reseñas/);
  assert.equal(esMessages.admin.navigation.items.reviews, "Reseñas");
  assert.equal(enMessages.admin.navigation.items.reviews, "Reviews");
  assert.equal(
    esMessages.navigation.items.some((item) => item.href === "/resenas"),
    true,
  );
  assert.equal(
    enMessages.navigation.items.some((item) => item.href === "/resenas"),
    true,
  );
  assert.doesNotMatch(siteHeader, /Reviews|Reseñas/);
  assert.equal(packageJson.scripts["final-e:validate"], undefined);
  assert.deepEqual(vercelConfig.crons, []);
  assert.equal(existsSync(path.join(ROOT, "app/resenas/[token]/page.tsx")), true);
  assert.equal(existsSync(path.join(ROOT, "app/api/reviews/[token]/route.ts")), true);
  assert.equal(existsSync(path.join(ROOT, "app/resenas/page.tsx")), true);
  assert.equal(existsSync(path.join(ROOT, "app/admin/reviews/page.tsx")), true);
  assert.doesNotMatch(e6RuntimeSources, /review\.delete|review\.deleteMany|export async function DELETE/);
  assert.doesNotMatch(e6RuntimeSources, /ReviewInvitation|reviewInvitation|EmailNotification|emailNotification|sendEmail|processEmail/i);
});

test("E.6 moderation changes only moderation metadata and never rewrites guest review content", async () => {
  const review = buildReview({
    rating: 4,
    comment: "Byte-for-byte guest comment\nwith two lines",
    guestDisplayName: "Carlos R.",
  });
  const store = createStore({ reviews: [review] });
  const client = makeClient(store);
  const stableBefore = stableReviewContent(review);

  await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "PUBLISHED",
      expectedUpdatedAt: review.updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: new Date("2026-09-21T20:01:00.000Z"), prismaClient: client },
  );
  await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "HIDDEN",
      expectedUpdatedAt: store.reviews[0].updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: new Date("2026-09-21T20:02:00.000Z"), prismaClient: client },
  );
  await moderateAdminReview(
    {
      reviewId: review.id,
      targetStatus: "PUBLISHED",
      expectedUpdatedAt: store.reviews[0].updatedAt.toISOString(),
    },
    ADMIN_ACTOR,
    { now: new Date("2026-09-21T20:03:00.000Z"), prismaClient: client },
  );

  assert.deepEqual(stableReviewContent(store.reviews[0]), stableBefore);
  assert.equal(store.reviews[0].moderationStatus, ReviewModerationStatus.PUBLISHED);
  assert.equal(store.auditLogs.length, 3);
});
