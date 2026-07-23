# 99 — Phase 11.4 Refund Authorization and Tilopay Reconciliation

## Implementation Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Subphase: 11.4 Refund authorization and Tilopay reconciliation
Status: In progress — implementation prepared; sandbox response contract still requires real observations
Implementation date: 2026-07-23
Base commit: c609ea0e5b4654da86436dba79477455681d7b14
Previous accepted subphase: 11.3 Admin cancellation decision and availability release
Previous accepted commit: c609ea0e5b4654da86436dba79477455681d7b14
```

## Purpose

Add protected full/partial refund authorization, permanent database idempotency, cumulative refundable-amount enforcement, safe Tilopay sandbox observation, explicit reconciliation, and merchant-portal fallback without coupling financial failure to the already accepted cancellation.

This subphase starts from the accepted separation:

```text
Reservation owns stay and availability state.
Payment and Refund own financial state.
A cancelled reservation remains CANCELLED even if a refund fails.
```

## Scope Delivered

```text
- Protected refund authorization from the reservation detail page.
- Full or partial amount entry within the frozen cancellation-policy allowance.
- Cumulative validation across PENDING, PROCESSING, and APPROVED refunds.
- Independent cumulative validation against the captured Payment amount.
- Idempotent PENDING Refund creation before any provider or portal operation.
- Sandbox-only Tilopay processModification type 2 execution.
- Safe response-shape observation without treating an unknown response as success.
- Timeout/network uncertainty preserved as PROCESSING without automatic retry.
- Existing Tilopay consult path reused for safe reconciliation evidence.
- Consult order, original amount, and currency checked against the source Payment before the evidence is accepted.
- Explicit APPROVED/FAILED reconciliation through consult or portal evidence.
- Payment PARTIALLY_REFUNDED/REFUNDED transition only after APPROVED reconciliation.
- AdminAuditLog history for authorization, execution, observation, uncertainty, consult, and reconciliation.
- A sandbox observation CLI for the provider contract test matrix.
- No refund email; lifecycle notifications remain assigned to 11.6.
```

## No Prisma Migration

The Phase 11.2 schema already contains the required typed fields:

```text
Refund.clientRequestId
Refund.idempotencyKey
Refund.processingMode
Refund.processingStartedAt
Refund.approvedAt
Refund.failedAt
Refund.failureCode
Refund.providerRefundId
Refund.rawPayload
Refund.lifecycleRequestId
Refund.requestedByAdminId
```

`Refund.rawPayload` is used only for a bounded object marked with `safe: true` and `schemaVersion: 1`. The admin loader refuses to expose historical or provider-raw payloads that do not carry this marker.

No migration, seed change, dependency, or environment variable is introduced by 11.4.

## Authorization Contract

An admin may authorize a refund only when:

```text
- ReservationLifecycleRequest.requestType = CANCELLATION.
- ReservationLifecycleRequest.status = COMPLETED.
- Reservation.status = CANCELLED.
- The request has a positive frozen standard refund amount.
- No policy exception was applied.
- sourcePayment is an INITIAL_RESERVATION payment.
- Payment.status is APPROVED or PARTIALLY_REFUNDED.
- Payment and request currencies match.
- expected request version/timestamp and payment timestamp still match.
```

The authorized amount may be the full policy amount or a smaller partial amount. It must be positive with at most two decimal places.

## Cumulative Refund Limits

The transaction calculates two independent remaining balances:

```text
policyRemaining = approved policy amount
                  - PENDING/PROCESSING/APPROVED/historical MANUAL refunds for the lifecycle request

paymentRemaining = captured payment amount
                   - PENDING/PROCESSING/APPROVED/historical MANUAL refunds for the payment
```

The new refund must be less than or equal to both balances.

FAILED attempts do not permanently consume the balance. Retrying after a confirmed failure creates a new Refund row with its own request ID and audit history; the failed attempt is never overwritten or deleted.

## Idempotency and Concurrency

Authorization uses:

```text
clientRequestId = browser-generated UUID
idempotencyKey = refund-authorization/<lifecycleRequestId>/<clientRequestId>
```

Creation runs in a serializable transaction and fences both:

```text
ReservationLifecycleRequest.version + updatedAt
Payment.updatedAt + refundable status
```

A network retry with the same UUID returns the existing Refund. Concurrent different authorizations are re-evaluated against cumulative committed totals so they cannot exceed policy or payment limits.

## Provider Execution Boundary

The admin API creates the Refund first and commits it as PENDING. Only a later explicit action can claim it as PROCESSING and call Tilopay.

Initial provider execution is intentionally restricted to:

```text
TILOPAY_ENVIRONMENT=sandbox
processingMode=TILOPAY_API
modification type=2
```

The request body follows the approved project-supplied contract:

```json
{
  "orderNumber": "<Payment.providerReference>",
  "type": "2",
  "amount": "<Refund.amount>",
  "key": "<server-side TILOPAY_API_KEY>"
}
```

The bearer token and integration key remain server-side.

## Unknown Response Contract

No success response field, response code, provider reference, or idempotency guarantee is invented in this package.

After `processModification` returns, TRP Booking stores only:

```text
- HTTP status.
- Whether the HTTP response was 2xx.
- Bounded candidate response code.
- Bounded candidate description.
- Bounded candidate provider reference.
- Response field/type shape without raw values.
- Observation timestamp.
```

The Refund remains PROCESSING with `TILOPAY_REFUND_RECONCILIATION_REQUIRED`. Payment remains unchanged.

## Timeout and Uncertain Outcomes

A timeout or network failure after the modification request may have reached Tilopay is classified as uncertain:

```text
Refund.status = PROCESSING
Refund.failureCode = TILOPAY_REFUND_RESULT_UNCERTAIN
Payment.status = unchanged
Automatic retry = prohibited
```

The admin must consult/review Tilopay before any new attempt. This prevents a blind retry from moving money twice when provider idempotency is unknown.

A login or pre-request failure is safe to classify as FAILED because the modification endpoint was not contacted.

## Reconciliation

A PENDING or PROCESSING Refund receives a final result only through explicit protected reconciliation. Consult evidence is accepted only when its order matches `Payment.providerReference` and any returned original amount/currency match the source Payment.

Sources:

```text
TILOPAY_CONSULT
TILOPAY_PORTAL
```

Final outcomes:

```text
APPROVED
- Requires a provider/portal reference.
- Sets Refund.status = APPROVED.
- Sets approvedAt.
- Updates processingMode to the verified final mode.
- Recalculates all APPROVED refunds for the Payment.
- Sets Payment.status = PARTIALLY_REFUNDED or REFUNDED.

FAILED
- Sets Refund.status = FAILED.
- Sets failedAt and failureCode.
- Leaves Payment status unchanged.
```

Reconciliation requires current Refund and Payment timestamps. Repeating the same accepted final outcome is idempotent.

## Payment Status Calculation

After an approved reconciliation:

```text
cumulativeApprovedRefunds = SUM(Refund.amount WHERE status IN (APPROVED, historical MANUAL))

cumulativeApprovedRefunds = Payment.amount
-> Payment.status = REFUNDED

0 < cumulativeApprovedRefunds < Payment.amount
-> Payment.status = PARTIALLY_REFUNDED
```

The reservation remains CANCELLED in every outcome.

## Merchant Portal Fallback

An authorization may use `TILOPAY_PORTAL_FALLBACK` from the beginning, or an API attempt may ultimately be reconciled using portal evidence.

Portal processing still requires:

```text
- A pre-existing PENDING Refund authorization.
- An explicit verified result.
- A provider/portal reference for APPROVED.
- An admin note describing the evidence.
- AdminAuditLog history.
```

The portal does not permit bypassing policy, payment balance, idempotency, or audit checks.

## Admin Audit Actions

```text
REFUND_AUTHORIZED
REFUND_PROVIDER_EXECUTION_STARTED
REFUND_PROVIDER_RESPONSE_OBSERVED
REFUND_PROVIDER_RESULT_UNCERTAIN
REFUND_PROVIDER_EXECUTION_FAILED
REFUND_PROVIDER_CONSULT_OBSERVED
REFUND_RECONCILED_APPROVED
REFUND_RECONCILED_FAILED
```

Audit metadata contains bounded operational facts. It does not include bearer tokens, API keys, card data, authorization headers, or raw provider responses.

## Protected API Routes

```text
POST /api/admin/reservation-lifecycle-requests/[requestId]/refunds
POST /api/admin/refunds/[refundId]/execute
POST /api/admin/refunds/[refundId]/consult
POST /api/admin/refunds/[refundId]/reconcile
```

Every route requires an authorized admin session and strict Zod input.

## Sandbox Observation CLI

The observation utility calls the same sandbox endpoint but is intentionally separate from normal admin operations so invalid/missing-field tests are not exposed as web actions.

Example valid observation:

```powershell
npm exec -- tsx scripts/observe-tilopay-modification.ts `
  --order="REAL_SANDBOX_ORDER" `
  --type="2" `
  --amount="1.00"
```

Sequential duplicate observation:

```powershell
npm exec -- tsx scripts/observe-tilopay-modification.ts `
  --order="REAL_SANDBOX_ORDER" `
  --type="2" `
  --amount="1.00" `
  --repeat="2"
```

Concurrent duplicate observation:

```powershell
npm exec -- tsx scripts/observe-tilopay-modification.ts `
  --order="REAL_SANDBOX_ORDER" `
  --type="2" `
  --amount="1.00" `
  --concurrent="2"
```

Invalid authentication/key examples:

```powershell
npm exec -- tsx scripts/observe-tilopay-modification.ts `
  --order="REAL_SANDBOX_ORDER" --type="2" --amount="1.00" --auth="invalid"

npm exec -- tsx scripts/observe-tilopay-modification.ts `
  --order="REAL_SANDBOX_ORDER" --type="2" --amount="1.00" --key="invalid"
```

Missing fields are tested by omitting their corresponding option. Zero, negative, malformed, unknown order, full/partial, and type 3 cases are supplied directly through `--amount`, `--order`, and `--type`.

The script masks the order number and prints only the safe observation contract. It never prints credentials or raw response values.

## Required Sandbox Matrix

Before enabling automatic production execution or interpreting any response as final, record the sanitized result for:

```text
1. Valid full refund.
2. Valid partial refund.
3. Second valid partial refund below the remaining amount.
4. Partial refund equal to the exact remaining amount.
5. Refund greater than remaining.
6. Sequential and concurrent duplicate identical requests.
7. Timeout/unknown-result recovery.
8. Zero amount.
9. Negative amount.
10. Invalid decimal format.
11. Missing body fields.
12. Unknown order.
13. Invalid/missing bearer token.
14. Invalid/missing merchant key.
15. Type 2 against fully refunded order.
16. Type 3 against each supported transaction state.
17. Existing `/consult` reconciliation.
18. `consultTransactions` only when provider evidence shows it is needed and supported.
```

Do not run destructive duplicate/full/reversal scenarios against the same order without planning the expected financial effect first.

## Acceptance Scenarios

### Authorization

```text
- Full policy amount creates one PENDING Refund.
- Smaller positive amount creates a partial PENDING Refund.
- Zero, negative, malformed, or over-limit amount is rejected.
- Same UUID returns the same Refund.
- Concurrent authorizations cannot exceed policy/payment balance.
- Provider is not contacted during authorization.
```

### API execution

```text
- PENDING API refund becomes PROCESSING before the network call.
- Production environment rejects automatic execution.
- A provider response does not automatically approve the refund.
- Timeout remains PROCESSING and does not automatically retry.
- Login/pre-request failure becomes FAILED without changing Payment.
```

### Reconciliation

```text
- APPROVED requires a reference and updates Payment cumulatively.
- Exact cumulative captured amount sets Payment REFUNDED.
- Smaller cumulative amount sets Payment PARTIALLY_REFUNDED.
- FAILED leaves Payment unchanged.
- Repeated accepted outcome is idempotent.
- Opposite final outcome is rejected.
- Reservation always remains CANCELLED.
```

### Security and scope

```text
- No native alert/confirm/prompt.
- No unauthenticated refund endpoint.
- No card data or credentials.
- No raw provider response exposed in admin UI.
- No lifecycle email in 11.4.
- No PMS behavior.
```

## Validation Commands

```powershell
npm run env:validate
npm run db:format
npm run db:validate
npm run db:generate
npm run lint
npm run build
git diff --check
git status --short
```

No migration command is required for this package.

## Completion Boundary

11.4 must remain **In progress** until:

```text
- The real sandbox matrix has been executed with controlled orders.
- Sanitized success/error response contracts have been recorded.
- Duplicate and timeout behavior is understood.
- Type 2 versus type 3 behavior is explicitly accepted.
- The reconciliation evidence used for final approval is documented.
- Production API execution rules are separately accepted.
```

Until then, the implementation deliberately favors safe observation and explicit reconciliation over guessed automation.
