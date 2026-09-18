# 187 - Final-E.2 Review Invitation Persistence Foundation and Migration

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E - Reservation reviews and post-checkout invitation
Subphase: Final-E.2 - Review/invitation persistence foundation and migration
Status: Implementation completed and validation executed; owner acceptance pending
Implementation date: 2026-09-18
Implementation base head: 2e1b26850c55364db8450fafc2bb35c6d89a2c3b
Accepted strategy: Final-E.1 at e83ad8443bd533715058e701769b10c2d5505436
Authoritative contract: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Foundation migration: 20260918173000_final_e_2_review_invitation_persistence_foundation
Corrective migration: 20260918183000_final_e_2_expand_review_guest_display_name
Migration count after E.2 correction: 21
Next subphase: Final-E.3 - Eligibility and invitation/token lifecycle foundation - Not started
Final-E.4 through Final-E.7: Not started
Final-F/G/H: Not started
Phase 13: Not started
```

## Scope Implemented

Final-E.2 adds the dormant persistence foundation required by the accepted Final-E.1 contract.

Implemented schema foundation:

```text
ReviewInvitationStatus:
  ACTIVE
  CONSUMED
  EXPIRED
  CANCELLED

ReviewModerationStatus:
  PENDING
  PUBLISHED
  HIDDEN

ReviewInvitation
Review
EmailNotification.reviewInvitationId
CronJobKey.SCHEDULE_REVIEW_INVITATIONS
EmailNotificationType.REVIEW_INVITATION
REVIEW_INVITATION crypto purpose/AAD
```

No operational guest-review behavior was activated.

## Persistence Details

`ReviewInvitation` is reservation-owned and stores the future one-time invitation lifecycle:

```text
reservationId UNIQUE
status
accessTokenHash UNIQUE
accessTokenEncrypted nullable
checkoutAtSnapshot
eligibleAt
expiresAt
consumedAt
createdAt
updatedAt
```

`Review` is reservation/property-owned durable business evidence:

```text
reservationId UNIQUE
propertyId
rating
comment
guestDisplayName VARCHAR(160)
moderationStatus
submittedAt
publishedAt
moderatedAt
moderatedByAdminId
createdAt
updatedAt
```

The nullable `EmailNotification.reviewInvitationId` relation is present only for the future E.4
delivery path. E.2 does not create `REVIEW_INVITATION` notification rows and does not connect the
email dispatcher to this type.

## Database Invariants

The E.2 migration is additive DDL only. It does not insert, update, delete or backfill historical
Reservation, Payment, Refund, EmailNotification, AdditionalCharge, ReviewInvitation or Review data.

The applied database inspection confirmed:

```text
Tables:
  review_invitations
  reviews

Enums:
  cron_job_key.SCHEDULE_REVIEW_INVITATIONS
  email_notification_type.REVIEW_INVITATION
  review_invitation_status ACTIVE / CONSUMED / EXPIRED / CANCELLED
  review_moderation_status PENDING / PUBLISHED / HIDDEN

ReviewInvitation constraints:
  access token hash must be lowercase 64-character hex
  encrypted token is nullable or non-blank
  expiresAt > createdAt
  eligibleAt >= checkoutAtSnapshot
  consumedAt is present if and only if status is CONSUMED
  reservation FK uses ON DELETE RESTRICT

Review constraints:
  reservationId UNIQUE
  property FK uses ON DELETE RESTRICT
  moderatedByAdmin FK uses ON DELETE SET NULL
  rating between 1 and 5
  trimmed comment length between 1 and 2000
  guestDisplayName non-blank

EmailNotification relation:
  reviewInvitationId nullable FK uses ON DELETE SET NULL

Migration count:
  21

Operational rows:
  review_invitations = 0
  reviews = 0
  REVIEW_INVITATION email_notifications = 0
  SCHEDULE_REVIEW_INVITATIONS cron executions = 0
```

## Independent Review Correction

An independent review found that the applied foundation schema used `Review.guestDisplayName` as
`VARCHAR(120)`. The accepted Final-E.1/E.2 contract requires `VARCHAR(160)`.

The already-applied foundation migration
`20260918173000_final_e_2_review_invitation_persistence_foundation` was not modified, rewritten,
deleted or reapplied. Final-E.2 adds the follow-up corrective migration
`20260918183000_final_e_2_expand_review_guest_display_name`, which expands only
`reviews.guest_display_name` to `VARCHAR(160)`.

No operational review data existed when the corrective migration was applied, and this correction
does not introduce runtime activation, review invitation creation, review submission, email
delivery, cron registration, admin moderation or public review presentation.

## Crypto Foundation

`lib/external-calendars/secret-crypto.ts` now includes a dedicated `REVIEW_INVITATION` purpose with
reservation-bound AAD:

```text
trp-booking:review-invitation:{reservationId}
```

Targeted validation confirmed:

```text
REVIEW_INVITATION round-trip succeeds with the matching reservationId.
REVIEW_INVITATION ciphertext cannot be decrypted with GUEST_PAYMENT_REQUEST purpose.
REVIEW_INVITATION ciphertext cannot be decrypted with another reservationId.
```

The payment token hash resolution and the `GUEST_PAYMENT_REQUEST` architecture were not changed.

## Explicitly Not Implemented

Final-E.2 does not include:

```text
runtime ReviewInvitation creation
runtime Review creation
REVIEW_INVITATION EmailNotification row creation
review invitation email rendering
review invitation email dispatcher support
cron registration in lib/cron/registry.ts
Vercel cron registration
public /resenas route
private guest review submission
admin review moderation UI
public published-review listing
npm run final-e:validate
Final-E.3, Final-E.4, Final-E.5, Final-E.6, Final-E.7
Final-F/G/H
Phase 13
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

## Validation

Executed validation:

```text
npm run db:format
PASS - Prisma formatted prisma/schema.prisma.

npm run db:generate
PASS - Prisma Client generated successfully.

npm run db:validate
PASS - Prisma schema is valid.

npm run db:migrate:deploy
PASS - 21 migrations found; applied corrective migration 20260918183000_final_e_2_expand_review_guest_display_name.

npm run db:migrate:status
PASS - 21 migrations found; database schema is up to date.

npx tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts
PASS - Final-E targeted validation 3/3.

Database inspection
PASS - migration count is 21; reviews.guest_display_name is character varying(160); no operational review/invitation/email/cron rows created.

npm run final-a:validate
PASS - 44/44.

npm run final-b:validate
PASS - 38/38.

npm run final-c:validate
PASS - 41/41.

npm run final-d:validate
PASS - 66/66.

npm run lint
PASS.

npm run build
PASS - network-enabled run completed successfully.

git diff --check
PASS.
```

No validation script named `final-e:validate` was added; E.7 owns the consolidated Final-E gate.

## Owner Acceptance

Owner acceptance has not yet been recorded for Final-E.2.

Until owner acceptance is explicitly recorded:

```text
Final-E.2 remains implementation-complete with validation executed, but not accepted.
Final-E.3 is Next / Not started.
Final-E.4 through Final-E.7 remain Not started.
Final-F/G/H remain Not started.
Phase 13 remains Not started.
```
