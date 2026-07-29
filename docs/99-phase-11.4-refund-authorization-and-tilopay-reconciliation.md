# 99 — Phase 11.4 Refund Authorization and Tilopay Reconciliation

## Implementation Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Subphase: 11.4 Refund authorization and Tilopay reconciliation
Status: In progress — cases 1–17 observed; case 18 not required; corrected 11.4.1 UI acceptance pending
Implementation dates: 2026-07-23 through 2026-07-24
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
- Safe response-shape observation plus centralized provider-accepted, provider-rejected, and uncertain classification.
- A 1101 / Transaction is approved response remains PROCESSING until matching evidence is reconciled.
- Known rejected codes 12 and 96 become FAILED without changing Payment.
- Timeout/network uncertainty remains PROCESSING without automatic retry.
- Safe Tilopay consult candidate enumeration without assuming the first response record is the refund.
- Consult reference, order, normalized Refund/2 type, absolute refund amount, currency, code, and description checked before evidence is accepted.
- Evidence-derived APPROVED/FAILED reconciliation through consult, with explicit portal fallback.
- Payment PARTIALLY_REFUNDED/REFUNDED transition only after APPROVED reconciliation.
- AdminAuditLog history for authorization, execution, observation, uncertainty, consult, and reconciliation.
- Sandbox observation CLIs for processModification and `/consult` candidate discovery.
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

The original 11.4 package introduced no migration. Phase 11.4.2 adds one migration to persist standard versus extraordinary authorization; it adds no seed change, dependency, or environment variable.

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

## Observed Response Contract

The original 11.4 package deliberately treated every provider response as unknown. Cases 1–16 now establish a bounded sandbox contract without treating HTTP 200 by itself as success.

After `processModification` returns, TRP Booking stores only:

```text
- HTTP status.
- Whether the HTTP response was 2xx.
- Bounded response code.
- Bounded description.
- Bounded provider reference.
- Response field/type shape without raw values.
- Observation timestamp.
- Centralized result classification.
```

Classification:

```text
PROVIDER_ACCEPTED
- HTTP 200 and ok=true.
- responseCode 1101.
- description Transaction is approved.
- provider reference present.
- Refund remains PROCESSING until matching evidence is reconciled.

PROVIDER_REJECTED
- Known code 12 or 96 with a non-approved description, or explicit HTTP 4xx.
- Refund becomes FAILED.
- Payment remains unchanged.

RESULT_UNCERTAIN
- Timeout/network uncertainty, unknown contract, HTTP 5xx without a known rejection code, or incomplete accepted-looking response.
- Refund remains PROCESSING.
- Automatic retry remains prohibited.
```

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

A PENDING or PROCESSING Refund receives a final result only through explicit protected reconciliation. `TILOPAY_CONSULT` evidence is accepted only when the server finds the exact modification candidate rather than assuming the first returned transaction belongs to the Refund.

Required consult identity and financial evidence:

```text
providerReference = Refund.providerRefundId
orderNumber matches Payment.providerReference when returned, including the observed R- prefix
type normalizes to Refund or 2
absolute amount = Refund.amount
currency matches when returned
```

An APPROVED consult outcome additionally requires code 1101 and description `Transaction is approved`. A FAILED consult outcome requires a known rejected code/description. `/consult` returned positive amounts for both approved and rejected refund records, so amount sign is not used for API reconciliation. Missing, unmatched, or incomplete candidates remain inconclusive and cannot mutate Payment.

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

## Observed Sandbox Contract — Cases 1–16

The controlled matrix was executed on 2026-07-23 and 2026-07-24 using sanitized `processModification` output plus financial-effect verification in the Tilopay merchant portal.

The completed evidence shows:

```text
Accepted provider response:
- HTTP 200.
- responseCode 1101.
- description Transaction is approved.
- Unique transactionId/provider reference.
- Negative movement amount in the portal.
- Payment balance reduced.

Known rejected provider response:
- HTTP may still be 200.
- responseCode 12 or 96.
- Description differs from Transaction is approved.
- A provider attempt/reference may still be created.
- Movement amount remains positive when displayed.
- Payment balance is unchanged.

Portal status:
- Modification records may display REJECTED even when money moved.
- The portal status label alone is not a valid success/failure signal.
```

Duplicate behavior is not idempotent:

```text
- Five sequential identical requests produced five approved refunds.
- Two concurrent identical requests both reached Tilopay; one approved and one returned Capture error.
- TRP Booking must atomically own idempotency before the provider call.
```

Amount and type findings:

```text
- Tilopay accepted three decimal places, but TRP Booking keeps its stricter two-decimal validation.
- Type 2 supports full and partial refunds and rejects amounts above the remaining balance.
- Type 3 returns the remaining amount but does not behave like a visual annulment of the original transaction.
- Type 3 remains outside the normal application refund flow.
```

The detailed evidence, response classification, consult matching rules, and corrected UI/server behavior are recorded in:

```text
docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
```

## Observed `/consult` Contract — Case 17

Case 17 was executed on 2026-07-29 using a controlled order with one successful full type-2 refund and one later rejected refund attempt.

The sanitized `/consult` response returned three movement records in one array:

```text
1. Successful Refund:
   - responseCode 1101
   - description Transaction is approved
   - unique provider reference matching processModification transactionId
   - order number prefixed with R-
   - type Refund
   - positive amount
   - currency USD

2. Rejected Refund:
   - responseCode 12
   - transaction-closed description
   - separate provider reference
   - order number prefixed with R-
   - type Refund
   - positive amount

3. Original Payment:
   - responseCode 1
   - description Transaction is approved
   - separate payment reference
   - original order number
   - type Payment
   - positive amount
```

The top-level `message = success` / `type = 200` wrapper is not a financial candidate and is excluded by the corrected collector.

Accepted reconciliation rules derived from case 17:

```text
- Match the exact Refund.providerRefundId.
- Match the original order number, accepting the observed R- prefix.
- Normalize consult type Refund and request type 2 as the same refund operation.
- Match the absolute amount to Refund.amount.
- Match currency when returned.
- Use responseCode and description to classify accepted versus rejected.
- Do not use amount sign for /consult evidence.
```

The cases 1–16 portal observations remain `TILOPAY_PORTAL` evidence. Case 17 is the accepted `TILOPAY_CONSULT` evidence contract.

## Case 18 Decision — `consultTransactions`

Case 18 was not executed and is documented as **not required**:

```text
- /consult returned the original payment and all known refund attempts.
- Successful and rejected refunds were separately identifiable by provider reference.
- No movement required for reconciliation was missing.
```

`consultTransactions` remains deferred and must be reconsidered only if a later provider observation shows that `/consult` omits required movements or cannot distinguish them safely.

## Phase 11.4.2 Follow-up — Extraordinary Authorization

The original authorization ceiling combined the cancellation-policy allowance and payment balance. UI acceptance established the need for a separate extraordinary administrative decision.

```text
- STANDARD_POLICY Refunds remain limited by both policy and payment balances.
- EXTRAORDINARY Refunds may be authorized when the policy balance is zero or exhausted.
- Extraordinary amounts do not rewrite or consume the standard policy allowance or mutate the completed cancellation-policy snapshot.
- All committed Refunds together remain limited by the captured Payment amount.
- Existing rows are migrated as LEGACY_UNSPECIFIED and count conservatively with standard-policy commitments.
- The admin form explicitly states that an extraordinary refund is outside the applied cancellation policy and requires a reason.
```

UI-1 also exposed that the UI recognized only modification type `2`, while the observed consult contract returns `Refund`. Phase 11.4.2 normalizes both values, locks all evidence-derived fields, and adds a server-side prohibition against switching conclusive consult evidence to portal fallback.

Implementation record: `docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md`.

## Acceptance Scenarios

### Authorization

```text
- Full policy amount creates one PENDING Refund.
- Smaller positive amount creates a partial PENDING Refund.
- Zero, negative, malformed, or over-limit amount is rejected.
- Same UUID returns the same Refund.
- Concurrent standard authorizations cannot exceed policy/payment balance.
- Extraordinary authorization is allowed with zero/exhausted policy allowance but cannot exceed remaining Payment balance.
- Standard/legacy and extraordinary commitments remain distinguishable and auditable.
- Provider is not contacted during authorization.
```

### API execution

```text
- PENDING API refund becomes PROCESSING before the network call.
- Production environment rejects automatic execution.
- A 1101 / Transaction is approved response remains PROCESSING until matching evidence is reconciled.
- Known rejected codes 12 and 96 become FAILED without changing Payment.
- Unknown responses and HTTP 5xx outcomes remain PROCESSING and uncertain.
- Timeout remains PROCESSING and does not automatically retry.
- Login/pre-request failure becomes FAILED without changing Payment.
```

### Reconciliation

```text
- TILOPAY_CONSULT reconciliation requires a matching reference, normalized Refund/2 type, absolute amount, code, and description.
- Conclusive consult evidence locks outcome/source/mode/reference and cannot be downgraded to portal fallback by a modified request.
- Portal reconciliation requires an explicit admin note and provider/portal reference for APPROVED.
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
npm run db:migrate:dev
npm run db:generate
npm run lint
npm run build
git diff --check
git status --short
```

Phase 11.4.2 requires applying the included Prisma migration before final validation.

## Completion Boundary

11.4 must remain **In progress** until:

```text
- Cases 1–16 of the real sandbox matrix have been executed with controlled orders.
- Sanitized success/error response contracts have been recorded.
- Duplicate and timeout behavior is understood.
- Type 2 versus type 3 behavior is explicitly accepted.
- Case 17 `/consult` candidate evidence is captured and compared with the portal.
- Case 18 is explicitly documented as not required because `/consult` returned all required movements.
- The corrected evidence-based reconciliation is validated through the admin UI.
- The reconciliation evidence used for final approval is documented.
- Production API execution rules are separately accepted.
```

Until then, the implementation deliberately favors safe observation and explicit reconciliation over guessed automation.
