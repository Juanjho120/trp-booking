# 188 - Final-E.3 Eligibility and Invitation Token Lifecycle Foundation

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E - Reservation reviews and post-checkout invitation
Subphase: Final-E.3 - Eligibility and invitation/token lifecycle foundation
Status: Completed and accepted on 2026-09-18
Implementation date: 2026-09-18
Implementation base head: 6cc737c1e846563069b5f71cbd60b34064ffc160
Accepted implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Accepted Final-E.1 strategy head: e83ad8443bd533715058e701769b10c2d5505436
Accepted Final-E.2 implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Authoritative contract: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Accepted persistence record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Migration count: 21
Current/next subphase: Final-E.5 - Private guest review submission - Implementation completed and validation executed; owner acceptance pending
Final-E.6 and Final-E.7: Not started
Final-F/G/H: Not started
Phase 13: Not started
```

## Scope Implemented

Final-E.3 adds dormant domain foundation only. It introduces no operational scheduler, route, email
intent creation, email rendering, delivery, moderation or public review presentation.

Implemented foundation:

```text
lib/reviews/review-invitation-time.ts
lib/reviews/review-invitation-token.ts
lib/reviews/review-invitation-eligibility.ts
lib/reviews/review-invitations.ts
lib/reviews/index.ts
```

## Owner Acceptance

The owner explicitly accepted Final-E.3 on 2026-09-18 after reviewing the eligibility, token,
lifecycle and transaction-scoped ensure foundation, including the final concurrency hardening for
`ensureReviewInvitationInTransaction()`.

Accepted implementation head:

```text
c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
```

The owner also confirmed directly on 2026-09-18 that the corresponding Vercel deployment was
successfully deployed.

## Accepted E.3 Contract

Final-E.3 accepts the dormant domain foundation below:

```text
checkoutAt =
Reservation.checkOutDate
+
Property.checkOutTime
in America/Guatemala

eligibleAt =
checkoutAt + 2 hours

invalid/null/blank checkOutTime
=> fail closed

business eligibility
!=
scheduler eligibility

scheduler catch-up:
7 days inclusive

ReviewInvitation lifetime:
30 days from creation
```

Accepted status eligibility:

```text
PENDING_PAYMENT
EXPIRED
BLOCKED
=> ineligible

confirmedAt == null
=> ineligible

CONFIRMED
=> may be eligible

REFUNDED / PARTIALLY_REFUNDED
=> historical compatibility only
=> may be eligible only if all temporal/business checks pass

CANCELLED + cancelledAt null
=> fail closed

cancelledAt < checkoutAt
=> ineligible

cancelledAt >= checkoutAt
=> may remain eligible
```

Cancellation evidence for `cancelledAt < checkoutAt` applies independently from Reservation status.

Accepted token contract:

```text
256-bit random raw token
64 lowercase hex chars

SHA-256 persisted hash
64 lowercase hex chars

AES-256-GCM encrypted recoverable copy

purpose:
REVIEW_INVITATION

AAD bound to Reservation ID

raw token:
never persisted
never logged
```

## Checkout and Timezone Implementation

Checkout time is calculated from:

```text
Reservation.checkOutDate calendar date
Property.checkOutTime normalized through normalizeTimeOfDay()
America/Guatemala business timezone
```

Guatemala is treated as fixed UTC-06:00 with no browser timezone dependency. For example:

```text
2026-09-18 + 11:00 America/Guatemala
= 2026-09-18T17:00:00.000Z
```

`eligibleAt` remains frozen as:

```text
checkoutAt + 2 hours
```

The eligibility boundary is exact:

```text
now < eligibleAt  => not eligible
now == eligibleAt => eligible
```

Null, blank or invalid `Property.checkOutTime` fails closed with `INVALID_CHECKOUT_TIME`. E.3 does
not invent a default checkout time.

## Status Eligibility Decision

Business eligibility rejects absolutely:

```text
PENDING_PAYMENT
EXPIRED
BLOCKED
```

Rows with `confirmedAt == null` are ineligible independently from status.

`CONFIRMED` rows may be eligible when checkout has reached `eligibleAt`, no Review exists and
cancellation evidence does not show a pre-checkout cancellation.

Historical `REFUNDED` and `PARTIALLY_REFUNDED` statuses are not rejected merely for their status.
They remain eligible only through the same conservative checks:

```text
confirmedAt != null
checkout/eligibleAt reached
review does not exist
cancelledAt is null or cancelledAt >= checkoutAt
```

`CANCELLED` uses the frozen temporal rule:

```text
cancelledAt == null      => ineligible
cancelledAt < checkoutAt => ineligible
cancelledAt >= checkoutAt => may remain eligible
```

The implementation also applies the cancellation evidence rule independently from status, so a
historical status with `cancelledAt < checkoutAt` remains ineligible.

## Business vs Scheduler Eligibility

Business eligibility answers whether the Reservation represents a stay that may receive a review at
the given `now`. It does not apply the historical scheduler catch-up lower bound.

Scheduler eligibility builds on business eligibility and additionally requires:

```text
eligibleAt <= now
eligibleAt >= now - 7 days
```

The catch-up window is exactly `7 * 24 hours` and inclusive at both boundaries. A created
ReviewInvitation keeps its separate 30-day lifetime; leaving the 7-day scheduler candidate window
does not invalidate an already-created invitation.

## Token Foundation

E.3 adds a review-specific token helper equivalent to the accepted GuestPaymentRequest pattern while
using a separate crypto purpose:

```text
raw token:
  32 random bytes
  lowercase hex
  64 chars
  never persisted in plaintext

hash:
  SHA-256
  lowercase hex
  64 chars

encrypted recoverable copy:
  AES-256-GCM through lib/external-calendars/secret-crypto.ts
  purpose REVIEW_INVITATION
  propertyId argument carries the Reservation ID as frozen by E.1/E.2
```

Exposed helpers:

```text
generateReviewInvitationAccessToken()
isReviewInvitationAccessToken()
hashReviewInvitationAccessToken()
createReviewInvitationTokenMaterial()
decryptReviewInvitationAccessToken()
```

Invalid raw tokens fail safely before hashing or encryption.

## Transaction-Scoped Ensure Primitive

`ensureReviewInvitationInTransaction(tx, reservationId, options)` is transaction-scoped and does
not open or commit its own Prisma transaction. This preserves E.4's future ability to create:

```text
ReviewInvitation
+
REVIEW_INVITATION EmailNotification intent
```

inside the same caller-owned Serializable business transaction.

The primitive reads only the minimum Reservation, Property, existing Review and existing
ReviewInvitation data needed for eligibility and idempotency.

Outcomes are bounded:

```text
created
existing
not-eligible
outside-catch-up-window
review-already-exists
invalid-checkout-time
```

Existing ReviewInvitation rows return the same lifecycle and do not rotate token material. Existing
Review rows prevent new invitation creation. Raw token material is returned only when a new
invitation is created so the future E.4 transaction can compose an email intent without a second
lookup; it is never persisted.

Accepted sequential idempotency:

```text
first ensure:
created

second ensure same Reservation:
existing

same persisted invitation
no token rotation
no second lifecycle
```

The ensure primitive was hardened after independent review to converge safely when two concurrent
transactions both observe no existing invitation. It now uses an insert-with-skip-duplicates pattern
inside the caller-owned transaction and then resolves the persisted lifecycle by `reservationId`.
This preserves sequential replay idempotency and makes a concurrent creation race return
`outcome = existing` with the winning persisted invitation. Locally generated token material from
the losing attempt is discarded and not returned, no second ReviewInvitation lifecycle is created,
the persisted invitation token is not rotated, and raw Prisma uniqueness conflicts do not leak.
If an insert is skipped because of the practically impossible `accessTokenHash` collision for a
different Reservation, the helper retries with new token material and never treats that hash
collision as an existing invitation for the requested Reservation.

Accepted concurrent race guarantee:

```text
two transactions may both initially observe:
reviewInvitation = null

pattern:
insert with skipDuplicates
+
read persisted invitation by reservationId

winning transaction:
created

losing transaction:
existing

one persisted ReviewInvitation lifecycle
```

The token material generated by the losing transaction is discarded, is not returned, is not
persisted and does not rotate the winning invitation token. An `accessTokenHash` collision for
another Reservation must not be interpreted as an existing invitation for the requested Reservation;
the helper performs a bounded retry with new token material. Raw Prisma uniqueness conflicts do not
leak.

For a new invitation:

```text
createdAt = now
checkoutAtSnapshot = calculated checkoutAt
eligibleAt = calculated eligibleAt
expiresAt = createdAt + 30 days
status = ACTIVE
consumedAt = null
accessTokenHash = SHA-256 hash
accessTokenEncrypted = encrypted recoverable copy
```

## Lifecycle Foundation

E.3 provides a pure effective-status helper:

```text
ACTIVE && expiresAt <= now => effectively EXPIRED
otherwise status is unchanged
```

It also provides transaction-scoped terminal convergence primitives:

```text
expireReviewInvitationIfOverdueInTransaction()
cancelReviewInvitationInTransaction()
```

Expiration convergence transitions only:

```text
ACTIVE overdue -> EXPIRED
```

Cancellation transitions only:

```text
ACTIVE -> CANCELLED
```

Both terminal updates clear:

```text
accessTokenEncrypted = null
consumedAt = null
```

This preserves the E.2 invariant:

```text
CONSUMED <=> consumedAt IS NOT NULL
```

E.3 intentionally does not expose an `ACTIVE -> CONSUMED` mutation. Review creation plus invitation
consumption remains E.5's future atomic transaction:

```text
Review insert
+
ReviewInvitation CONSUMED
+
consumedAt
+
encrypted token cleanup
```

Terminal invitations are not rewritten by the E.3 expiration or cancellation primitives.

## Dormant Activation Boundary

Final-E.3 does not implement or activate:

```text
SCHEDULE_REVIEW_INVITATIONS cron registry entry
/api/cron/schedule-review-invitations
automatic scheduler
REVIEW_INVITATION EmailNotification row creation
review email renderer
review email dispatcher
processEmailNotifications REVIEW_INVITATION support
/resenas/[token]
/resenas
/admin/reviews
email delivery
Vercel cron registration
npm run final-e:validate
schema migration
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

## Tests

E.3 extends `tests/final-e/` with deterministic, non-destructive tests:

```text
review-invitation-time-eligibility.test.ts
review-invitation-token-lifecycle.test.ts
review-invitations-ensure.test.ts
```

Coverage includes:

```text
Guatemala checkoutAt conversion
24h and 12h checkOutTime parsing through normalizeTimeOfDay()
eligibleAt = checkoutAt + 2h
eligibility boundary at eligibleAt
null/blank/invalid checkout time fail-closed behavior
status eligibility and historical refund compatibility
CANCELLED temporal rule
business vs scheduler eligibility separation
7-day catch-up inclusive boundary and 1 ms older rejection
existing Review skip
token generation, validation, hash and crypto purpose
ensure creation
ensure replay/idempotency
concurrent ensure creation-race convergence
losing generated token material discarded
no raw Prisma uniqueness conflict leak
no raw token persisted in the fake captured write
effective expiration
expiration convergence
cancellation primitive
```

## Accepted Validation Evidence

Accepted validation evidence for implementation head
`c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030`:

```text
npx tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts
PASS - Final-E targeted validation 18/18.

npm run final-a:validate
PASS - 44/44.

npm run final-b:validate
PASS - 38/38.

npm run final-c:validate
PASS - 41/41.

npm run final-d:validate
PASS - 66/66.

npm run db:generate
PASS - Prisma Client generated successfully.

npm run db:validate
PASS - Prisma schema is valid.

npm run db:migrate:status
PASS - 21 migrations found; database schema is up to date.

npm run lint
PASS.

npm run build
PASS - network-enabled run completed successfully after the sandbox-only first build attempt failed on Google Fonts fetch.

git diff --check
PASS.

Vercel deployment
PASS - Owner verified deployment successfully on 2026-09-18.
```

Sandbox-only validation caveats:

```text
- The first sandbox attempts for tsx-based Final-E/Final-A/Final-B/Final-C/Final-D validation failed before executing tests with uv_os_get_passwd ENOMEM; each was rerun outside the sandbox and passed.
- The first sandbox db:migrate:status attempt failed with a schema engine error against Supabase; the outside-sandbox rerun passed.
- The first sandbox build attempt failed only on Google Fonts fetch; the outside-sandbox rerun passed.
```

## Final-E.4 Implementation Handoff

Final-E.4 implemented the caller-level Serializable transaction for:

```text
ReviewInvitation
+
REVIEW_INVITATION EmailNotification intent
```

E.4 applies bounded retry for Prisma serialization conflicts such as `P2034` around the complete
business transaction and does not add an inner transaction inside the E.3
`ensureReviewInvitationInTransaction()` primitive. The implementation and acceptance record is
`docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md`.

## Current Decision

```text
Final-D — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-E — In progress
Final-E.1 — Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436
Final-E.2 — Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.3 — Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.4 — Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.5 — Implementation completed and validation executed; owner acceptance pending
Final-E.6 — Not started
Final-E.7 — Not started
Final-F/G/H — Not started
Phase 13 — Not started
```
