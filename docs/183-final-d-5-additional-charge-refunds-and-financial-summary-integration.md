# 183 — Final-D.5 Additional-Charge Refunds and Financial-Summary Integration

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.5 — Additional-charge refunds and financial-summary integration
Status: Completed and accepted
Acceptance date: 2026-09-17
Implementation base head: 63f55e22d03270bce0d27be2197373e3ce3e5de8
Accepted implementation head: 06b3de23fbae23a77b58b432760abf12afd5a6c7
Previous accepted subphase: Final-D.4 — Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Current subphase: Final-D.6 — Email delivery and protected operational UX/history — Implementation completed and validation executed; owner acceptance pending
Phase 13: Not started
```

## Scope Completed

Final-D.5 implements the ancillary refund branch reserved by D.1/D.2 while preserving the D.4 private-payment boundary:

- `RefundAuthorizationType.ADDITIONAL_CHARGE` is now authorized against a real `PaymentPurpose.ADDITIONAL_CHARGE` payment.
- Refund allocations persist through `AdditionalChargeRefundAllocation`; no new migration was required.
- Allocation validation is Serializable, exact-payment/request scoped, charge-level, and balance preserving.
- Pending/processing/approved/manual ancillary allocations reserve charge balance; failed attempts release it.
- Existing Tilopay refund execution, consult, and reconciliation services are reused. No alternate provider client, endpoint, or abstraction was introduced.
- Approved ancillary refund evidence updates `Payment.status` and `AdditionalCharge.status` only.
- `Reservation.total`, pricing snapshots, stay cancellation-policy money, lifecycle completion, and stay refund pools remain isolated.
- The Final-A financial summary now reports ancillary gross/captured/refunded amounts separately.
- The existing Additional Charges tab now shows per-charge captured/refunded/refundable balances, refund history/evidence, refund authorization, and the full shared refund execution/consult/reconciliation workflow.
- Ancillary refunds remain intentionally excluded from the general reservation Refunds tab and are operated only from the Additional Charges tab.

## Review Closure Update

The independent Final-D.5 review identified one remaining product/runtime gap and one coverage gap. This closure corrected both while preserving the accepted architecture:

- The Additional Charges tab now reuses the shared Final-A refund operational controls for Execute, Consult, and Reconcile against the existing `/api/admin/refunds/[refundId]/execute`, `/consult`, and `/reconcile` endpoints.
- No alternate Tilopay refund client, endpoint, or provider abstraction was introduced.
- The general reservation Refunds tab continues to filter out `ADDITIONAL_CHARGE` refunds so ancillary refund operations cannot mix into the stay-refund surface.
- `tests/final-d/refund-runtime.test.ts` now executes `createAdminRefundAuthorization`, `executeAdminTilopayRefund`, and `reconcileAdminRefund` against an in-memory Prisma-compatible mock, including provider acceptance/rejection and reconciliation outcomes.
- A rollback-only Local/Test database validation was executed against the configured Supabase database using an existing `ADDITIONAL_CHARGE` payment fixture; it verified real `Refund` plus `AdditionalChargeRefundAllocation` persistence constraints and confirmed no rows remained after rollback.
- No real Tilopay refund was executed.

## Hosted Test Owner Acceptance

On 2026-09-17, the owner completed and explicitly accepted the Hosted Test validation for Final-D.5.

Confirmed Hosted Test behavior:

- The refund workflow displays inside the Additional Charges tab.
- Ancillary refund authorization works.
- Tilopay Sandbox execution works.
- Consult works.
- Reconcile works.
- Partial ancillary refund works.
- The `AdditionalCharge` transitions to `PARTIALLY_REFUNDED`.
- The `Payment` transitions to `PARTIALLY_REFUNDED`.
- The remaining refundable balance is correct after the partial refund.
- A second refund for the remaining balance works.
- Full ancillary refund works.
- The `AdditionalCharge` transitions to `REFUNDED`.
- The `Payment` transitions to `REFUNDED`.
- The remaining refundable amount reaches 0.
- The flow works without errors.
- Ancillary refunds remain correctly separated from the stay refund workflow.
- Owner acceptance was explicitly granted.

## Financial Definitions Implemented

```text
additionalChargeGrossAmount
= sum original AdditionalCharge.amount where status != CANCELLED

additionalChargeCapturedAmount
= sum captured ADDITIONAL_CHARGE Payments in APPROVED / PARTIALLY_REFUNDED / REFUNDED history states

additionalChargeRefundedAmount
= sum AdditionalChargeRefundAllocation.allocatedAmount for ADDITIONAL_CHARGE refunds in APPROVED / MANUAL states
```

These fields do not alter:

```text
originalStayAmount
currentStayValue
capturedStayPayments
committedStayRefunds
approvedStayRefunds
remainingRefundableStayBalance
Reservation.total
Reservation.pricingSnapshot
```

## Explicit Non-Scope

Final-D.5 did not implement:

- D.6 email delivery, resend, or protected operational-history email UX;
- D.7 consolidated Final-D closure;
- Final-E, Final-F, Final-G, Final-H;
- Phase 13 or Production work.

## Validation Executed

```text
npx tsx tests/final-d/run.ts
Initial run blocked by Windows/Node tsx uv_os_get_passwd ENOMEM.
Re-run with a temporary NODE_OPTIONS preload outside the repository: passed 40/40.

npm run final-a:validate
Run with the temporary NODE_OPTIONS preload outside the repository: passed 44/44.

npm run final-b:validate
Run with the temporary NODE_OPTIONS preload outside the repository: passed 38/38.

npm run final-c:validate
Run with the temporary NODE_OPTIONS preload outside the repository: passed 41/41.

Final-D.5 rollback-only DB validation against the configured Local/Test Supabase datasource
Initial sandbox run could not reach the remote Supabase datasource.
Re-run with sandbox escalation: passed; one rollback-only ADDITIONAL_CHARGE Refund plus AdditionalChargeRefundAllocation was inserted inside a Serializable transaction, verified, rolled back, and confirmed absent afterward. No Tilopay refund call was made.

npm run db:generate
Passed. Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:validate
Passed. Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:migrate:status
Run with sandbox escalation for the configured datasource: passed; database schema is up to date with 18 migrations.

npm run lint
Passed.

npm run build
Initial sandbox run failed because next/font could not fetch Google Fonts.
Re-run with sandbox escalation for network font fetch: passed.

git diff --check
Passed after documentation reconciliation.
```

## Current Decision

```text
Final-D.1 — Completed and accepted
Final-D.2 — Completed and accepted
Final-D.3 — Completed and accepted
Final-D.4 — Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Final-D.5 — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7
Final-D.6 — Implementation completed and validation executed; owner acceptance pending
Final-D.6 record — docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 — Not started
Phase 13 — Not started
```

Final-D.6 implementation is completed with validation executed; owner acceptance remains pending. Final-D.7 is the next subphase but remains Not started until explicitly requested.
