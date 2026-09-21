# 190 - Final-E.5 Private Guest Review Submission

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E - Reservation reviews and post-checkout invitation
Subphase: Final-E.5 - Private guest review submission
Status: Implementation completed and validation executed; owner acceptance pending
Implementation date: 2026-09-21
Implementation base head: 2baddeb520c01cd860a73f84a22bd4ec5d0a148c
Accepted implementation head: PENDING OWNER ACCEPTANCE
Accepted Final-E.1 strategy head: e83ad8443bd533715058e701769b10c2d5505436
Accepted Final-E.2 implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Accepted Final-E.3 implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Accepted Final-E.4 implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Authoritative contract: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Accepted persistence record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Accepted lifecycle foundation record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Accepted scheduling/email record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Migration count: 21
Next subphase: Final-E.6 - Admin moderation and public published-review presentation - Not started
Final-E.7: Not started
Final-F/G/H: Not started
Phase 13: Not started
```

## Scope Implemented

Final-E.5 activates the private guest submission branch for already-issued
`ReviewInvitation` links. It does not add review moderation or public review presentation.

Implemented runtime surface:

```text
GET /resenas/[token]
POST /api/reviews/[token]
```

The private page is dynamic and marked noindex/nofollow. The server component resolves the token,
returns only a bounded guest-safe summary, and never passes the raw token to the client component as
a prop. The client reads the token only from the current pathname at submit time.

The summary DTO contains only:

```text
state
locale
propertyName
expiresAt
```

It excludes reservation ids, invitation ids, guest email, phone, payment data, refund data, admin
data, token hashes, encrypted token material, and the raw review token.

## Domain and Security Behavior

Final-E.5 preserves the accepted Final-E token contract:

```text
- Raw REVIEW_INVITATION tokens remain 256-bit lowercase hex values.
- Lookup uses only the SHA-256 accessTokenHash.
- Raw tokens are not persisted by the submission branch.
- accessTokenEncrypted is cleared when an invitation is consumed, expired, or cancelled by the E.5 branch.
- E.5 does not create AdminAuditLog guest evidence because the raw token must not appear in audit metadata.
```

Read-time convergence is implemented for the private page:

```text
- ACTIVE + overdue -> EXPIRED, encrypted token cleared, no Review created.
- ACTIVE + business-revoked -> CANCELLED, encrypted token cleared, no Review created.
- ACTIVE + not-yet-eligible -> UNAVAILABLE without cancelling.
- CONSUMED + existing Review -> ALREADY_SUBMITTED.
- CONSUMED without Review -> UNAVAILABLE.
- EXPIRED -> EXPIRED.
- CANCELLED -> UNAVAILABLE.
```

The persisted invitation eligibility check is shared with E.4 delivery. Existing invitations are
evaluated from `checkoutAtSnapshot` and `eligibleAt`; the E.5 branch does not recalculate mutable
checkout timing from current property settings.

## Submission Behavior

Accepted input:

```text
rating: integer 1 through 5
comment: plain text, non-empty after trimming, max 2,000 Unicode code points
locale: es | en
```

The comment is stored as plain text after CRLF normalization and trimming. E.5 does not add rich
text, HTML rendering, uploads, images, attachments, or media.

On valid first submission:

```text
- A Review is created for the server-owned reservationId and propertyId.
- moderationStatus is PENDING.
- submittedAt is server time.
- publishedAt, moderatedAt, and moderatedByAdminId remain null.
- ReviewInvitation transitions to CONSUMED in the same Serializable transaction.
- consumedAt is set.
- accessTokenEncrypted is cleared.
```

The guest display name is derived server-side from `Reservation.guestName`:

```text
Single usable name token -> that token
Multiple usable name tokens -> first token plus last initial
No Unicode letter -> fail closed, no Review, no token consumption
```

Replay and concurrency behavior:

```text
- A second submit for an already-reviewed reservation returns already-submitted and does not edit the Review.
- Concurrent submit races preserve exactly one winning Review payload.
- Unique-constraint races converge to already-submitted without leaking Prisma/provider errors.
- Review creation failure rolls back invitation consumption.
```

## UI and Copy

The private guest page uses centralized copy in:

```text
messages/es.ts
messages/en.ts
```

The page supports Spanish and English, uses the existing site header/footer and design-system
controls, avoids native alert/confirm/prompt, and does not introduce feature-local visible copy
files.

## Explicitly Not Implemented

Final-E.5 does not include:

```text
admin moderation
/admin/reviews
public /resenas listing
published review cards on public pages
ReviewModerationStatus transitions beyond initial PENDING
schema migrations
new Prisma models or columns
new Vercel cron registrations
manual shared-Test guest invitation email execution
provider calls
npm run final-e:validate
Final-E.6
Final-E.7
Final-F/G/H
Phase 13
```

`vercel.json` remains with zero cron registrations.

## Tests

Final-E.5 extends the deterministic Final-E suite with:

```text
tests/final-e/review-submission.test.ts
```

The existing E.4 boundary test was updated only to allow the private E.5 route/API while continuing
to reject future surfaces:

```text
/resenas/[token]/page.tsx: present
/api/reviews/[token]/route.ts: present
/resenas/page.tsx: absent
/admin/reviews: absent
npm run final-e:validate: absent
vercel.json crons: []
```

Behavior covered:

```text
- safe guestDisplayName snapshots including Unicode whitespace
- rating/comment validation
- invalid and unknown token rejection
- safe ACTIVE summary shape
- EXPIRED and CANCELLED read-time convergence
- not-yet-eligible temporary unavailability
- terminal state mapping
- atomic Review creation plus invitation consumption
- rollback when Review creation fails
- replay without editing existing Review
- concurrent submission race handling
- P2002 uniqueness race convergence
- expired and business-revoked POST rejection without Review creation
- invalid historical guestName fail-closed behavior
- no raw review token persistence in the captured store
- no guest AdminAuditLog evidence
- route/script/Vercel boundary
```

## Validation

Executed validation:

```text
npx tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts
PASS - Final-E targeted validation passed: 52/52 tests.

npm run final-a:validate
PASS - Final-A validation passed: 44/44 tests.

npm run final-b:validate
PASS - Final-B validation passed: 38/38 tests.

npm run final-c:validate
PASS - Final-C validation passed: 41/41 tests.

npm run final-d:validate
PASS - Final-D validation passed: 66/66 tests.

npm run db:generate
PASS - Prisma Client generated successfully.

npm run db:validate
PASS - Prisma schema is valid.

npm run db:migrate:status
PASS - 21 migrations found; database schema is up to date.

npm run email:contract:validate
PASS - Transactional email routing contract validation passed.

npm run lint
PASS.

npm run build
PASS.

git diff --check
PASS - no whitespace errors; Git reported only LF/CRLF working-copy warnings.
```

Environment notes:

```text
- The first sandbox Final-E targeted-validation attempt failed before tests with Node/tsx uv_os_get_passwd ENOMEM; rerun outside the sandbox passed 52/52.
- The first sandbox email contract attempt failed before validation with the same Node/tsx user-info error; rerun outside the sandbox passed.
- The first sandbox build attempt failed because Next/Turbopack could not fetch Google Fonts; rerun outside the sandbox passed.
- The first sandbox db:migrate:status attempt returned a Prisma Schema engine error while checking Supabase; rerun outside the sandbox passed.
```

## Current Decision

```text
Final-D - Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-E - In progress
Final-E.1 - Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436
Final-E.2 - Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.3 - Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.4 - Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.5 - Implementation completed and validation executed; owner acceptance pending
Final-E.6 - Next / Not started only after explicit owner acceptance and request
Final-E.7 - Not started
Final-F/G/H - Not started
Phase 13 - Not started
```
