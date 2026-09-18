# Final-D.4 — Private guest payment link and Tilopay collection

Status: **Completed and accepted on 2026-09-14**

```text
Package: Final-D — Additional charges and guest payment requests — In progress
Subphase: Final-D.4 — Private guest payment link and Tilopay collection
Implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b
Initial implementation commit: d2ad7687b8519a4fd0c083f72ca2bfec7f90ce83
Accepted implementation head: 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Implementation record: this D.4 implementation plus corrective validation-strengthening, token-sanitization hardening, hydration, SDK-session error handling, admin-tab placement, and PostgreSQL payment-purpose constraint changesets
Owner acceptance: Completed on 2026-09-14 after Hosted Test functional validation
Current/next subphase: Final-D.7 — Integrated regression and documentation closure — Not started
Phase 13: Not started
```

## Scope Implemented

- Added the private guest payment page at `/reservas/cargos/[token]` for `GuestPaymentRequest` payment collection.
- Added a protected admin Copy private link action that decrypts the recoverable D.3 token only server-side, verifies its SHA-256 hash, returns the URL with `no-store`, copies it through the Clipboard API, and does not render or keep the raw URL in component state.
- Added the D.4 ancillary payment domain service that resolves private access by token hash, expires overdue pending requests, validates immutable request/item amount and currency snapshots, and prepares one logical Tilopay `Payment` with `PaymentPurpose.ADDITIONAL_CHARGE`.
- Integrated the additional-charge branch into the accepted Tilopay SDK session, preflight, submission-attempt, client-event, and redirect/result flows.
- Corrected the real PostgreSQL `payments_purpose_relation_check` constraint so it now permits the dedicated `PaymentPurpose.ADDITIONAL_CHARGE` + `guestPaymentRequestId` relation while preserving the accepted INITIAL_RESERVATION and LIFECYCLE_ADJUSTMENT relation rules.
- Hardened Tilopay SDK token acquisition so `/loginSdk` network failures, HTTP non-success responses, invalid JSON, and missing `access_token` responses are normalized to `TILOPAY_SDK_TOKEN_UNAVAILABLE` instead of escaping as a generic SDK-session 500.
- Preserved the established initial-reservation and lifecycle-adjustment branches while keeping D.4 on `PaymentSubmissionSource.ADDITIONAL_CHARGE`.
- On validated approved Tilopay evidence, marks the request and included additional charges paid through a Serializable transaction and audit log without confirming/reconfirming the reservation, mutating `Reservation.total`, mutating `pricingSnapshot`, altering stay cancellation-policy money, or completing any lifecycle date mutation.
- On rejected/failed provider outcomes, keeps the request and charges pending and routes safely back to the private payment page while preserving auditable payment-attempt history.
- Added bilingual centralized public/admin/payment error copy in `messages/es.ts` and `messages/en.ts`.
- Fixed private payment-page timestamp rendering for `expiresAt` and `paidAt` by formatting visible request datetimes in the explicit TRP property time zone, `America/Guatemala`, preventing SSR/client timezone drift without suppressing hydration warnings or moving the page client-only.
- Moved the admin Additional Charges surface out of the payment-attempt history block and into its own Reservation detail tab between Reservation lifecycle and Refunds, reusing the existing component and centralized copy.
- Added a focused Final-D.4 validation suite under `tests/final-d` with source-contract guards and in-memory behavioral tests that execute the D.4 payment-request, Tilopay result, submission-attempt and client-event logic without adding or inventing an `npm run final-d:validate` package script.

## Security and Isolation Notes

- Raw guest-payment tokens remain limited to the intended private URL and transient server/client request handling for that URL.
- Normal guest summary DTOs omit `requestId`, `reservationId`, `additionalChargeId`, guest name, guest email, and raw token fields.
- The Tilopay SDK session DTO and `returnData` use a non-secret `guest-payment-request` marker instead of returning the raw token.
- Preflight and client-event APIs receive the raw token only as the private-page reference, validate it by hash, and persist the real reservation id in operational history without persisting the token. SDK client-event sanitization now treats that token as a sensitive value across free-text diagnostics and SDK payload object/string/Error branches before truncation, dropping sensitive fields instead of persisting partial, masked or derived token values.
- D.4 does not implement refunds, email delivery/resend/history, consolidated Final-D closure, review invitations, WhatsApp, performance work, or Phase 13 production work.

## Hosted-Test 500 Diagnosis and Correction

Manual Hosted Test reproduced `POST /api/payments/tilopay/sdk-session` returning `TILOPAY_SDK_SESSION_UNEXPECTED_ERROR` when preparing a real `GuestPaymentRequest`.

Final documented root cause: `payments_purpose_relation_check`.

Corrective migration: `20260914150000_final_d_4_allow_additional_charge_payment_constraint`.

Safe Local/Test database inspection after the 500 found:

```text
GuestPaymentRequest id: cmu1bky2q0009l304jogg4sd7
Reservation id: cmtbxbvjg000ai804kuu5c5t1
Request status: PENDING
Request total/currency: 100 USD
Expires at: 2026-09-21T14:09:59.422Z
Included charges: 2, both still PENDING
Associated Payment: none
Case: A — failure occurred inside prepareGuestPaymentRequestPayment()
```

The local environment could not decrypt that request's encrypted token copy, so the raw token was not recovered or printed. A rollback-only PostgreSQL dry run against the same request isolated the real failure to the `create_payment` stage:

```text
prepareGuestPaymentRequestPayment stage: create_payment
Prisma error class: PrismaClientUnknownRequestError
PostgreSQL error code: 23514
Constraint: payments_purpose_relation_check
Cause: the existing Phase 11 payment-purpose check constraint allowed only INITIAL_RESERVATION and LIFECYCLE_ADJUSTMENT relation shapes. D.2 added Payment.guestPaymentRequestId and PaymentPurpose.ADDITIONAL_CHARGE but did not replace that existing check constraint, so PostgreSQL rejected the D.4 ancillary Payment before providerReference assignment or Tilopay SDK login.
```

Correction:

```text
Migration: prisma/migrations/20260914150000_final_d_4_allow_additional_charge_payment_constraint/migration.sql
Change: drops and recreates payments_purpose_relation_check with three explicit allowed shapes:
- INITIAL_RESERVATION requires lifecycle_request_id IS NULL and guest_payment_request_id IS NULL.
- LIFECYCLE_ADJUSTMENT requires lifecycle_request_id IS NOT NULL and guest_payment_request_id IS NULL.
- ADDITIONAL_CHARGE requires lifecycle_request_id IS NULL and guest_payment_request_id IS NOT NULL.
```

Post-migration Local/Test evidence:

```text
db:migrate:deploy applied 20260914150000_final_d_4_allow_additional_charge_payment_constraint successfully.
Rollback-only dry run against real request cmu1bky2q0009l304jogg4sd7: create_payment PASS; no Payment persisted by the dry run.
Rollback-only POST /api/payments/tilopay/sdk-session using a diagnostic GuestPaymentRequest in the same database and a mocked /loginSdk boundary: HTTP 201; prepareGuestPaymentRequestPayment PASS; ensurePaymentProviderReference PASS; getTilopayEnv PASS; requestTilopaySdkToken PASS; buildReturnData/buildSdkInitConfig PASS; diagnostic rows rolled back.
```

## Hosted Test Owner Acceptance

On 2026-09-14, the owner completed and accepted the final Hosted Test validation for Final-D.4.

Confirmed Hosted Test behavior:

```text
- The private GuestPaymentRequest link loads correctly.
- React hydration error #418 no longer reproduces.
- Additional Charges appears in its own tab between Reservation lifecycle and Refunds.
- Prepare secure payment prepares the checkout correctly.
- The Payment with purpose ADDITIONAL_CHARGE is created correctly.
- The Tilopay form displays correctly.
- The flow no longer returns TILOPAY_SDK_SESSION_UNEXPECTED_ERROR.
- The owner explicitly accepts Final-D.4.
```

## Validation Executed

```text
npm run db:validate — Passed; Prisma schema valid.
npm run db:generate — Passed; Prisma Client generated.
npm run db:migrate:status — Initial D.4 correction run reported one pending migration, 20260914150000_final_d_4_allow_additional_charge_payment_constraint, before deployment.
npm run db:migrate:deploy — Passed; applied 20260914150000_final_d_4_allow_additional_charge_payment_constraint to the shared Local/Test database.
npm run db:migrate:status — Passed after deployment; 18 migrations found and database schema is up to date.
npm run lint — Passed.
npm run build — Initial sandbox attempt failed because Next could not fetch Google Fonts; rerun with network access passed.
npx tsx --tsconfig tests/final-d/tsconfig.json tests/final-d/run.ts — Passed 25/25 with source-contract guards plus behavioral coverage for valid/invalid/expired/cancelled/paid tokens, immutable ADDITIONAL_CHARGE Payment creation, the PostgreSQL payment-purpose constraint migration, one logical Payment per request, Tilopay SDK session creation/reuse, provider-reference assignment, token-safe `returnData`, typed `/loginSdk` provider failure handling, route-level 502 mapping for known SDK-token failures, rejected/failed retry behavior, approved idempotent application, stay/lifecycle isolation, mismatch rejection, raw-token persistence exclusion across client-event text diagnostics plus SDK payload object/string/Error branches, explicit TRP timezone formatting for the private page, and the dedicated admin Additional Charges tab placement. The local Windows run used a temporary NODE_OPTIONS preload for the Node 22 os.userInfo ENOMEM issue; no repository files were changed for that workaround.
npm run final-a:validate — Passed 44/44 with the same temporary tsx preload.
npm run final-b:validate — Passed 38/38 with the same temporary tsx preload.
npm run final-c:validate — Passed 41/41 with the same temporary tsx preload.
git diff --check — Passed after documentation reconciliation.
```

## Acceptance State

Final-D.4 is **Completed and accepted** on 2026-09-14 at accepted implementation head `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c`. Final-D.5 has since been completed and accepted on 2026-09-17 at `06b3de23fbae23a77b58b432760abf12afd5a6c7`. Final-D.6 has since been completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`. Final-D.7 is Next / Not started and Phase 13 remains Not started.
