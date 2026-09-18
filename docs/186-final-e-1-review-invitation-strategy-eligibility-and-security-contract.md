# 186 — Final-E.1 Review Invitation Strategy, Eligibility and Security Contract

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E — Reservation reviews and post-checkout invitation
Subphase: Final-E.1 — Review/invitation strategy, eligibility and security contract
Status: Implementation completed as docs-only; owner acceptance pending
Preparation date: 2026-09-18
Implementation base head: 2c9802b07ebf60e8953f32226962669eaf01cfc2
Previous package: Final-D — Completed and accepted on 2026-09-18
Final-D accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b
Authoritative track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Next planned subphase: Final-E.2 — Review/invitation persistence foundation and migration
Final-F/G/H: Not started
Phase 13: Not started
```

## Purpose

Final-E introduces authentic first-party reservation reviews for direct TRP Booking stays.

Final-E.1 freezes the review invitation, eligibility, token, email, submission, moderation, public
privacy and scheduling contracts before any schema, migration, runtime route, email template, cron
job or UI is implemented.

E.1 is documentation-only. It does not create Prisma models, database migrations, pages, APIs,
email templates, cron jobs, validation scripts or provider behavior.

## Repository Findings

The repository review was performed at:

```text
2c9802b07ebf60e8953f32226962669eaf01cfc2
docs(final-d): accept D.7 and close Final-D
```

Current relevant findings:

```text
- Prisma has Reservation and Property but no Review or ReviewInvitation model yet.
- Reservation has checkOutDate, status, confirmedAt and cancelledAt.
- Property.checkOutTime exists and is nullable.
- Property already owns reservations and can own future reviews.
- EmailNotification already supports reservation-owned durable intents, retry, manual resend,
  parent/child history, provider status and safe diagnostics.
- EmailNotification already has nullable business relations added by prior phases; E.2 should add
  reviewInvitationId instead of depending on parsed deduplication keys.
- The cron registry and runner already support registered jobs, manual admin execution, overlap
  protection and durable CronJobExecution history.
- vercel.json currently remains { "crons": [] } and must remain so through Final-E Test work.
- The accepted token pattern from Final-B/Final-D uses 256-bit random raw tokens, SHA-256 lookup
  hashes and AES-256-GCM encrypted recoverable copies with purpose-bound AAD.
- The current AES-GCM helper supports AIRBNB_IMPORT, TRP_EXPORT_TOKEN and GUEST_PAYMENT_REQUEST
  purposes; Final-E must add a separate REVIEW_INVITATION purpose rather than reusing payment AAD.
- Existing time-of-day normalization returns null for invalid input and does not invent defaults.
```

## Frozen Subphase Split

```text
Final-E.1
Review/invitation strategy, eligibility and security contract

Final-E.2
Review/invitation persistence foundation and migration

Final-E.3
Eligibility scheduler, invitation/token lifecycle and cron integration

Final-E.4
Invitation email delivery and private guest review submission

Final-E.5
Admin moderation and public published-review presentation

Final-E.6
Integrated regression and documentation closure
```

Rules:

```text
- E.1 is docs-only.
- E.2 introduces persistence only; it must not activate guest review submission.
- E.3 creates/maintains eligible invitation lifecycle and cron/manual execution, but does not
  implement public review submission.
- E.4 completes the guest invitation email plus one-time private submission.
- E.5 adds protected admin moderation and public published-review read surfaces.
- E.6 owns the consolidated final-e:validate gate and package closure.
- Do not create npm run final-e:validate before E.6.
```

## Eligibility

Final-E targets one authentic guest review per eligible direct Reservation.

Minimum eligibility:

```text
Reservation.confirmedAt != null
review does not already exist for the Reservation
eligibleAt <= now
direct Reservation row, not a manual block/imported blocker
```

Not eligible:

```text
PENDING_PAYMENT
EXPIRED
BLOCKED
never-confirmed rows
```

Historical compatibility statuses must be treated conservatively during E.2/E.3 implementation. Do
not automatically allow `REFUNDED` or `PARTIALLY_REFUNDED` rows without proving that they represent
a real completed direct stay and still satisfy the checkout/cancellation rules below.

Cancellation rule:

```text
cancelledAt == null
=> eligible subject to all other rules

cancelledAt < checkoutAt
=> ineligible

cancelledAt >= checkoutAt
=> may remain eligible because the stay had already reached checkout;
   document this as an unusual lifecycle compatibility case in implementation records
```

Do not rely only on `status === CONFIRMED`, because a real direct stay may have historical lifecycle
evidence after checkout. Also do not turn historical refund-related Reservation statuses into a broad
review backfill path.

## Checkout and Timezone Contract

Checkout is calculated from:

```text
Reservation.checkOutDate
+
Property.checkOutTime
+
timezone America/Guatemala
```

Invitation eligibility time:

```text
checkoutAt = Reservation.checkOutDate at Property.checkOutTime in America/Guatemala
eligibleAt = checkoutAt + 2 hours
```

Do not use the browser timezone. Do not treat UTC midnight as the business checkout time. Do not infer
checkout from `Property.checkInTime`.

`Property.checkOutTime` is nullable. Contract:

```text
null / blank / invalid checkOutTime
=> fail closed
=> do not create a ReviewInvitation
=> return a safe operational skip reason
```

No silent default such as `11:00` or `12:00` is allowed in Final-E.

## Historical and Catch-Up Policy

Final-E must not send unbounded invitations for months or years of historical Reservations when the
scheduler is first activated.

Scheduler candidate policy:

```text
eligibleAt <= now
eligibleAt >= now - 7 days
```

This 7-day catch-up window allows the scheduler to recover recent missed eligible checkouts without
spamming old guests.

After the 7-day automatic catch-up window:

```text
- no automatic invitation is created by the scheduler;
- manual/backfill tooling is not part of initial Final-E;
- any future historical backfill requires explicit owner approval and a separate documented scope.
```

Once a `ReviewInvitation` is created, it has its own 30-day expiration independent from the
scheduler catch-up window.

## Invitation Lifecycle

E.2 should introduce a durable model equivalent to:

```text
ReviewInvitation

id
reservationId
status
accessTokenHash
accessTokenEncrypted
checkoutAtSnapshot
eligibleAt
expiresAt
consumedAt
createdAt
updatedAt
```

Unicity:

```text
one ReviewInvitation lifecycle per Reservation
reservationId UNIQUE
```

The scheduler must not create a new invitation every time it runs. Email retries reuse the same
invitation.

Frozen statuses:

```text
ACTIVE
CONSUMED
EXPIRED
CANCELLED
```

Status semantics:

```text
ACTIVE
- token is valid for one-time review submission
- now < expiresAt
- no Review exists for the Reservation

CONSUMED
- a Review was created successfully
- the token cannot submit again

EXPIRED
- expiration passed
- submission is rejected

CANCELLED
- explicitly invalidated because business eligibility was revoked
```

Do not use `SENT` or `FAILED` as invitation statuses. Delivery state belongs to `EmailNotification`.
Server reads/actions may converge overdue ACTIVE rows to EXPIRED. A dedicated expiry-only cron is
not required.

## Token, Hash and Encryption Contract

Reservation ID is not a credential. Review submission uses an opaque one-time token.

Raw token contract:

```text
- cryptographically random 256-bit token;
- appears only in the intended private URL and immediate server request handling;
- never persisted in plaintext;
- never logged or written to audit metadata.
```

Lookup/retry contract:

```text
accessTokenHash
- SHA-256
- persisted
- used for public token lookup

accessTokenEncrypted
- AES-256-GCM envelope
- persisted only to reproduce the same still-valid URL for email retry
- never exposed in browser/admin DTOs/logs
```

Final-E must reuse/generalize the accepted server-side crypto envelope and add a purpose/AAD
separate from payments:

```text
REVIEW_INVITATION
```

Do not reuse `GUEST_PAYMENT_REQUEST` for review invitation tokens.

Cleanup:

```text
on CONSUMED:
  accessTokenEncrypted should be cleared/null when safe

on terminal EXPIRED/CANCELLED:
  accessTokenEncrypted should be cleared/null when safe

accessTokenHash may remain for terminal lookup and idempotent safe responses
```

The preferred E.2 direction is to make the encrypted copy nullable so terminal cleanup is possible.

## Review Persistence Direction

E.2 should introduce a durable model equivalent to:

```text
Review

id
reservationId
propertyId
rating
comment
guestDisplayName
moderationStatus
submittedAt
publishedAt
moderatedAt
moderatedByAdminId
createdAt
updatedAt
```

Mandatory uniqueness:

```text
reservationId UNIQUE
```

This is the second database-level enforcement of one authentic review per Reservation.

Review records are durable business evidence and must not be hard-deleted as normal admin behavior.

## Guest Submission Contract

Guest input:

```text
rating:
  integer
  1..5

comment:
  required
  trimmed
  plain text
  1..2000 characters
```

No HTML, Markdown rendering or rich text is allowed. Public/admin rendering must treat the comment as
text.

The POST action must be atomic:

```text
resolve token hash
validate invitation ACTIVE
validate expiresAt
validate Reservation eligibility
verify no Review exists
validate rating/comment
derive guestDisplayName snapshot
create Review
mark invitation CONSUMED
set consumedAt
clear encrypted token when safe
commit
```

Transaction boundary:

```text
Serializable or equivalent strong transaction boundary
```

Race safety:

```text
Review.reservationId UNIQUE
ReviewInvitation.reservationId UNIQUE
token hash uniqueness
```

Replay behavior:

```text
same consumed token
=> cannot create another Review
=> cannot edit existing Review
=> returns safe terminal/already-submitted state
```

Do not leak raw Prisma errors such as P2002.

## Display-Name Privacy

Do not publish `Reservation.guestName` automatically in full.

At submission time persist a stable safe snapshot:

```text
first name + last initial
```

Algorithm:

```text
1. Normalize whitespace and trim.
2. Split by Unicode whitespace into non-empty tokens.
3. If no safe token exists, use a generic localized guest label at render time or reject according
   to the implementation form contract.
4. For one token: use the first token.
5. For multiple tokens: use the first token + space + first grapheme/letter of the final token + "."
```

Examples:

```text
Juan -> Juan
Juan Jose Tzun -> Juan T.
```

Persist the result in `Review.guestDisplayName` for historical stability. Do not derive it
dynamically on each render.

## Moderation

Frozen review moderation statuses:

```text
PENDING
PUBLISHED
HIDDEN
```

Initial submission:

```text
moderationStatus = PENDING
```

Never publish automatically.

Allowed admin transitions:

```text
PENDING -> PUBLISHED
PUBLISHED -> HIDDEN
HIDDEN -> PUBLISHED
```

`unpublish` is `HIDDEN`.

Admin moderation rules:

```text
- require admin authentication;
- use expectedUpdatedAt / optimistic concurrency where appropriate;
- create safe AdminAuditLog evidence;
- do not hard delete reviews;
- do not provide an admin edit form for rating, comment or guestDisplayName.
```

Safe audit metadata may include:

```text
reviewId
reservationId
previousStatus
newStatus
admin actor
timestamp
```

Do not store raw tokens, encrypted tokens, guest email, guest phone, full comment, financial data or
provider evidence inside audit metadata unnecessarily.

Guest submission is evidenced by the Review row and invitation transition; do not pretend it was an
admin action.

## Public Read Boundary

Private review route direction:

```text
/resenas/[token]
```

Use the unaccented path segment `resenas`.

GET safe DTO may include only:

```text
property safe localized name
review eligibility / terminal state
rating form context
expiration if useful
```

Do not expose:

```text
Reservation ID as credential
guest email
guest phone
financial amounts
payments
refunds
additional charges
internal notes
admin IDs
provider evidence
Prisma errors
encrypted token/hash
```

Public published reviews surface direction for E.5:

```text
/resenas
```

It may expose only reviews where:

```text
moderationStatus = PUBLISHED
```

Initial public fields:

```text
rating
comment
submittedAt
guestDisplayName
property safe localized name
property slug if needed for navigation
```

Do not expose contact data, Reservation ID, ReviewInvitation ID, admin moderation evidence or token
material. Hidden/unpublished reviews must not appear publicly.

## Email Integration

E.4 adds a dedicated notification type equivalent to:

```text
REVIEW_INVITATION
```

The email must reuse:

```text
EmailNotification
existing retry/provider infrastructure
localized template foundation
```

Review invitation creation and email intent creation must be transactionally coherent:

```text
ReviewInvitation created
+
EmailNotification intent created
same business transaction
```

Provider delivery occurs after commit.

Email failure:

```text
does not invalidate ReviewInvitation
```

Retry:

```text
uses same ReviewInvitation
uses same token
uses same URL while ACTIVE/unexpired
does not create another invitation
does not rotate token
```

E.2 should add an explicit nullable relation:

```text
EmailNotification.reviewInvitationId
```

The review invitation email remains Reservation-owned as well. Delivery/history must not depend on
parsing deduplication keys.

## Cron and Manual Test Boundary

Final-E may add:

```text
CronJobKey.SCHEDULE_REVIEW_INVITATIONS
slug: schedule-review-invitations
schedule metadata: */30 * * * *
```

During the Final Improvement Track:

```json
{
  "crons": []
}
```

`vercel.json` must remain with zero Test scheduler registrations.

Execution boundary:

```text
- use the existing cron registry and runner;
- allow protected manual Test execution through the accepted cron/admin console;
- do not create setInterval, an external scheduler or a parallel worker;
- do not register Production schedules;
- Phase 13/Final-H owns Production scheduler carry-forward.
```

Cron result must be safe:

```text
candidates
created
existing
skipped
failed
processedAt
```

Do not include guest email, guest name, token or private URL in cron result JSON.

## Scheduler Idempotency

Each run:

```text
read bounded eligible candidates
-> ensureReviewInvitation()
-> existing invitation => no duplicate
-> create invitation + email intent once
```

Concurrency/idempotency protections:

```text
ReviewInvitation.reservationId UNIQUE
ReviewInvitation.accessTokenHash UNIQUE
EmailNotification.deduplicationKey UNIQUE
Serializable transaction or equivalent retry boundary
```

Provider delivery failure does not create another invitation and does not consume the token.

## Expiration Contract

Default invitation lifetime:

```text
30 days from ReviewInvitation.createdAt
```

Not from Reservation creation, booking confirmation, check-in or checkout.

If created at `createdAt`:

```text
expiresAt = createdAt + 30 days
```

An overdue ACTIVE invitation is converged to EXPIRED at read/action boundary and cannot submit a
review. There is no automatic reissue in the initial Final-E contract.

## Admin Moderation UX

E.5 should add a protected route equivalent to:

```text
/admin/reviews
```

Expected initial capabilities:

```text
list
read
filter by moderation status/property as useful
publish
hide/unpublish
republish
```

There is no edit form for review content and no delete button.

No native browser `alert()`, `confirm()` or `prompt()`.

All visible copy belongs in:

```text
messages/es.ts
messages/en.ts
```

## Security and Privacy

Forbidden exposure:

```text
raw review token
encrypted token
token hash
guest email
guest phone
full guest legal name as public display
Reservation financial data
payment/refund/provider evidence
admin IDs
internal notes
raw Prisma/provider/crypto errors
```

The private review token grants only the narrow review submission capability. It does not grant
access to admin reservation detail, payment history, additional charges, refunds or lifecycle
actions.

## Concurrency and Idempotency

Final-E must preserve:

```text
- one ReviewInvitation per Reservation;
- one Review per Reservation;
- one ACTIVE usable token at most for the Reservation lifecycle;
- email retry reusing the same invitation;
- replay-safe consumed/expired/cancelled terminal states;
- no duplicate public Review from concurrent submits;
- no moderation overwrite from stale admin pages.
```

Where read-then-write correctness matters, use Serializable transactions or an equivalent strong
transactional boundary with bounded retry.

## Migration Direction for E.2

E.1 does not create a migration. E.2 owns exact Prisma names, indexes, constraints and migration SQL.

Expected persistence direction:

```text
new enum ReviewInvitationStatus
  ACTIVE
  CONSUMED
  EXPIRED
  CANCELLED

new enum ReviewModerationStatus
  PENDING
  PUBLISHED
  HIDDEN

new model ReviewInvitation
new model Review

CronJobKey += SCHEDULE_REVIEW_INVITATIONS
EmailNotificationType += REVIEW_INVITATION
EmailNotification.reviewInvitationId relation

Reservation relations:
  reviewInvitation
  review

Property relation:
  reviews

User moderation relation:
  moderatedReviews if persisted through moderatedByAdminId
```

Recommended constraints:

```text
ReviewInvitation.reservationId UNIQUE
ReviewInvitation.accessTokenHash UNIQUE
Review.reservationId UNIQUE
Review.rating check 1..5
Review.comment non-blank and bounded by application validation
ReviewInvitation.expiresAt > createdAt
```

E.2 must preserve existing Reservation, Payment, Refund, EmailNotification and AdditionalCharge data
without fabricated review history.

## Acceptance Matrix

E.6 owns the consolidated Final-E regression gate. E.1 freezes the minimum matrix.

### Eligibility / Timezone

```text
[ ] confirmed direct reservation eligible only after checkout + 2h
[ ] checkoutAt uses Reservation.checkOutDate + Property.checkOutTime
[ ] business timezone is America/Guatemala
[ ] null/blank/invalid checkOutTime fails closed
[ ] cancelled-before-checkout is rejected
[ ] post-checkout cancellation compatibility is documented and tested
[ ] no unbounded historical backfill
[ ] scheduler catch-up window is bounded to 7 days
```

### Invitation

```text
[ ] one ReviewInvitation per Reservation
[ ] 256-bit random token
[ ] SHA-256 hash lookup
[ ] encrypted recoverable token copy
[ ] no plaintext token persistence/logging
[ ] REVIEW_INVITATION crypto purpose/AAD
[ ] 30-day expiration
[ ] ACTIVE / CONSUMED / EXPIRED / CANCELLED lifecycle
[ ] idempotent scheduler and email retry
```

### Submission

```text
[ ] rating integer 1..5
[ ] required plain-text comment 1..2000 chars
[ ] safe guestDisplayName snapshot
[ ] one Review per Reservation
[ ] atomic Review insert + invitation consume
[ ] replay cannot duplicate or edit
[ ] expired/cancelled invitation rejected
[ ] raw Prisma errors do not leak
```

### Email

```text
[ ] one review invitation email intent
[ ] retry uses same token and URL
[ ] provider failure does not invalidate invitation
[ ] safe bilingual copy
[ ] EmailNotification.reviewInvitationId relation
```

### Moderation / Public

```text
[ ] PENDING by default
[ ] publish
[ ] hide/unpublish
[ ] republish
[ ] no edit/delete of guest content
[ ] only PUBLISHED reviews appear publicly
[ ] no PII/private token exposure
```

### Scheduling

```text
[ ] cron registry integration
[ ] manual Test execution
[ ] vercel.json remains crons: []
[ ] no Production scheduler activation
[ ] safe cron result JSON
```

### Regression

```text
[ ] Final-A remains green
[ ] Final-B remains green
[ ] Final-C remains green
[ ] Final-D remains green
[ ] lint/build/Prisma gates pass where runtime/schema changes require them
```

## Non-Goals

Final-E does not introduce:

```text
Airbnb reviews
Google reviews
review importing/scraping
third-party star aggregation
guest editing after submit
admin rewriting reviews
review replies
photos/videos in reviews
anonymous public submission
review incentives/coupons
WhatsApp invitation delivery
Twilio
Production scheduler activation
Phase 13 resources
```

WhatsApp review invitation, if ever desired, belongs after Final-F and requires explicit owner
approval.

## Current Decision

```text
Final-D — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-E — In progress
Final-E.1 — Review/invitation strategy, eligibility and security contract
Final-E.1 implementation — Completed as docs-only; owner acceptance pending
Final-E.2 — Not started
Final-E.3 — Not started
Final-E.4 — Not started
Final-E.5 — Not started
Final-E.6 — Not started
Final-F/G/H — Not started
Phase 13 — Not started
```

Final-E.2 must not begin until the owner explicitly accepts or otherwise instructs continuation from
this E.1 contract.
