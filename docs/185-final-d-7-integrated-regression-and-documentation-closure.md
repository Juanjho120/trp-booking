# 185 — Final-D.7 Integrated Regression and Documentation Closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.7 — Integrated regression and documentation closure
Status: Completed and accepted on 2026-09-18
Implementation base head: 0a511f4b87c3d8556593f9d48909a71d7bfab14c
Accepted implementation/validation head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b
Previous accepted subphase: Final-D.6 — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D owner acceptance: Completed on 2026-09-18
Final-E: Next / Not started
Final-F/G/H: Not started
Phase 13: Not started
```

## Purpose

Final-D.7 adds the permanent consolidated Final-D regression gate and reconciles the Final-D
documentation after the accepted D.1 through D.6 implementation sequence.

D.7 does not introduce a new business capability. It does not add a provider branch, refund feature,
email type, admin workflow, guest workflow, schema migration, Production resource, Final-E feature,
Final-F/F/G/H work, or Phase 13 work.

## Permanent Validation Command

Final-D.7 adds one package-level command:

```text
npm run final-d:validate
```

Implementation:

```text
tsx --tsconfig tests/final-d/tsconfig.json tests/final-d/run.ts
```

No Jest, Vitest, extra runner, new dependency, provider fixture, real payment/refund mutation, or
database write is introduced by this gate.

## Automated Suite Layout

```text
tests/final-d/harness.ts
tests/final-d/source-contract.test.ts
tests/final-d/behavior.test.ts
tests/final-d/refund-runtime.test.ts
tests/final-d/email-runtime.test.ts
tests/final-d/integrated-acceptance.test.ts
tests/final-d/run.ts
tests/final-d/tsconfig.json
```

The D.7 suite now registers 66 deterministic checks. D.7 kept the existing 63 D.4/D.5/D.6 checks
and added three integrated closure checks for real D.1 matrix gaps:

```text
- charge-domain eligibility, validation, edit/cancel boundaries and safe audit evidence;
- payment-request grouping snapshots, idempotency, active-request fencing, cross-reservation rejection and re-request after cancellation or expiry;
- permanent command/source boundary coverage for categories/localization, financial isolation and UI/security constraints.
```

## Test Safety Boundary

`npm run final-d:validate` is deterministic and non-destructive.

It does not:

```text
- connect to Supabase;
- insert, update or delete real Reservation, Payment, Refund, AdditionalCharge, GuestPaymentRequest, EmailNotification or audit rows;
- call Tilopay;
- call Resend;
- send email;
- execute a provider refund;
- execute a Vercel cron;
- require Production credentials;
- provision or mutate Production resources.
```

Runtime coverage uses in-memory Prisma-compatible fixtures and source-contract assertions. Provider,
email and database behavior that requires real infrastructure remains covered by the accepted
Local/Test and Hosted Test evidence from D.4, D.5 and D.6, plus the normal Prisma/status/build gates.

## D.1 Acceptance Matrix Mapping

Charge domain:

```text
- supported categories typed/localized: D.7 source contract over types/additional-charge.ts and messages/es.ts/messages/en.ts.
- never-confirmed Reservation cannot receive a charge: D.7 integrated charge-domain behavior.
- previously confirmed CONFIRMED/CANCELLED Reservation can receive an eligible charge: D.7 integrated charge-domain behavior.
- positive USD amount validation: D.7 integrated charge-domain behavior plus D.2 database checks.
- guest description/internal-note security boundary: D.7 integrated audit assertion; D.3/D.6 accepted UI/email boundaries.
- never-requested PENDING charge edit works: D.7 integrated charge-domain behavior.
- historically requested/paid charge cannot be rewritten: D.7 integrated grouping behavior plus D.5 paid/refund coverage.
- unpaid eligible charge can be explicitly cancelled: D.7 integrated charge-domain behavior.
```

Grouping / request:

```text
- one charge and multiple charges create immutable requests: D.7 integrated grouping behavior and D.6 creation/idempotency behavior.
- exact summed request total: D.7 integrated grouping behavior.
- cross-Reservation grouping rejected: D.7 integrated grouping behavior.
- same charge cannot enter two active requests: D.7 integrated active-request fencing behavior.
- request item snapshot remains immutable: D.7 integrated snapshot behavior.
- expired/cancelled request permits valid PENDING charge re-request: D.7 integrated CANCELLED/EXPIRED re-request behavior.
- request replay/idempotency does not duplicate rows: D.7 integrated grouping behavior and D.6 idempotency behavior.
- request token is not persisted/logged in plaintext: D.3 accepted token creation, D.4 raw-token sanitization behavior and D.7 audit/source coverage.
- invalid/expired/cancelled/paid token cannot start a new checkout: D.4 behavior tests.
```

Payment:

```text
- ADDITIONAL_CHARGE purpose/submission source is distinct: D.4 source and behavior tests.
- SDK amount equals immutable request amount: D.4 behavior tests.
- approved evidence atomically marks request and charges paid: D.4 behavior tests.
- approved ancillary Payment does not call reservation confirmation/date-mutation completion: D.4 source and behavior tests.
- rejected/failed attempts leave obligations retryable: D.4 behavior tests.
- redirect/provider replay is idempotent: D.4 behavior tests.
- Reservation.total/status/pricingSnapshot remain unchanged: D.4 behavior tests and D.5 financial-summary tests.
```

Financial isolation:

```text
- currentStayValue, cancellation base and remainingRefundableStayBalance exclude ancillary Payments: Final-A 44/44 plus D.5 behavior/source tests.
- additionalChargeGrossAmount, additionalChargeCapturedAmount and additionalChargeRefundedAmount are correct: D.5 behavior tests.
- DATE_CHANGE/STAY_EXTENSION stay pricing remains separate: Final-C 41/41 plus D.7 source-contract boundary.
```

Refunds:

```text
- selected paid ancillary charge balance bounds refunds: D.5 behavior/runtime tests.
- allocations sum exactly to provider Refund amount: D.5 behavior/runtime tests.
- concurrent authorization cannot over-allocate: D.5 behavior/runtime tests.
- failed refund releases reserved ancillary balance: D.5 behavior/runtime tests.
- approved partial/full reconciliation updates charge/payment state correctly: D.5 runtime tests and owner Hosted Test acceptance.
- ancillary refund does not mutate Reservation lifecycle or stay value: D.5 source/runtime tests.
```

Email / UX / security:

```text
- ES/EN payment-request email shows safe immutable line items and expiry: D.6 email-runtime tests and owner Hosted Test acceptance.
- email failure does not invalidate payable request: D.6 behavior tests.
- resend reuses only a still-valid protected link: D.6 behavior tests.
- admin Financial tab separates stay vs ancillary money: D.4/D.5/D.6 source-contract and Hosted Test evidence.
- private guest page exposes no admin/internal/provider data: D.4 source/behavior tests and D.7 source contract.
- no native alert/confirm/prompt: D.7 source contract over D.7-owned UI surfaces.
- no raw token/provider/card/secret exposure: D.4 token sanitization, D.6 email/history safety and D.7 audit/source checks.
- existing Final-A and Final-C gates remain compatible: Final-A 44/44 and Final-C 41/41 passed during D.7 validation.
```

Historical stability and cross-package compatibility:

```text
- request/item/payment/refund/email history remains immutable and replay-safe: D.4/D.5/D.6 behavior/runtime tests.
- delayed ancillary email retries render as-of the target event, not current live state: D.6 delayed retry tests.
- Final-A, Final-B and Final-C permanent regression gates remain green: A 44/44, B 38/38, C 41/41.
```

## Consolidated Hosted Test Evidence

D.7 did not execute a new Hosted Test flow and did not manufacture provider/payment/refund activity.
It consolidates the accepted owner evidence from the implementation subphases:

```text
Final-D.4 Hosted Test accepted on 2026-09-14:
- private GuestPaymentRequest link loads;
- React hydration error #418 no longer reproduces;
- Additional Charges appears in its own tab;
- Prepare secure payment creates the ADDITIONAL_CHARGE Payment;
- Tilopay form displays;
- the prior TILOPAY_SDK_SESSION_UNEXPECTED_ERROR no longer reproduces.

Final-D.5 Hosted Test accepted on 2026-09-17:
- ancillary refund authorization, Tilopay Sandbox execution, consult and reconcile work;
- partial and full ancillary refunds update AdditionalCharge and Payment states correctly;
- remaining refundable amount reaches 0 after full refund;
- ancillary refunds remain separated from the stay refund workflow.

Final-D.6 Hosted Test accepted on 2026-09-18:
- guest/admin payment-required emails are delivered;
- private link and Tilopay Sandbox payment work;
- guest/admin payment-approved emails are delivered;
- partial ancillary refund works;
- guest/admin refund-processed emails are delivered;
- Email Delivery groups show 3 guest and 3 administration rows with distinct labels;
- no raw GuestPaymentRequest token is exposed.
```

## Validation Executed

```text
npm run final-d:validate
Initial sandbox run failed before startup with the known Windows/Node tsx uv_os_get_passwd ENOMEM issue.
Rerun with the existing temporary NODE_OPTIONS preload outside the repository: Passed 66/66.
Latest D.7 re-request correction rerun with the same temporary NODE_OPTIONS preload: Passed 66/66, including both CANCELLED and EXPIRED request re-request paths.

npm run final-a:validate
Rerun with the same temporary NODE_OPTIONS preload: Passed 44/44.

npm run final-b:validate
Rerun with the same temporary NODE_OPTIONS preload: Passed 38/38.

npm run final-c:validate
Rerun with the same temporary NODE_OPTIONS preload: Passed 41/41.

npm run db:generate
Passed. Prisma emitted the existing package.json Prisma-config deprecation warning.

npm run db:validate
Passed. Prisma schema valid; Prisma emitted the existing package.json Prisma-config deprecation warning.

npm run db:migrate:status
Initial sandbox run failed with a schema-engine error against the configured Local/Test Supabase datasource.
Network-enabled rerun passed: 19 migrations found and database schema is up to date.

npm run lint
Passed.

npm run build
Initial sandbox run failed because Next could not fetch Google Fonts.
Network-enabled rerun passed; Next reported only the existing slow-filesystem warning.

git diff --check
Passed after documentation reconciliation.
```

## Owner Acceptance and Final-D Closure

The owner reviewed the final D.7 result after the permanent regression-gate correction and gave
explicit acceptance for both Final-D.7 and the complete Final-D package on 2026-09-18.

Accepted heads:

```text
Final-D.7 accepted implementation/validation head:
fd75663bb28be8a95b15c341eaa51f74e521241b

Final-D accepted feature head:
fd75663bb28be8a95b15c341eaa51f74e521241b
```

Final accepted validation evidence from the accepted head:

```text
npm run final-d:validate — 66/66 PASS
npm run final-a:validate — 44/44 PASS
npm run final-b:validate — 38/38 PASS
npm run final-c:validate — 41/41 PASS

db:generate — PASS
db:validate — PASS
db:migrate:status — PASS
Local/Test Supabase — 19 migrations, schema up to date

lint — PASS
build — PASS
git diff --check — PASS

Vercel deployment for fd75663bb28be8a95b15c341eaa51f74e521241b — SUCCESS
```

Final permanent-gate correction accepted:

```text
- snapshot immutability test no longer carries an impossible mutated live charge into later business assertions;
- CANCELLED GuestPaymentRequest -> valid PENDING charges may be re-requested;
- EXPIRED GuestPaymentRequest -> valid PENDING charges may be re-requested;
- re-request total remains the original immutable charge evidence;
- separate request/token identities remain preserved;
- permanent Final-D gate remains 66/66.
```

D.7 did not execute a new Hosted Test flow. The real provider/runtime acceptance consolidated by
this closure remains the accepted owner evidence from D.4, D.5 and D.6.

## Scope Boundary

Final-D.7 did not implement:

```text
- Final-E reservation reviews or post-checkout invitations;
- Final-F WhatsApp communication or staff alerts;
- Final-G performance work;
- Final-H integrated final improvement-track closure;
- Phase 13 Production infrastructure, scheduler, provider or go-live work;
- new database schema or migration;
- real provider payment/refund/email mutations.
```

## Current Decision

```text
Final-D.1 — Completed and accepted
Final-D.2 — Completed and accepted
Final-D.3 — Completed and accepted
Final-D.4 — Completed and accepted
Final-D.5 — Completed and accepted
Final-D.6 — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.7 — Completed and accepted on 2026-09-18
Final-D — Completed and accepted on 2026-09-18
Accepted feature head — fd75663bb28be8a95b15c341eaa51f74e521241b
Permanent Final-D regression — npm run final-d:validate, 66/66 PASS
Final-E — Reservation reviews and post-checkout invitation — Next / Not started
Final-F — Not started
Final-G — Not started
Final-H — Not started
Phase 13 — Not started
```

Final-E must not begin automatically.
