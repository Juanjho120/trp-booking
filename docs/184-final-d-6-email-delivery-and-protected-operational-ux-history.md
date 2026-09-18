# 184 — Final-D.6 Email Delivery and Protected Operational UX/History

## Record

Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.6 — Email delivery and protected operational UX/history
Status: Completed and accepted on 2026-09-18
Implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Latest continuation base head: c9baf3839de6bede20d74d614559cf7380b15039
Latest review continuation base head: 14475269e52b913b4264f3053174318e0768a843
Latest delayed-retry/human-label hardening base head: f19902aa3908a2e691eed8889ddb77f6a5c0f1d3
Latest Email Delivery presentation follow-up base head: 43100468f0c2932594266f7af47d392f573913e5
Accepted implementation head: 965045c697a9bfd0a3318db9396b15214a0cd066
Previous accepted subphase: Final-D.5 — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7
Following subphase: Final-D.7 — Integrated regression and documentation closure — Implementation completed and validation executed; owner acceptance pending
Phase 13: Not started

## Scope Implemented

Final-D.6 implements the email delivery and protected operational UX/history layer reserved by the accepted Final-D.1 contract and the accepted D.2/D.3/D.4/D.5 implementation records.

- Added dedicated guest/admin Additional Charges email renderers sourced from the authoritative GuestPaymentRequest, immutable request items, Reservation, Property, Payment, Refund and AdditionalChargeRefundAllocation evidence.
- Created the automatic pending-payment EmailNotification intents in the same Serializable transaction as `createAdminGuestPaymentRequest()`, with `origin = AUTOMATIC`, `status = PENDING`, `guestPaymentRequestId`, reservation relation, guest/admin recipients, locales and permanent deduplication keys.
- Added `ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED`, `ADDITIONAL_CHARGE_PAYMENT_APPROVED`, `ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED`, `ADDITIONAL_CHARGE_REFUND_PROCESSED` and `ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED` as dedicated ancillary EmailNotification types.
- Added migration `20260917183000_final_d_6_additional_charge_email_notification_types` to extend only the PostgreSQL `email_notification_type` enum with those five values.
- Added a neutral `lib/email/additional-charge-notification-intents.ts` module so request creation, payment approval and refund reconciliation can create notification intents transactionally without importing email render/delivery from payment runtime.
- Added guest/admin payment-approved intents when `markGuestPaymentRequestPaidFromApprovedPayment()` first transitions Payment APPROVED, GuestPaymentRequest PAID and AdditionalCharges PAID; replay of an already PAID request creates no duplicate notification or audit.
- Added guest/admin ancillary refund-processed intents when `reconcileAdminRefund()` completes an `APPROVED` `RefundAuthorizationType.ADDITIONAL_CHARGE` reconciliation, using `AdditionalChargeRefundAllocation` as allocation evidence; failed reconciliation and provider-pending execution do not generate success emails.
- Kept provider delivery best-effort and strictly after commit, so provider/template failures do not roll back request creation or mutate charge/payment financial state.
- Preserved idempotent replay of the same admin `clientRequestId`: the existing request is returned, no new token is generated, and no duplicate notification is created.
- Reused the existing `processEmailNotifications`/retry/provider infrastructure instead of adding a new worker, cron route, provider client or endpoint.
- Added manual resend support through the existing generic `/api/admin/email-notifications/[notificationId]/resend` endpoint while preserving the same request/token, parent/child notification relation, recipient and locale.
- Corrected manual resend eligibility so overdue PENDING GuestPaymentRequest records are converged to EXPIRED before the rejecting resend transaction, preventing rollback from leaving stale payable-request state.
- Corrected the D.6 ancillary email import graph so the Tilopay SDK-session payment runtime no longer depends on the admin additional-charge module or the email barrel during route module initialization.
- Corrected Reservation Email Delivery read model so `ADDITIONAL_CHARGE_PAYMENT_REQUIRED` is no longer filtered out; ancillary guest types appear under Guests and `ADMIN_` ancillary types under Administration.
- Corrected Reservation Email Delivery DTO relation context so ancillary notification rows expose safe `guestPaymentRequestId` and `refundId` identity to the protected admin page.
- Extracted neutral Email Delivery grouping/type-label helpers and covered the six ancillary guest/admin types with exact ES/EN label and 3/3 grouping regressions.
- Corrected stale admin pending-payment retry behavior so guest/admin pending notifications share the same payable-request eligibility, overdue convergence, request/item/payment/charge integrity checks and terminal-state suppression before provider delivery.
- Added protected Additional Charges tab notification visibility and resend UX with safe status/origin/recipient/locale/attempt/timestamp/error-code fields only.
- Extended operational history with safe GuestPaymentRequest relations for automatic intent, delivery attempts/results and manual resend activity.
- Enriched ancillary refund operational history with safe `GUEST_PAYMENT_REQUEST` and `ADDITIONAL_CHARGE` relations plus allocation summaries showing category, description, allocated amount and resulting charge status.
- Corrected ancillary refund operational-history allocation status so approved refund events derive the resulting charge state from chronological `AdditionalChargeRefundAllocation` evidence instead of the live current `AdditionalCharge.status`.

## Security and Boundary Notes

- The raw GuestPaymentRequest token is decrypted only server-side to build the intended private `/reservas/cargos/[token]` link for the email body.
- The decrypted token is verified against the persisted SHA-256 hash before rendering a link.
- Raw tokens, private URLs, encrypted tokens, provider diagnostics, internal notes, payment identifiers and raw error messages are not persisted in the D.6 email/admin/history surfaces.
- Delivery eligibility requires the request to be PENDING, unexpired, relation-valid, amount/currency-valid, item-valid and token/hash-valid.
- Overdue PENDING requests are converged to EXPIRED before the notification is skipped.
- Manual resend of an overdue PENDING additional-charge payment notification is rejected without creating a manual child notification or provider call, while the GuestPaymentRequest EXPIRED state is persisted outside the rejecting transaction.
- PAID, CANCELLED, EXPIRED, overdue or integrity-invalid requests are not sent.
- Stale `ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED` retries after PAID, CANCELLED, EXPIRED or overdue PENDING requests are marked SKIPPED without a provider call.
- Payment-approved and refund-processed ancillary emails do not include raw tokens, private payment URLs, card data, provider raw payloads or internal AdditionalCharge notes.
- Additional-charge email delivery remains financially isolated from Reservation.total, accepted stay pricing evidence, stay refund balances, lifecycle completion and reservation confirmation.

## Hosted Test SDK-Session Blocker Follow-Up

During Hosted Test owner validation after the D.6 email delivery implementation, the automatic email was delivered and the private additional-charge payment page loaded, but pressing `Prepare secure payment` returned:

```text
POST /api/payments/tilopay/sdk-session
HTTP 500
Browser symptom: Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

Safe inspection of the newest Local/Test `GuestPaymentRequest` created by that Hosted Test found:

```text
GuestPaymentRequest.id: cmu62pphc000ci7044110gw2m
status: PENDING
totalAmount: 130
currency: USD
expiresAt: 2026-09-24T22:00:35.900Z
item count: 2

EmailNotification.id: cmu62pqge000ji704h5fwdusr
status: SENT
origin: AUTOMATIC
attemptCount: 1

Payment exists: false
Case: A — no Payment existed after the Hosted Test 500, so the failure occurred before a successful ancillary Payment commit.
```

The code-level root cause found in this D.6 follow-up was the import cycle introduced by ancillary email delivery:

```text
guest-payment-request-payment
-> admin/additional-charges
-> email index
-> additional-charge-payment-notifications
-> guest-payment-request-payment
```

That cycle made the SDK-session route's module graph depend on admin/email initialization even for guest checkout, which is outside the normal route `try/catch` and matches the observed non-JSON 500 failure shape.

Fix applied:

```text
- Extracted buildGuestPaymentRequestPaymentPath() to lib/payments/guest-payment-request-link.ts.
- Moved getAdminGuestPaymentRequestPaymentLink() to lib/admin/guest-payment-request-payment-link.ts.
- Updated the admin copy-link route to use the admin module.
- Updated the D.6 email renderer to depend only on the neutral payment-link helper.
- Added a source-contract guard preventing the payment-admin-email import cycle from returning.
- Added a route-level regression for a D.6-created two-item GuestPaymentRequest with automatic EmailNotification producing ADDITIONAL_CHARGE_CHECKOUT_READY while mocking only /loginSdk.
- Hardened the public Tilopay SDK checkout and preflight fetch handling to parse response text defensively and surface controlled localized errors for empty or malformed infrastructure responses.
```

Local validation evidence after the fix:

```text
SDK-session route module load — Passed.
Production build route bundle inspection — no additional-charge email/admin-link symbols found in .next/server/app/api/payments/tilopay/sdk-session.
tests/final-d suite — Passed: 52/52.
```

Direct reproduction against the real GuestPaymentRequest was authorized and attempted without printing the raw token, URL, ciphertext or credentials. The local process reached the request lookup but could not decrypt the Hosted Test token with the locally loaded encryption key (`EXTERNAL_CALENDAR_SECRET_DECRYPTION_FAILED`), so it stopped before `prepareGuestPaymentRequestPayment()`, before `/loginSdk`, and before creating or reusing a Payment. No real payment was executed.

## Hosted Test Follow-Up After Import-Cycle Fix

After `c9baf3839de6bede20d74d614559cf7380b15039`, the owner reran Hosted Test and confirmed:

```text
- the initial Additional Charges email arrives;
- the private link works;
- Prepare secure payment works again;
- the Tilopay form loads;
- the Additional Charges payment completes correctly.
```

The same owner validation found Final-D.6 incomplete because:

```text
- Email Delivery hid the existing guest ADDITIONAL_CHARGE_PAYMENT_REQUIRED notification from the Guests group;
- GuestPaymentRequest creation did not create an administrative pending-payment email;
- Additional Charges payment approval did not create guest/admin success emails;
- Additional Charges refund reconciliation did not create guest/admin refund-processed emails;
- generic refund operational history did not expose enough GuestPaymentRequest, AdditionalCharge or allocation context for ancillary refunds.
```

This continuation addresses those gaps without starting Final-D.7 and without changing the accepted D.4/D.5 financial architecture.

## Independent Review Follow-Up After Ancillary Email Matrix

After `14475269e52b913b4264f3053174318e0768a843`, the independent review confirmed the six-message ancillary email matrix, migration, transactional intents, post-commit delivery, Email Delivery grouping, Operational History relations/allocations, import-cycle isolation, SDK-session regression and Final-D 55/55 validation were correct.

The same review identified two final consistency gaps:

```text
- ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED retries could still render after the GuestPaymentRequest was no longer payable.
- Ancillary refund Operational History used the live AdditionalCharge.status for historical refund events, so an earlier partial refund could appear as REFUNDED after a later full refund.
```

Fix applied in this continuation:

```text
- Guest and admin payment-pending emails now share the same pending-request deliverability assertion before rendering.
- Overdue PENDING requests are converged to EXPIRED before both guest and admin pending delivery attempts are skipped.
- PAID, CANCELLED and EXPIRED pending-payment notifications are skipped without provider calls.
- Approved ancillary refund history derives resulting charge status from chronological approved/manual AdditionalChargeRefundAllocation evidence, with timestamp plus stable id tie-breaking.
- Non-final ancillary refund events such as authorization, provider execution/consult and failed states keep allocation context but do not display a fake resulting status from the future/live charge state.
```

No migration was introduced for this follow-up.

## Independent Review Follow-Up After Delayed Retry Stability

After `b623bcc426b97e63ea5d602699a4b361efc6b83b`, the independent review confirmed the stale admin pending retry suppression, overdue PENDING-to-EXPIRED convergence, no-provider-call behavior, historically stable ancillary refund Operational History statuses and Final-D 59/59 validation were correct.

The same review identified one remaining delayed-email retry drift:

```text
- Ancillary refund-processed email retries still derived cumulative refunded amount, remaining amount and resulting charge status from current completed refunds/current AdditionalCharge.status, so retrying Refund A after Refund B could describe the later full-refund state.
- Additional-charge payment-approved email retries could describe live post-refund charge/payment state instead of the original paid event.
```

Fix applied in this continuation:

```text
- Extracted a neutral chronological ancillary refund-state helper under lib/reservations so Operational History and email rendering share one approved/manual refund timeline algorithm without introducing email/admin/payment import cycles.
- Ancillary refund-processed guest/admin emails now derive cumulative refunded amount, remaining amount and resulting AdditionalCharge status as of the target refund, using approvedAt when present, temporal fallback for manual/completed refunds and stable refund id tie-breaking.
- Additional-charge payment-approved guest/admin emails now render the original paid event: guest/admin items render PAID, and the admin payment status displays the approved payment event rather than later refund status.
- Added delayed retry coverage proving Refund A 30.00 still renders cumulative 30.00, remaining 70.00 and PARTIALLY_REFUNDED after Refund B 70.00 completed, and proving payment-approved retries stay on the paid event after later refunds.
```

No migration was introduced for this follow-up.

## Independent Review Follow-Up After Payment Status Snapshot and Human Labels

After `f19902aa3908a2e691eed8889ddb77f6a5c0f1d3`, the independent review confirmed the D.6 email delivery, resend/history UX, import-cycle fixes, Hosted Test follow-up fixes and delayed refund retry stability were correct.

The same review identified two final presentation/evidence gaps:

```text
- Admin ancillary refund-processed email retries still displayed the live Payment.status, so retrying Refund A after Refund B could describe the payment as REFUNDED instead of PARTIALLY_REFUNDED as of Refund A.
- Ancillary emails could expose raw technical status/processing enum values such as PARTIALLY_REFUNDED, REFUNDED, PAID, APPROVED, TILOPAY_API or TILOPAY_PORTAL_FALLBACK in human-facing content.
```

Fix applied in this continuation:

```text
- Extended the neutral chronological ancillary refund-state helper to derive Payment refund state as of the target refund from completed same-payment ADDITIONAL_CHARGE refunds, without changing token hashing, D.4 payment architecture, D.5 refund execution or database schema.
- Admin ancillary refund-processed emails now render the Payment status as of the target refund: Refund A on a 100.00 payment after a later 70.00 Refund B still renders PARTIALLY_REFUNDED with cumulative 30.00 and remaining 70.00; Refund B renders REFUNDED.
- Added centralized ES/EN email labels for GuestPaymentRequest statuses, Payment statuses, AdditionalCharge statuses and ancillary refund processing modes.
- Guest payment-required and payment-approved emails omit item statuses; guest refund emails retain localized resulting charge status; admin ancillary emails render localized statuses and processing modes.
- Added delayed retry coverage for ES/EN refund and payment-approved content, proving raw technical enums are not present in persisted/sent email payloads.
- Stabilized the Final-D.4 active GuestPaymentRequest behavior fixture so the full Final-D suite continues to represent an unexpired request after the original fixed 2026-09-18 fixture date passed.
```

No migration was introduced for this follow-up.

## Hosted Test Follow-Up After Email Delivery Presentation Review

After `43100468f0c2932594266f7af47d392f573913e5`, owner Hosted Test validation confirmed the complete physical delivery path for one AdditionalCharge, one GuestPaymentRequest, one Tilopay Sandbox APPROVED ancillary payment and one APPROVED partial ancillary refund. The six physical messages were received and the email content was correct:

```text
- guest additional-charge payment-required email
- admin additional-charge payment-required email
- guest additional-charge payment-approved email
- admin additional-charge payment-approved email
- guest additional-charge refund-processed email
- admin additional-charge refund-processed email
```

The same Hosted Test observed an Email Delivery presentation defect in Reservation detail:

```text
- Guests showed three rows, all titled "Payment received for additional charge".
- Administration showed two rows, both titled "Payment received for additional charge for administration".
- The expected groups were three guest rows and three admin rows:
  ADDITIONAL_CHARGE_PAYMENT_REQUIRED
  ADDITIONAL_CHARGE_PAYMENT_APPROVED
  ADDITIONAL_CHARGE_REFUND_PROCESSED
  ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED
  ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED
  ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED
```

Safe DB inspection of the latest Hosted Test GuestPaymentRequest showed Case A: persistence was correct, no token/private URL/ciphertext/provider payload was printed, and no manual data repair was required.

```text
GuestPaymentRequest.id: cmu70wb8e0007le04asl4mk0b
Reservation.id: cmtd8b7ru0001je041jtn6ssk
Payment.id: cmu70xo16000jle04wjf1im5i
Payment.status: PARTIALLY_REFUNDED
Refund.id: cmu710hkg0002l8040twutpp7
Refund.status: APPROVED

cmu70wc1a000dle04ing9jsmd | ADDITIONAL_CHARGE_PAYMENT_REQUIRED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId null | parent null | dedup prefix additional-charge-payment-required | guest
cmu70wc7r000fle04xo2cwl79 | ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId null | parent null | dedup prefix admin-additional-charge-payment-required | admin
cmu70yhf5000rle048qhkbemi | ADDITIONAL_CHARGE_PAYMENT_APPROVED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId null | parent null | dedup prefix additional-charge-payment-approved | guest
cmu70yhlm000tle04linx804p | ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId null | parent null | dedup prefix admin-additional-charge-payment-approved | admin
cmu711j04000il804vgng0hry | ADDITIONAL_CHARGE_REFUND_PROCESSED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId cmu710hkg0002l8040twutpp7 | parent null | dedup prefix additional-charge-refund-processed | guest
cmu711j77000kl804xaahly9k | ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED | AUTOMATIC | SENT | guestPaymentRequestId cmu70wb8e0007le04asl4mk0b | refundId cmu710hkg0002l8040twutpp7 | parent null | dedup prefix admin-additional-charge-refund-processed | admin
```

Root cause:

```text
The Hosted Test symptom was not caused by EmailNotification.type mutation, intent factories or deduplication-key corruption. The persisted rows had the six correct D.6 types and prefixes.

The actionable code defect was in the protected Email Delivery read/presentation layer: the Reservation detail DTO omitted safe ancillary relation context (`guestPaymentRequestId`, `refundId`) and there was no integrated regression proving that the exact six ancillary types survived `getAdminReservationDetail()`, grouped 3/3 by `ADMIN_`, and resolved to the exact ES/EN labels used by the UI. That gap allowed the Hosted UI presentation anomaly to escape even though persistence and physical delivery were correct.
```

Fix applied in this continuation:

```text
- Added `guestPaymentRequestId` and `refundId` to the protected Reservation Email Delivery DTO.
- Added a neutral `features/admin/email-notification-display.ts` helper for the same grouping and type-label resolution used by the UI.
- Updated `AdminReservationDetailPage` to consume that helper instead of keeping untested inline grouping/label lookup.
- Added a label/grouping regression for the six ancillary guest/admin notification types in EN and ES.
- Added an integrated `getAdminReservationDetail()` regression proving the six ancillary rows remain distinct, preserve safe GuestPaymentRequest/refund relations, keep the expected deduplication prefixes and group as three guest plus three administration notifications.
```

No migration was introduced for this follow-up. No email templates or delivery content were changed.

## Validation Executed

```text
npx tsx --tsconfig tests/final-d/tsconfig.json tests/final-d/run.ts — Passed: 61/61, including pending guest/admin intent pair, payment-approved guest/admin intents, ancillary refund guest/admin intents, stale admin pending retry suppression after PAID/CANCELLED/overdue requests, historically stable ancillary refund allocation statuses, delayed ancillary refund retry as-of-target-refund rendering, delayed payment-approved retry paid-event rendering, template safety coverage, Email Delivery read-model guard, ancillary refund operational-history allocations, manual-resend overdue expiry persistence, terminal-state resend rejection, cancelled-reservation resend reuse, transaction rollback coverage for automatic notification creation failure, import-cycle prevention, and SDK-session route coverage for a D.6-created two-item request with automatic EmailNotification. Sandbox attempts hit the known Windows tsx `uv_os_get_passwd` ENOMEM issue before test startup; reruns outside the sandbox passed.
npm run final-a:validate — Passed: 44/44 after rerun outside the sandbox; first sandbox attempt hit the known Windows tsx `uv_os_get_passwd` ENOMEM issue
npm run final-b:validate — Passed: 38/38 outside the sandbox
npm run final-c:validate — Passed: 41/41 outside the sandbox
Final-D.6 Local/Test DB validation — Passed against the configured Local/Test Supabase datasource: enum migration applied; `email_notification_type` contains the five new ancillary values; `email_notifications` retains nullable `guest_payment_request_id`, `refund_id` and `lifecycle_request_id`; FK relations for reservation/refund/GuestPaymentRequest remain present; `deduplication_key` remains unique
npm run db:generate — Passed
npm run db:validate — Passed
npm run db:migrate:deploy — Initial sandbox attempt failed with a schema-engine/network error; rerun with network access passed and applied `20260917183000_final_d_6_additional_charge_email_notification_types`
npm run db:migrate:status — Initial sandbox attempt failed with a schema-engine/network error; rerun with network access passed and reported the database schema up to date
npm run lint — Passed
npm run build — Initial sandbox attempt failed because Next could not fetch Google Fonts; rerun with network access passed
git diff --check — Passed; only CRLF conversion warnings were reported
```

Schema migration introduced for D.6:

```text
20260917183000_final_d_6_additional_charge_email_notification_types
```

The migration adds only enum values to `email_notification_type`; it adds no tables, columns or constraints.

Latest validation executed after the Email Delivery presentation follow-up:

```text
npx tsx --tsconfig tests/final-d/tsconfig.json tests/final-d/run.ts — Passed: 63/63, including the six-type Email Delivery label/grouping regression and the integrated `getAdminReservationDetail()` read-model regression preserving safe `guestPaymentRequestId`/`refundId` relation context, deduplication prefixes and 3/3 guest/admin grouping. The first sandbox attempt hit the known Windows tsx `uv_os_get_passwd` ENOMEM issue before startup; rerun outside the sandbox passed.
npm run final-a:validate — Passed: 44/44 outside the sandbox
npm run final-b:validate — Passed: 38/38 outside the sandbox
npm run final-c:validate — Passed: 41/41 outside the sandbox
npm run db:generate — Passed; Prisma reported the existing package.json Prisma-config deprecation warning
npm run db:validate — Passed; Prisma reported the schema is valid
npm run db:migrate:status — Initial sandbox attempt failed with a schema-engine error; rerun outside the sandbox passed and reported the Local/Test Supabase schema up to date with 19 migrations
npm run lint — Passed
npm run build — Initial sandbox attempt failed because Next could not fetch Google Fonts; rerun outside the sandbox passed and reported only the existing slow-filesystem warning
git diff --check — Passed; only CRLF conversion warnings were reported
Vercel deployment for accepted head — SUCCESS
```

## Owner Hosted Test Acceptance

Final-D.6 was completed and accepted by the owner on 2026-09-18 at accepted implementation head `965045c697a9bfd0a3318db9396b15214a0cd066`.

The owner executed the final Hosted Test flow and approved the observed behavior:

```text
AdditionalCharge created
-> GuestPaymentRequest created
-> guest payment-required email received
-> admin payment-required email received
-> guest opens private payment link
-> Prepare secure payment works
-> Tilopay Sandbox checkout works
-> ancillary Payment APPROVED
-> guest payment-approved email received
-> admin payment-approved email received
-> partial AdditionalCharge refund authorized/executed/reconciled
-> guest refund-processed email received
-> admin refund-processed email received
```

The final Email Delivery presentation was also reviewed on the same Reservation and accepted:

```text
Email Delivery -> Guests:
- Payment required for additional charge
- Payment received for additional charge
- Refund processed for additional charge

Email Delivery -> Administration:
- Payment required for additional charge for administration
- Payment received for additional charge for administration
- Refund processed for additional charge for administration
```

Acceptance evidence recorded:

```text
- The six real EmailNotification rows preserved distinct types.
- Guest/Admin grouping is 3/3.
- Payment/refund emails use human localized labels.
- Partial refund evidence remains historically correct.
- Reservation operational history includes ancillary refund, payment and email evidence.
- No raw GuestPaymentRequest token is exposed.
- Ancillary financial isolation remains intact.
- The final Vercel deployment for the accepted head completed with SUCCESS.
```

The final Email Delivery follow-up left persistence intact: DB evidence already had the six correct `EmailNotification.type` values, and the accepted implementation added read-model/grouping/type-label regressions so the protected UI preserves those distinct types, safe relation context and labels.

## Not Implemented

Final-D.6 did not implement:

- Final-D.7 consolidated Final-D closure.
- Final-E reservation reviews and post-checkout invitation.
- Final-F WhatsApp communication or staff alerts.
- Final-G performance work.
- Final-H integrated final improvement-track closure.
- Phase 13 Production infrastructure, scheduler, provider or go-live work.

## Current Boundary

Final-D.1 — Completed and accepted
Final-D.2 — Completed and accepted
Final-D.3 — Completed and accepted
Final-D.4 — Completed and accepted
Final-D.5 — Completed and accepted
Final-D.6 — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.7 — Implementation completed and validation executed; owner acceptance pending
Phase 13 — Not started

Final-D.7 has since been implemented and validated through the permanent regression/documentation closure gate. Owner acceptance remains pending; Final-E must not begin automatically.
