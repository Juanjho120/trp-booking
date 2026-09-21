import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  PropertyStatus,
  ReservationStatus,
  ReviewInvitationStatus,
  ReviewModerationStatus,
} from "@prisma/client";

import { test } from "./harness";

const ROOT = process.cwd();
const FINAL_E_VALIDATE_SCRIPT =
  "tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts";
const E7_NOW = new Date("2026-09-21T21:00:00.000Z");
const E7_RAW_TOKEN = "fedcba9876543210".repeat(4);
const E7_TOKEN_HASH = hashToken(E7_RAW_TOKEN);

type IntegratedProperty = {
  id: string;
  nameEs: string;
  nameEn: string;
  slug: string;
  status: PropertyStatus;
  deletedAt: Date | null;
};

type IntegratedReservation = {
  id: string;
  propertyId: string;
  status: ReservationStatus;
  confirmedAt: Date;
  cancelledAt: Date | null;
  guestName: string;
  guestEmail: string;
  preferredLocale: string;
  checkoutAt: Date;
  eligibleAt: Date;
  reviewId: string | null;
};

type IntegratedInvitation = {
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

type IntegratedNotification = {
  id: string;
  reservationId: string;
  reviewInvitationId: string;
  type: EmailNotificationType;
  recipient: string;
  locale: string;
  deduplicationKey: string;
  origin: EmailNotificationOrigin;
  status: EmailNotificationStatus;
  createdAt: Date;
  updatedAt: Date;
};

type IntegratedReview = {
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

type IntegratedAuditLog = {
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string>;
};

type IntegratedStore = {
  properties: IntegratedProperty[];
  reservations: IntegratedReservation[];
  invitations: IntegratedInvitation[];
  notifications: IntegratedNotification[];
  reviews: IntegratedReview[];
  auditLogs: IntegratedAuditLog[];
};

type EnsureResult = Readonly<{
  outcome: "created" | "existing";
  invitationId: string;
  emailIntentCreated: boolean;
  privateReviewUrl: string;
}>;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

function cloneNullableDate(value: Date | null): Date | null {
  return value ? cloneDate(value) : null;
}

function createIntegratedStore(): IntegratedStore {
  const property: IntegratedProperty = {
    id: "property-e7-1",
    nameEs: "Bungalow del Lago",
    nameEn: "Lake Bungalow",
    slug: "bungalow-del-lago",
    status: PropertyStatus.ACTIVE,
    deletedAt: null,
  };
  const reservation: IntegratedReservation = {
    id: "reservation-e7-1",
    propertyId: property.id,
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-09-18T16:00:00.000Z"),
    cancelledAt: null,
    guestName: "Juana Garcia",
    guestEmail: "Guest.E7@Example.com",
    preferredLocale: "es",
    checkoutAt: new Date("2026-09-21T17:00:00.000Z"),
    eligibleAt: new Date("2026-09-21T19:00:00.000Z"),
    reviewId: null,
  };

  return {
    properties: [property],
    reservations: [reservation],
    invitations: [],
    notifications: [],
    reviews: [],
    auditLogs: [],
  };
}

function snapshotStore(store: IntegratedStore): IntegratedStore {
  return {
    properties: store.properties.map((property) => ({
      ...property,
      deletedAt: cloneNullableDate(property.deletedAt),
    })),
    reservations: store.reservations.map((reservation) => ({
      ...reservation,
      confirmedAt: cloneDate(reservation.confirmedAt),
      cancelledAt: cloneNullableDate(reservation.cancelledAt),
      checkoutAt: cloneDate(reservation.checkoutAt),
      eligibleAt: cloneDate(reservation.eligibleAt),
    })),
    invitations: store.invitations.map((invitation) => ({
      ...invitation,
      checkoutAtSnapshot: cloneDate(invitation.checkoutAtSnapshot),
      eligibleAt: cloneDate(invitation.eligibleAt),
      expiresAt: cloneDate(invitation.expiresAt),
      consumedAt: cloneNullableDate(invitation.consumedAt),
      createdAt: cloneDate(invitation.createdAt),
      updatedAt: cloneDate(invitation.updatedAt),
    })),
    notifications: store.notifications.map((notification) => ({
      ...notification,
      createdAt: cloneDate(notification.createdAt),
      updatedAt: cloneDate(notification.updatedAt),
    })),
    reviews: store.reviews.map((review) => ({
      ...review,
      submittedAt: cloneDate(review.submittedAt),
      publishedAt: cloneNullableDate(review.publishedAt),
      moderatedAt: cloneNullableDate(review.moderatedAt),
      createdAt: cloneDate(review.createdAt),
      updatedAt: cloneDate(review.updatedAt),
    })),
    auditLogs: store.auditLogs.map((auditLog) => ({
      ...auditLog,
      metadata: { ...auditLog.metadata },
    })),
  };
}

function restoreStore(store: IntegratedStore, snapshot: IntegratedStore): void {
  store.properties = snapshot.properties;
  store.reservations = snapshot.reservations;
  store.invitations = snapshot.invitations;
  store.notifications = snapshot.notifications;
  store.reviews = snapshot.reviews;
  store.auditLogs = snapshot.auditLogs;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function findReservation(store: IntegratedStore): IntegratedReservation {
  const reservation = store.reservations[0];

  assert.ok(reservation);

  return reservation;
}

function findProperty(
  store: IntegratedStore,
  propertyId: string,
): IntegratedProperty {
  const property = store.properties.find(
    (candidate) => candidate.id === propertyId,
  );

  assert.ok(property);

  return property;
}

function recoverRawTokenFromEncryptedCopy(encryptedToken: string | null): string {
  assert.equal(encryptedToken, "encrypted-review-invitation-e7-token");

  return E7_RAW_TOKEN;
}

function buildPrivateReviewUrl(invitation: IntegratedInvitation): string {
  const rawToken = recoverRawTokenFromEncryptedCopy(
    invitation.accessTokenEncrypted,
  );

  assert.equal(hashToken(rawToken), invitation.accessTokenHash);

  return `/resenas/${rawToken}`;
}

function assertPersistedStateDoesNotContainRawToken(
  store: IntegratedStore,
): void {
  const persisted = JSON.stringify(store);

  assert.equal(persisted.includes(E7_RAW_TOKEN), false);
  assert.equal(persisted.includes(`/resenas/${E7_RAW_TOKEN}`), false);
}

function ensureInvitationAndEmailIntent(
  store: IntegratedStore,
  options: Readonly<{ failEmailIntent?: boolean }> = {},
): EnsureResult {
  const snapshot = snapshotStore(store);

  try {
    const reservation = findReservation(store);

    assert.equal(reservation.status, ReservationStatus.CONFIRMED);
    assert.equal(reservation.reviewId, null);
    assert.equal(reservation.cancelledAt, null);
    assert.equal(reservation.eligibleAt <= E7_NOW, true);

    let invitation =
      store.invitations.find(
        (candidate) => candidate.reservationId === reservation.id,
      ) ?? null;
    let outcome: EnsureResult["outcome"] = "existing";

    if (!invitation) {
      invitation = {
        id: "review-invitation-e7-1",
        reservationId: reservation.id,
        status: ReviewInvitationStatus.ACTIVE,
        accessTokenHash: E7_TOKEN_HASH,
        accessTokenEncrypted: "encrypted-review-invitation-e7-token",
        checkoutAtSnapshot: cloneDate(reservation.checkoutAt),
        eligibleAt: cloneDate(reservation.eligibleAt),
        expiresAt: new Date("2026-10-21T21:00:00.000Z"),
        consumedAt: null,
        createdAt: cloneDate(E7_NOW),
        updatedAt: cloneDate(E7_NOW),
      };
      store.invitations.push(invitation);
      outcome = "created";
    }

    const deduplicationKey = `review-invitation/${invitation.id}/${normalizeEmail(
      reservation.guestEmail,
    )}`;
    let notification =
      store.notifications.find(
        (candidate) => candidate.deduplicationKey === deduplicationKey,
      ) ?? null;

    if (!notification) {
      if (options.failEmailIntent) {
        throw new Error("EMAIL_INTENT_FAILED");
      }

      notification = {
        id: "review-notification-e7-1",
        reservationId: reservation.id,
        reviewInvitationId: invitation.id,
        type: EmailNotificationType.REVIEW_INVITATION,
        recipient: normalizeEmail(reservation.guestEmail),
        locale: reservation.preferredLocale,
        deduplicationKey,
        origin: EmailNotificationOrigin.AUTOMATIC,
        status: EmailNotificationStatus.PENDING,
        createdAt: cloneDate(E7_NOW),
        updatedAt: cloneDate(E7_NOW),
      };
      store.notifications.push(notification);

      return {
        outcome,
        invitationId: invitation.id,
        emailIntentCreated: true,
        privateReviewUrl: buildPrivateReviewUrl(invitation),
      };
    }

    return {
      outcome,
      invitationId: invitation.id,
      emailIntentCreated: false,
      privateReviewUrl: buildPrivateReviewUrl(invitation),
    };
  } catch (error) {
    restoreStore(store, snapshot);
    throw error;
  }
}

function deriveGuestDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/u);

  assert.ok(parts.length > 0);

  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts.at(-1)?.[0]}.`;
}

function submitReview(
  store: IntegratedStore,
  rawToken: string,
  input: Readonly<{ rating: number; comment: string }>,
): "submitted" | "already-submitted" {
  const invitation =
    store.invitations.find(
      (candidate) => candidate.accessTokenHash === hashToken(rawToken),
    ) ?? null;

  assert.ok(invitation);

  const reservation = findReservation(store);
  const existingReview = store.reviews.find(
    (review) => review.reservationId === reservation.id,
  );

  if (invitation.status === ReviewInvitationStatus.CONSUMED && existingReview) {
    return "already-submitted";
  }

  assert.equal(invitation.status, ReviewInvitationStatus.ACTIVE);
  assert.equal(invitation.expiresAt > E7_NOW, true);
  assert.equal(reservation.reviewId, null);
  assert.equal(Number.isInteger(input.rating), true);
  assert.equal(input.rating >= 1 && input.rating <= 5, true);

  const comment = input.comment.trim();

  assert.equal(comment.length >= 1 && comment.length <= 2_000, true);

  const review: IntegratedReview = {
    id: "review-e7-1",
    reservationId: reservation.id,
    propertyId: reservation.propertyId,
    rating: input.rating,
    comment,
    guestDisplayName: deriveGuestDisplayName(reservation.guestName),
    moderationStatus: ReviewModerationStatus.PENDING,
    submittedAt: cloneDate(E7_NOW),
    publishedAt: null,
    moderatedAt: null,
    moderatedByAdminId: null,
    createdAt: cloneDate(E7_NOW),
    updatedAt: cloneDate(E7_NOW),
  };

  store.reviews.push(review);
  reservation.reviewId = review.id;
  invitation.status = ReviewInvitationStatus.CONSUMED;
  invitation.consumedAt = cloneDate(E7_NOW);
  invitation.accessTokenEncrypted = null;
  invitation.updatedAt = cloneDate(E7_NOW);

  return "submitted";
}

function moderateReview(
  store: IntegratedStore,
  targetStatus: ReviewModerationStatus.PUBLISHED | ReviewModerationStatus.HIDDEN,
): void {
  const review = store.reviews[0];

  assert.ok(review);

  const previousStatus = review.moderationStatus;
  const allowed =
    (previousStatus === ReviewModerationStatus.PENDING &&
      targetStatus === ReviewModerationStatus.PUBLISHED) ||
    (previousStatus === ReviewModerationStatus.PUBLISHED &&
      targetStatus === ReviewModerationStatus.HIDDEN) ||
    (previousStatus === ReviewModerationStatus.HIDDEN &&
      targetStatus === ReviewModerationStatus.PUBLISHED);

  assert.equal(allowed, true);

  review.moderationStatus = targetStatus;
  review.publishedAt =
    targetStatus === ReviewModerationStatus.PUBLISHED
      ? review.publishedAt ?? cloneDate(E7_NOW)
      : review.publishedAt;
  review.moderatedAt = cloneDate(E7_NOW);
  review.moderatedByAdminId = "admin-e7";
  review.updatedAt = cloneDate(E7_NOW);

  store.auditLogs.push({
    action: "REVIEW_MODERATION_STATUS_CHANGED",
    entityType: "Review",
    entityId: review.id,
    metadata: {
      reviewId: review.id,
      reservationId: review.reservationId,
      previousStatus,
      newStatus: targetStatus,
      moderatedAt: E7_NOW.toISOString(),
    },
  });
}

function getPublicReviews(store: IntegratedStore) {
  return store.reviews
    .filter((review) => {
      const property = findProperty(store, review.propertyId);

      return (
        review.moderationStatus === ReviewModerationStatus.PUBLISHED &&
        property.status === PropertyStatus.ACTIVE &&
        property.deletedAt === null
      );
    })
    .map((review) => {
      const property = findProperty(store, review.propertyId);

      return {
        rating: review.rating,
        comment: review.comment,
        submittedAt: review.submittedAt.toISOString(),
        guestDisplayName: review.guestDisplayName,
        property: {
          nameEs: property.nameEs,
          nameEn: property.nameEn,
          slug: property.slug,
        },
      };
    });
}

function assertExactKeys(value: object, expected: readonly string[]): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}

function collectRouteFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((name) => {
    const current = path.join(directory, name);

    if (statSync(current).isDirectory()) {
      return collectRouteFiles(current);
    }

    return name === "route.ts" ? [current] : [];
  });
}

test("E.7 integrated lifecycle proves invitation, email intent, private submission and public moderation stay coherent", () => {
  const store = createIntegratedStore();
  const scheduled = ensureInvitationAndEmailIntent(store);

  assert.equal(scheduled.outcome, "created");
  assert.equal(scheduled.emailIntentCreated, true);
  assert.equal(scheduled.privateReviewUrl, `/resenas/${E7_RAW_TOKEN}`);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].type, EmailNotificationType.REVIEW_INVITATION);
  assert.equal(store.notifications[0].status, EmailNotificationStatus.PENDING);
  assertPersistedStateDoesNotContainRawToken(store);

  const retry = ensureInvitationAndEmailIntent(store);

  assert.equal(retry.outcome, "existing");
  assert.equal(retry.emailIntentCreated, false);
  assert.equal(retry.privateReviewUrl, scheduled.privateReviewUrl);
  assert.equal(store.invitations.length, 1);
  assert.equal(store.notifications.length, 1);

  const submitted = submitReview(store, E7_RAW_TOKEN, {
    rating: 5,
    comment: "  Excelente estadía, gracias  ",
  });
  const replay = submitReview(store, E7_RAW_TOKEN, {
    rating: 1,
    comment: "No debe editar",
  });
  const review = store.reviews[0];
  const stableGuestContent = {
    rating: review.rating,
    comment: review.comment,
    guestDisplayName: review.guestDisplayName,
    submittedAt: review.submittedAt.toISOString(),
  };

  assert.equal(submitted, "submitted");
  assert.equal(replay, "already-submitted");
  assert.equal(store.reviews.length, 1);
  assert.equal(review.moderationStatus, ReviewModerationStatus.PENDING);
  assert.equal(review.comment, "Excelente estadía, gracias");
  assert.equal(review.guestDisplayName, "Juana G.");
  assert.equal(store.invitations[0].status, ReviewInvitationStatus.CONSUMED);
  assert.equal(store.invitations[0].accessTokenEncrypted, null);
  assert.equal(getPublicReviews(store).length, 0);

  moderateReview(store, ReviewModerationStatus.PUBLISHED);
  const published = getPublicReviews(store);

  assert.equal(published.length, 1);
  assertExactKeys(published[0], [
    "rating",
    "comment",
    "submittedAt",
    "guestDisplayName",
    "property",
  ]);
  assertExactKeys(published[0].property, ["nameEs", "nameEn", "slug"]);
  assert.equal(JSON.stringify(published).includes("reservation-e7-1"), false);
  assert.equal(JSON.stringify(published).includes("review-e7-1"), false);

  moderateReview(store, ReviewModerationStatus.HIDDEN);
  assert.equal(getPublicReviews(store).length, 0);

  moderateReview(store, ReviewModerationStatus.PUBLISHED);
  assert.equal(getPublicReviews(store).length, 1);
  assert.deepEqual(
    {
      rating: review.rating,
      comment: review.comment,
      guestDisplayName: review.guestDisplayName,
      submittedAt: review.submittedAt.toISOString(),
    },
    stableGuestContent,
  );

  const auditEvidence = JSON.stringify(store.auditLogs);

  assert.equal(auditEvidence.includes(review.comment), false);
  assert.equal(auditEvidence.includes("Guest.E7@Example.com"), false);
  assert.equal(auditEvidence.includes(E7_RAW_TOKEN), false);
  assertPersistedStateDoesNotContainRawToken(store);
});

test("E.7 integrated lifecycle rolls back ReviewInvitation and email intent together on intent failure", () => {
  const store = createIntegratedStore();

  assert.throws(
    () => ensureInvitationAndEmailIntent(store, { failEmailIntent: true }),
    /EMAIL_INTENT_FAILED/,
  );
  assert.equal(store.invitations.length, 0);
  assert.equal(store.notifications.length, 0);
  assert.equal(store.reviews.length, 0);
  assertPersistedStateDoesNotContainRawToken(store);
});

test("E.7 source contract locks the permanent gate, accepted routes, Vercel boundary and prohibited review surfaces", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const vercelConfig = JSON.parse(
    readFileSync(path.join(ROOT, "vercel.json"), "utf8"),
  ) as { crons?: unknown[] };
  const reviewRoute = readFileSync(
    path.join(ROOT, "app/api/reviews/[token]/route.ts"),
    "utf8",
  );
  const moderationRoute = readFileSync(
    path.join(ROOT, "app/api/admin/reviews/[reviewId]/moderation/route.ts"),
    "utf8",
  );
  const reviewRouteFiles = [
    ...collectRouteFiles(path.join(ROOT, "app/api/reviews")),
    ...collectRouteFiles(path.join(ROOT, "app/api/admin/reviews")),
  ];
  const routeSources = reviewRouteFiles
    .map((routeFile) => readFileSync(routeFile, "utf8"))
    .join("\n");
  const finalERuntimeSources = [
    "app/api/cron/schedule-review-invitations/route.ts",
    "app/resenas/[token]/page.tsx",
    "app/api/reviews/[token]/route.ts",
    "app/resenas/page.tsx",
    "app/admin/reviews/page.tsx",
    "app/api/admin/reviews/[reviewId]/moderation/route.ts",
    "emails/review-invitation-email.tsx",
    "emails/review-invitation-template-data.ts",
    "features/reviews/components/review-submission-page.tsx",
    "features/reviews/components/public-reviews-page.tsx",
    "lib/email/review-invitation-notifications.ts",
    "lib/reviews/review-submission.ts",
    "lib/reviews/public-reviews.ts",
  ]
    .map((relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8"))
    .join("\n");

  assert.equal(packageJson.scripts["final-e:validate"], FINAL_E_VALIDATE_SCRIPT);
  assert.deepEqual(vercelConfig.crons, []);
  assert.equal(existsSync(path.join(ROOT, "app/resenas/[token]/page.tsx")), true);
  assert.equal(existsSync(path.join(ROOT, "app/api/reviews/[token]/route.ts")), true);
  assert.equal(existsSync(path.join(ROOT, "app/resenas/page.tsx")), true);
  assert.equal(existsSync(path.join(ROOT, "app/admin/reviews/page.tsx")), true);
  assert.equal(
    existsSync(
      path.join(
        ROOT,
        "app/api/admin/reviews/[reviewId]/moderation/route.ts",
      ),
    ),
    true,
  );
  assert.match(reviewRoute, /export async function POST/);
  assert.doesNotMatch(reviewRoute, /export async function (PATCH|PUT|DELETE)/);
  assert.match(moderationRoute, /export async function PATCH/);
  assert.doesNotMatch(moderationRoute, /export async function (POST|PUT|DELETE)/);
  assert.equal(
    existsSync(path.join(ROOT, "app/api/admin/reviews/[reviewId]/route.ts")),
    false,
  );
  assert.equal(
    existsSync(
      path.join(ROOT, "app/api/admin/reviews/[reviewId]/content/route.ts"),
    ),
    false,
  );
  assert.equal(
    existsSync(path.join(ROOT, "app/api/reviews/[token]/edit/route.ts")),
    false,
  );
  assert.doesNotMatch(routeSources, /export async function DELETE/);
  assert.doesNotMatch(routeSources, /review\.delete|review\.deleteMany/);
  assert.doesNotMatch(finalERuntimeSources, /twilio|whatsapp/i);
});

test("E.7 permanent gate remains deterministic, non-destructive and provider-safe", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const runSource = readFileSync(
    path.join(ROOT, "tests/final-e/run.ts"),
    "utf8",
  );
  const integratedSource = readFileSync(
    path.join(ROOT, "tests/final-e/integrated-acceptance.test.ts"),
    "utf8",
  );
  const integratedImports = integratedSource
    .split("\n")
    .filter((line) => line.startsWith("import "))
    .join("\n");
  const migrations = readdirSync(path.join(ROOT, "prisma/migrations")).filter(
    (name) => statSync(path.join(ROOT, "prisma/migrations", name)).isDirectory(),
  );

  assert.equal(packageJson.scripts["final-e:validate"], FINAL_E_VALIDATE_SCRIPT);
  assert.match(runSource, /integrated-acceptance\.test/);
  assert.equal(migrations.length, 22);
  assert.doesNotMatch(
    packageJson.scripts["final-e:validate"],
    /prisma|migrate|next build|eslint|resend|curl|fetch/i,
  );
  assert.doesNotMatch(
    integratedImports,
    /@\/lib\/db\/prisma|resend-provider|EmailProvider/,
  );
  assert.equal(integratedSource.includes("fetch" + "("), false);
  assert.equal(integratedSource.includes("process" + ".env"), false);
});
