# 184 — Final-D.6 Email Delivery and Protected Operational UX/History

## Record

Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.6 — Email delivery and protected operational UX/history
Status: Implementation completed and validation executed; owner acceptance pending
Implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Previous accepted subphase: Final-D.5 — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7
Next subphase: Final-D.7 — Integrated regression and documentation closure — Not started
Phase 13: Not started

## Scope Implemented

Final-D.6 implements the email delivery and protected operational UX/history layer reserved by the accepted Final-D.1 contract and the accepted D.2/D.3/D.4/D.5 implementation records.

- Added a dedicated `ADDITIONAL_CHARGE_PAYMENT_REQUIRED` email renderer sourced from the authoritative GuestPaymentRequest, immutable request items, Reservation and Property.
- Created the automatic EmailNotification intent in the same Serializable transaction as `createAdminGuestPaymentRequest()`, with `origin = AUTOMATIC`, `status = PENDING`, `guestPaymentRequestId`, reservation relation, guest recipient, locale and permanent deduplication key.
- Kept provider delivery best-effort and strictly after commit, so provider/template failures do not roll back request creation or mutate charge/payment financial state.
- Preserved idempotent replay of the same admin `clientRequestId`: the existing request is returned, no new token is generated, and no duplicate notification is created.
- Reused the existing `processEmailNotifications`/retry/provider infrastructure instead of adding a new worker, cron route, provider client or endpoint.
- Added manual resend support through the existing generic `/api/admin/email-notifications/[notificationId]/resend` endpoint while preserving the same request/token, parent/child notification relation, recipient and locale.
- Corrected manual resend eligibility so overdue PENDING GuestPaymentRequest records are converged to EXPIRED before the rejecting resend transaction, preventing rollback from leaving stale payable-request state.
- Corrected the D.6 ancillary email import graph so the Tilopay SDK-session payment runtime no longer depends on the admin additional-charge module or the email barrel during route module initialization.
- Added protected Additional Charges tab notification visibility and resend UX with safe status/origin/recipient/locale/attempt/timestamp/error-code fields only.
- Extended operational history with safe GuestPaymentRequest relations for automatic intent, delivery attempts/results and manual resend activity.

## Security and Boundary Notes

- The raw GuestPaymentRequest token is decrypted only server-side to build the intended private `/reservas/cargos/[token]` link for the email body.
- The decrypted token is verified against the persisted SHA-256 hash before rendering a link.
- Raw tokens, private URLs, encrypted tokens, provider diagnostics, internal notes, payment identifiers and raw error messages are not persisted in the D.6 email/admin/history surfaces.
- Delivery eligibility requires the request to be PENDING, unexpired, relation-valid, amount/currency-valid, item-valid and token/hash-valid.
- Overdue PENDING requests are converged to EXPIRED before the notification is skipped.
- Manual resend of an overdue PENDING additional-charge payment notification is rejected without creating a manual child notification or provider call, while the GuestPaymentRequest EXPIRED state is persisted outside the rejecting transaction.
- PAID, CANCELLED, EXPIRED, overdue or integrity-invalid requests are not sent.
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

## Validation Executed

```text
tests/final-d suite — Passed: 52/52, including manual-resend overdue expiry persistence, terminal-state resend rejection, cancelled-reservation resend reuse, transaction rollback coverage for automatic notification creation failure, import-cycle prevention, and SDK-session route coverage for a D.6-created two-item request with automatic EmailNotification
npm run final-a:validate — Passed: 44/44 after rerun with temporary os.userInfo preload; first sandbox attempt hit the known Windows tsx uv_os_get_passwd ENOMEM issue
npm run final-b:validate — Passed: 38/38 with temporary os.userInfo preload
npm run final-c:validate — Passed: 41/41 with temporary os.userInfo preload
Final-D.6 rollback-only DB validation — Passed against the configured Local/Test Supabase datasource; transaction forced rollback after verifying GuestPaymentRequest email relation, automatic deduplication convergence and manual child relation
npm run db:generate — Passed
npm run db:validate — Passed
npm run db:migrate:status — Initial sandbox attempt failed with a schema-engine/network error; rerun with network access passed and reported the database schema up to date
npm run lint — Passed
npm run build — Initial sandbox attempt failed because Next could not fetch Google Fonts; rerun with network access passed
git diff --check — Passed
```

No schema migration was introduced for D.6.

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
Final-D.6 — Implementation completed and validation executed; owner acceptance pending
Final-D.7 — Next / Not started
Phase 13 — Not started

Final-D.6 must not be marked accepted until explicit owner acceptance is recorded. Final-D.7 must not begin automatically.
