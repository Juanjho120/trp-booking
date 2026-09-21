# 190 - Final-E.5 Private Guest Review Submission

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-E - Reservation reviews and post-checkout invitation
Subphase: Final-E.5 - Private guest review submission
Status: Completed and accepted on 2026-09-21
Implementation date: 2026-09-21
Implementation base head: 2baddeb520c01cd860a73f84a22bd4ec5d0a148c
Accepted implementation head: f37f4802219aeb80d10f92b406e0a4847b10f15d
Accepted Final-E.1 strategy head: e83ad8443bd533715058e701769b10c2d5505436
Accepted Final-E.2 implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Accepted Final-E.3 implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Accepted Final-E.4 implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Authoritative contract: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Accepted persistence record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Accepted lifecycle foundation record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Accepted scheduling/email record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Migration count: 21
Final-E.6: Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Current subphase: Final-E.7 - Integrated regression and documentation closure - Implementation completed and validation executed; owner acceptance pending
Final-E.7: Implementation completed and validation executed; owner acceptance pending
Final-E.7 permanent regression: npm run final-e:validate - 69/69 PASS
Final-E.7 record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-F/G/H: Not started
Phase 13: Not started
```

## Owner Acceptance

The owner explicitly accepted Final-E.5 on 2026-09-21 after the initial private guest review
submission implementation and the independent-review hardening follow-up.

Accepted implementation head:

```text
f37f4802219aeb80d10f92b406e0a4847b10f15d
```

The Vercel deployment for this implementation head is accepted as:

```text
SUCCESS
```

Final-E.6 is completed and accepted on 2026-09-21 at accepted implementation head
82f1c27ba2af41d9ade9f8f57348bf66e18f800f.
Final-E.7 implementation and validation are completed with owner acceptance pending.

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

Accepted privacy properties:

```text
dynamic / no-store private state
noindex
nofollow
raw token used only as private capability credential
lookup by SHA-256 token hash
Reservation ID is not a credential
no canonical/private SEO URL with token
```

The summary DTO contains only:

```text
state
locale
propertyName
expiresAt
```

It excludes reservation ids, invitation ids, guest email, phone, payment data, refund data, admin
data, token hashes, encrypted token material, and the raw review token.

Accepted private GET summary:

```text
state
locale
propertyName
expiresAt
```

Accepted exclusions:

```text
Reservation ID
ReviewInvitation ID
Review ID
guest email
guest phone
full guest name
financial data
payments
refunds
additional charges
admin IDs
raw token
token hash
encrypted token
```

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
ACTIVE valid
=> ACTIVE

ACTIVE overdue
=> EXPIRED
=> accessTokenEncrypted cleared

ACTIVE business-revoked
=> CANCELLED
=> guest state UNAVAILABLE
=> encrypted token cleared

ACTIVE before eligibleAt
=> temporary UNAVAILABLE
=> invitation remains ACTIVE

CONSUMED + Review
=> ALREADY_SUBMITTED

CONSUMED without Review
=> UNAVAILABLE

EXPIRED
=> EXPIRED

CANCELLED
=> UNAVAILABLE
```

No terminal invitation is reactivated.

The persisted invitation eligibility check is shared with E.4 delivery. Existing invitations are
evaluated from `checkoutAtSnapshot` and `eligibleAt`; the E.5 branch does not recalculate mutable
checkout timing from current property settings.

Shared persisted-eligibility evaluator:

```text
evaluatePersistedReviewInvitationBusinessEligibility(...)
```

This evaluator is shared by:

```text
Final-E.4 review-invitation delivery/scheduling
Final-E.5 private review read/submission
```

Existing invitations use:

```text
checkoutAtSnapshot
eligibleAt
```

They do not recalculate historical checkout timing from the current `Property.checkOutTime`.

## Submission Behavior

Accepted input:

```text
rating:
integer
1..5

comment:
required
plain text
trimmed
1..2000 Unicode code points

locale:
es | en
```

The comment is stored as plain text after CRLF normalization and trimming. E.5 does not add rich
text, HTML rendering, uploads, images, attachments, or media.

Comment normalization:

```text
CRLF -> LF
trim leading/trailing whitespace
preserve useful internal line breaks
```

HTML-looking and Markdown-looking content remains literal text. There is no rich-text or HTML
interpretation.

On valid first submission:

```text
resolve token hash
read invitation + Reservation + Review state
validate lifecycle
validate business eligibility
validate no Review
derive guestDisplayName
guard ReviewInvitation ACTIVE -> CONSUMED
create Review
commit
```

Durable result:

```text
Review created
ReviewInvitation.status = CONSUMED
ReviewInvitation.consumedAt = same server now
ReviewInvitation.accessTokenEncrypted = null
ReviewInvitation.accessTokenHash may remain
```

The guest display name is derived server-side from `Reservation.guestName`:

```text
Single usable name token -> that token
Multiple usable name tokens -> first token plus last initial
No Unicode letter -> fail closed, no Review, no token consumption
```

Accepted privacy snapshot normalization:

```text
source:
Reservation.guestName

normalize:
Unicode NFC
trim
collapse Unicode whitespace
```

Accepted examples:

```text
Juan
=> Juan

Juan Jose Tzun
=> Juan T.

María del Carmen López
=> María L.

Élodie Brontë
=> Élodie B.
```

An invalid historical name with no usable Unicode letter fails closed: no Review is created and the
invitation is not consumed. The snapshot is persisted once and is not dynamically recalculated.

Replay and concurrency behavior:

```text
- A second submit for an already-reviewed reservation returns already-submitted and does not edit the Review.
- Concurrent submit races preserve exactly one winning Review payload.
- Unique-constraint races converge to already-submitted without leaking Prisma/provider errors.
- Review creation failure rolls back invitation consumption.
```

Accepted invitation concurrency fence:

```text
where:
id = invitation.id
status = ACTIVE
consumedAt = null
expiresAt > now

transition:
ACTIVE -> CONSUMED
```

If the fence loses, no Review is created by the loser and state is re-read safely.

Accepted Review fields:

```text
reservationId:
server-owned invitation Reservation

propertyId:
server-owned Reservation.propertyId

rating:
validated guest input

comment:
validated normalized guest input

guestDisplayName:
server-derived privacy snapshot

moderationStatus:
PENDING

submittedAt:
server now

publishedAt:
null

moderatedAt:
null

moderatedByAdminId:
null
```

The guest cannot supply `reservationId`, `propertyId`, `guestDisplayName`, `moderationStatus`,
admin IDs or publication/moderation timestamps.

Rollback guarantee:

```text
If Review.create() fails after the invitation fence:
entire transaction rolls back

Review:
not created

ReviewInvitation:
ACTIVE

consumedAt:
null

accessTokenEncrypted:
preserved
```

This submission path cannot leave a CONSUMED invitation without a Review.

Replay behavior:

```text
same token after successful submission
=> already-submitted
=> no new Review
=> no edit to existing Review
=> no token rotation
=> no new invitation
```

Concurrent valid submissions produce exactly one winning Review and exactly one CONSUMED invitation.
The losing submission converges to already-submitted and cannot overwrite the winning payload.
`Review.reservationId UNIQUE` remains the DB-level secondary safeguard.

P2002 uniqueness races roll back the losing transaction, re-read current state and converge to
already-submitted without leaking raw Prisma errors.

P2034 Serializable retry contract:

```text
max attempts:
3

first P2034
second attempt success
=> one Review
=> one CONSUMED invitation

3 P2034 conflicts
=> REVIEW_SUBMISSION_UNEXPECTED_ERROR
=> no raw P2034 text
=> no Prisma detail
=> no partial Review
=> no partial CONSUMED state
```

## Independent Review Follow-up Correction

The independent review after the initial E.5 implementation identified a final client/runtime
hardening gap. The follow-up keeps the accepted E.5 architecture intact and adds only these scoped
corrections:

```text
- The private review client now tracks a local ACTIVE / ALREADY_SUBMITTED / EXPIRED / UNAVAILABLE / SUBMITTED state instead of relying only on the initial server DTO.
- A stale ACTIVE browser page that receives REVIEW_INVITATION_EXPIRED or REVIEW_INVITATION_UNAVAILABLE from POST immediately transitions to terminal guest UI and hides the form, without reload or a second submit.
- INVALID_REVIEW_SUBMISSION and REVIEW_SUBMISSION_UNEXPECTED_ERROR remain inline retryable client errors.
- Malformed pathname percent-encoding is decoded through a safe helper that returns null without throwing, logging, or posting.
- Initial page REVIEW_SUBMISSION_UNEXPECTED_ERROR renders the generic unavailable state instead of the invalid-link state.
- The existing Serializable transaction P2034 retry behavior is now explicitly covered for first-attempt retry success and three-attempt exhaustion rollback.
```

No schema, migration, provider, scheduler, email, moderation, public review, or E.6 behavior was
added by this correction.

Accepted retryable client errors:

```text
INVALID_REVIEW_SUBMISSION
REVIEW_SUBMISSION_UNEXPECTED_ERROR
```

These do not automatically make the form terminal because the current lifecycle state is not known
to have become terminal.

Accepted pathname token decoding:

```text
malformed percent encoding
=> null token
=> no exception
=> no POST eligibility
```

The token is not logged and is not persisted in localStorage, sessionStorage or cookies.

Initial private page presentation:

```text
INVALID_REVIEW_INVITATION
=> invalid link UI

REVIEW_SUBMISSION_UNEXPECTED_ERROR
=> generic unavailable UI
```

This avoids implying that a valid private link is necessarily invalid after an internal error.

## UI and Copy

The private guest page uses centralized copy in:

```text
messages/es.ts
messages/en.ts
```

The page supports Spanish and English, uses the existing site header/footer and design-system
controls, avoids native alert/confirm/prompt, and does not introduce feature-local visible copy
files.

The private form includes only safe context:

```text
localized property name
invitation expiration
1-5 accessible rating control
plain-text comment textarea
submit CTA
private/one-time note
```

It does not display:

```text
Reservation reference
guest email
guest phone
full guest name
financial information
admin information
```

Every successful Review starts with:

```text
moderationStatus = PENDING
```

Success copy says the review is pending moderation. E.5 does not publish automatically, does not add
a guest edit surface, and does not add Review deletion.

Guest submission creates no `AdminAuditLog` row. Guest submission evidence is the `Review` row plus
the `ReviewInvitation` CONSUMED transition. Admin audit begins with actual admin moderation in E.6.

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

Accepted runtime route boundaries:

```text
/resenas/[token]
implemented

/api/reviews/[token]
implemented

/resenas
not implemented

/admin/reviews
not implemented

public review cards
not implemented

moderation API
not implemented

moderation UI
not implemented
```

No real shared-Test guest review invitation email was sent during E.5 implementation validation.
After E.5 acceptance, any future hosted end-to-end review invitation test must still be a
controlled owner-approved Test case; scheduler/email must not be automatically executed against
existing real guests.

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
- stale ACTIVE client POST convergence to EXPIRED / UNAVAILABLE terminal UI
- malformed private pathname token decoding without exception or POST eligibility
- P2034 first-attempt retry success without duplicate Review creation
- P2034 retry exhaustion mapped to a safe unexpected error with rollback
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
PASS - Final-E targeted validation passed: 55/55 tests.

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

Vercel deployment for f37f4802219aeb80d10f92b406e0a4847b10f15d
PASS - SUCCESS.

real shared-Test guest review emails during implementation validation
NONE.
```

Environment notes:

```text
- The first sandbox attempts for the tsx-based Final-E targeted validation, Final-A/B/C/D gates, and email contract failed before tests with Node/tsx uv_os_get_passwd ENOMEM; reruns outside the sandbox passed.
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
Final-E.5 - Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.6 - Admin moderation and public published-review presentation - Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.7 - Implementation completed and validation executed; owner acceptance pending
Final-E.7 permanent regression - npm run final-e:validate - 69/69 PASS
Final-E.7 record - docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-F/G/H - Not started
Phase 13 - Not started
```

## Final-E.6 Handoff

Final-E.6 owns:

```text
/admin/reviews
admin review listing/detail or equivalent bounded moderation UI
PENDING -> PUBLISHED
PUBLISHED -> HIDDEN
HIDDEN -> PUBLISHED
expectedUpdatedAt / optimistic concurrency
safe AdminAuditLog moderation evidence
public /resenas
PUBLISHED reviews only
safe public review DTO
guestDisplayName
rating
comment
submittedAt
localized property name
property slug if needed
```

Final-E.6 was implemented and accepted without admin editing of rating, comment or guestDisplayName,
and without hard-deleting Reviews.
