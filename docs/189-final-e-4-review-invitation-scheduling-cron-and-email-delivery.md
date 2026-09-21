# 189 - Final-E.4 Review-Invitation Scheduling, Cron Integration and Email Delivery

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E - Reservation reviews and post-checkout invitation
Subphase: Final-E.4 - Review-invitation scheduling, cron integration and email delivery
Status: Completed and accepted on 2026-09-18
Implementation date: 2026-09-18
Implementation base head: 19199e6382b4daa7651417c37c1958ad59300373
Accepted implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Accepted Final-E.1 strategy head: e83ad8443bd533715058e701769b10c2d5505436
Accepted Final-E.2 implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Accepted Final-E.3 implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Authoritative contract: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Accepted persistence record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Accepted lifecycle foundation record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Migration count: 21
Current/next subphase: Final-E.7 - Integrated regression and documentation closure - Next / Not started
Final-E.5: Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.6: Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.7: Next / Not started
Final-F/G/H: Not started
Phase 13: Not started
```

## Owner Acceptance

The owner explicitly accepted Final-E.4 on 2026-09-18 at implementation head
`e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1`.

Acceptance includes the independent-review corrections for:

```text
relation-integrity isolation
race-safe REVIEW_INVITATION intent creation
actionable repair discovery
```

## Scope Implemented

Final-E.4 activates review-invitation scheduling and email delivery only. It does not implement
private review submission, moderation, public review listing, Production scheduler activation or a
consolidated Final-E validation command.

Implemented runtime:

```text
lib/email/review-invitation-notifications.ts
emails/review-invitation-email.tsx
emails/review-invitation-template-data.ts
types/review-invitation-email-template.ts
app/api/cron/schedule-review-invitations/route.ts
```

Integrated existing systems:

```text
Cron registry:
  SCHEDULE_REVIEW_INVITATIONS
  slug schedule-review-invitations
  schedule metadata */30 * * * *

Email processor:
  REVIEW_INVITATION dispatcher support before generic reservation fallback

Transactional email:
  bilingual ES/EN review invitation template
  guest audience only
  private /resenas/{rawToken} URL
  existing retry/provider infrastructure
```

## Transactional Scheduling Contract

The scheduler creates or repairs:

```text
ReviewInvitation
+
REVIEW_INVITATION EmailNotification intent
```

inside one caller-owned Serializable transaction with bounded retry for Prisma `P2034`
serialization conflicts.

If the email intent creation fails, the newly created ReviewInvitation is rolled back with the same
transaction. Provider delivery is not attempted by the scheduler.

`ensureReviewInvitationInTransaction()` remains caller-owned and does not open an inner
transaction.

Provider delivery occurs later through:

```text
PROCESS_EMAIL_NOTIFICATIONS
```

The scheduler does not call the provider directly.

The stable deduplication key is:

```text
review-invitation/{reviewInvitationId}/{normalizedRecipient}
```

Existing ACTIVE invitations are reused and never rotate token material. Existing ACTIVE invitations
with a missing REVIEW_INVITATION email intent are repaired idempotently, including invitations older
than the seven-day automatic creation catch-up window but still inside their own thirty-day
lifetime.

The REVIEW_INVITATION EmailNotification intent uses a race-safe convergence pattern:

```text
createMany(skipDuplicates: true)
then findUnique(deduplicationKey)
then validate reservationId, reviewInvitationId, type, recipient and locale
```

If another caller-owned transaction wins the same intent, E.4 reuses the persisted row and reports
the intent as existing instead of leaking a unique-constraint failure. A conflicting persisted row
is rejected as an internal deduplication conflict and is not silently accepted.

Concurrency semantics:

```text
winner
  -> created = true

loser
  -> created = false
  -> same persisted REVIEW_INVITATION intent
```

No `P2002` leaks and no duplicate notification intent is created.

Terminal invitations are not reissued.

## Candidate and Repair Boundary

New automatic invitation creation remains bounded to recent checkout candidates so activation does
not spam historical stays. Existing ACTIVE invitation repair is not limited by that catch-up window;
it is bounded by the active invitation lifecycle and the scheduler batch cap.

Accepted new-candidate boundary:

```text
new automatic invitation creation uses the accepted 7-day catch-up window
the DB candidate query is bounded
E.3 performs the exact temporal eligibility evaluation
no historical unbounded backfill
```

Accepted repair boundary:

```text
repair is not limited by the 7-day creation catch-up
repair is bounded by the ReviewInvitation 30-day lifetime
repair candidates require ACTIVE and expiresAt > now
```

Independent-review hardening narrowed repair discovery so non-actionable rows do not spend the
operational batch:

```text
ACTIVE repair candidates must be unexpired (expiresAt > now)
ACTIVE expired invitations are not selected as email-intent repair candidates
ACTIVE unexpired invitations with a current-recipient REVIEW_INVITATION intent are not selected
ACTIVE unexpired invitations with no REVIEW_INVITATION intent are prioritized
ACTIVE unexpired invitations with only stale-recipient REVIEW_INVITATION intent are selected
the final scheduler work set remains capped at 500 Reservation candidates per run
```

The cron result JSON is safe and contains only counts/timestamps:

```text
processedAt
catchUpWindowDays
candidates
created
existing
skipped
failed
notificationIntentsCreated
notificationIntentsExisting
```

It does not include guest names, guest emails, raw tokens, encrypted tokens, private URLs, financial
data, provider payloads or raw Prisma errors.

## Delivery Contract

Delivery supports only `EmailNotificationType.REVIEW_INVITATION`.

Before rendering/sending, delivery verifies:

```text
notification type and relation integrity
ReviewInvitation is ACTIVE
expiresAt > now
Reservation remains eligible using persisted checkoutAtSnapshot and eligibleAt
no Review exists
recipient still matches the current normalized Reservation.guestEmail
encrypted token exists and decrypts with REVIEW_INVITATION purpose/AAD
decrypted token hash matches accessTokenHash
```

Terminal delivery behavior:

```text
relation/data-integrity mismatch
  -> SKIPPED EMAIL_REVIEW_INVITATION_RELATION_MISMATCH
  -> ReviewInvitation is not mutated
  -> status unchanged
  -> no CANCELLED
  -> no EXPIRED
  -> encrypted token remains unchanged
  -> no provider call

overdue ACTIVE invitation
  -> converge EXPIRED
  -> clear encrypted token
  -> SKIPPED EMAIL_REVIEW_INVITATION_EXPIRED
  -> no provider call

business-ineligible ACTIVE invitation
  -> converge CANCELLED where appropriate
  -> clear encrypted token
  -> SKIPPED EMAIL_REVIEW_INVITATION_SUPERSEDED
  -> no provider call

recipient changed
  -> SKIPPED EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED
  -> invitation remains ACTIVE
  -> no provider call

missing/corrupt encrypted token
  -> SKIPPED EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE
  -> no provider call
```

Retryable provider failure leaves the ReviewInvitation ACTIVE, schedules the existing bounded email
retry and reuses the same token/URL on retry.

Retryable provider failure accepted contract:

```text
EmailNotification -> FAILED
nextAttemptAt scheduled
ReviewInvitation remains ACTIVE
same ReviewInvitation
same encrypted token
same decrypted raw token
same /resenas/{token} URL
same EmailNotification idempotency key
no token rotation
no second invitation
no second intent
provider success does not consume invitation
```

`convergeDeliveryTerminalState()` mutates a ReviewInvitation only after the
EmailNotification/ReviewInvitation/Reservation relation has already been validated as coherent.
A corrupt notification cannot cancel, expire or clear token material from an unrelated invitation.

## Email Privacy Boundary

The review invitation email is guest-safe. It includes:

```text
guest greeting name
localized property name
checkout timestamp
invitation expiration timestamp
private one-time review URL
support email
```

It excludes:

```text
Reservation financial data
payments
refunds
additional charges
provider evidence
admin/internal IDs
token hash
encrypted token
raw provider diagnostics
review publication promise
```

The raw review token appears only in the intended private URL and immediate email rendering path. It
is not persisted or written to safe diagnostics.

## Cron and Scheduler Boundary

E.4 registers the job in the internal cron registry and exposes the protected scheduled route:

```text
/api/cron/schedule-review-invitations
```

The route uses the existing `handleScheduledCronRequest()` path and remains `runtime = "nodejs"` and
`dynamic = "force-dynamic"`.

Manual admin execution is available through the existing protected cron console because the new slug
is part of `cronJobSlugs` and the registry.

`vercel.json` remains:

```json
{
  "crons": []
}
```

No Production scheduler registration is introduced in E.4.

Accepted scheduler registration:

```text
SCHEDULE_REVIEW_INVITATIONS
slug: schedule-review-invitations
schedule metadata: */30 * * * *
```

## Shared-Test Staging Boundary

No real shared-Test guest review invitation email was sent during E.4 validation.

After Final-E.5 acceptance, do not manually execute this shared-Test sequence against real guest
recipients unless it is a controlled owner-approved Test case:

```text
SCHEDULE_REVIEW_INVITATIONS
+
PROCESS_EMAIL_NOTIFICATIONS
```

Reason:

```text
avoid sending review invitations to existing real guests outside a controlled owner-approved test
```

Fake-provider and local-safe validation remain allowed.

## Explicitly Not Implemented

Final-E.4 does not include:

```text
/resenas route
/resenas/[token] route
/admin/reviews route
private guest review submission
Review creation
ReviewInvitation CONSUMED transition
admin moderation
public published-review surface
schema migration
Vercel cron registration
npm run final-e:validate
Final-E.5
Final-E.6
Final-E.7
Final-F/G/H
Phase 13
```

Manual resend support for `REVIEW_INVITATION` was not added to the existing admin resend allow-list.
The accepted E.4 state is:

```text
REVIEW_INVITATION manual resend: NOT SUPPORTED
```

Automatic provider retries are sufficient for E.4.

## Tests

E.4 extends the deterministic Final-E suite with:

```text
tests/final-e/review-invitation-scheduling-email.test.ts
```

Coverage includes:

```text
ReviewInvitation + REVIEW_INVITATION intent atomic creation
email-intent failure rollback
P2034 whole-transaction retry
sequential replay idempotency
concurrent email-intent convergence without P2002 leakage
existing ACTIVE invitation repair without token rotation
scheduler recent-candidate creation
older ACTIVE invitation repair beyond the seven-day creation window
expired ACTIVE invitation exclusion from email-intent repair discovery
already-covered current-recipient invitation exclusion from repair discovery
missing-intent and stale-recipient repair prioritization
terminal invitation non-reissue
ES/EN email template output and private URL
delivery success and SENT transition
provider temporary failure retry with ACTIVE invitation preserved
retry using the same token/URL
expired invitation EXPIRED convergence and SKIPPED notification
business-ineligible invitation CANCELLED convergence and SKIPPED notification
recipient-change SKIPPED behavior with ACTIVE invitation preserved
relation-integrity mismatch SKIPPED behavior without mutating unrelated invitations
missing/corrupt encrypted token safe SKIPPED behavior
processEmailNotifications REVIEW_INVITATION routing
cron registry, scheduled route, vercel.json empty crons, missing final-e:validate, and no E.5/E.6 routes
```

## Validation Evidence

Accepted validation evidence for
`e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1`:

```text
npx tsx --tsconfig tests/final-e/tsconfig.json tests/final-e/run.ts
PASS - Final-E targeted validation 35/35.

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

npm run email:contract:validate
PASS - transactional email routing contract validation passed.

npm run lint
PASS.

npm run build
PASS - network-enabled run completed successfully after the sandbox-only first build attempt failed on Google Fonts fetch.
```

Sandbox-only validation caveats:

```text
- The first sandbox attempt for the Final-E targeted tsx runner failed before executing tests with uv_os_get_passwd ENOMEM; the outside-sandbox rerun passed.
- The first sandbox email:contract:validate attempt failed before executing with uv_os_get_passwd ENOMEM; the outside-sandbox rerun passed after the validation fixture was updated to include the current required EXTERNAL_CALENDAR_ENCRYPTION_KEY.
- The first sandbox db:migrate:status attempt failed with a schema engine error against Supabase; the outside-sandbox rerun passed.
- The first sandbox build attempt failed only on Google Fonts fetch; the outside-sandbox rerun passed.
```

git diff --check
PASS.

real shared-Test guest review emails
NONE.

## Current Decision

```text
Final-D - Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-E - In progress
Final-E.1 - Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436
Final-E.2 - Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.3 - Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.4 - Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.5 - Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.6 - Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.7 - Next / Not started
Final-F/G/H - Not started
Phase 13 - Not started
```
