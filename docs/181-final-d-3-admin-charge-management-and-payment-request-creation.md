# Final-D.3 — Admin Charge Management and Payment-Request Creation

Date: 2026-08-31
Status: **Completed and accepted on 2026-08-31 at `6a0d909fc325f4e8925677041be34c77c023c42b`**
Implementation base: `74ac3011eb22277a896d81c92897f1bee6a4d51b`
Accepted head: `6a0d909fc325f4e8925677041be34c77c023c42b`
Prerequisites: Final-D.1 and Final-D.2 completed and accepted

---

## 1. Objective

Final-D.3 introduces the protected administrative workflow for recording ancillary charges against an existing reservation and grouping eligible charges into an immutable guest payment request.

This subphase is intentionally limited to **admin management and payment-request creation**. It does not activate guest checkout, Tilopay collection, ancillary refunds, email delivery, WhatsApp delivery, or general-ledger/PMS behavior.

The frozen financial-isolation contract in `docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md` remains authoritative.

---

## 2. Scope Implemented

### 2.1 Admin additional-charge management

The Reservation detail **Financial** area receives a dedicated Additional charges section that can:

- load the reservation's ancillary-charge state from a protected admin API;
- create a new positive USD charge;
- use one of the frozen categories:
  - `CLEANING`;
  - `DAMAGE`;
  - `TRANSPORT`;
  - `LATE_CHECKOUT`;
  - `EXTRA_SERVICE`;
  - `OTHER`;
- edit only an eligible `PENDING` charge that has never been snapshotted into a payment request;
- cancel an eligible unpaid `PENDING` charge when it is not inside an active unexpired request;
- preserve charge history by state transition instead of hard deletion;
- expose localized ES/EN labels, helper text, states, dialogs and safe errors through the central message catalogs.

Amounts are submitted as textual decimal values but normalized and validated by the server. The server persists the authoritative two-decimal `Decimal(10,2)` amount and fixed `USD` currency; integer cents are used only where safe audit metadata needs a normalized amount representation.

### 2.2 Payment-request creation

An administrator can select one or more eligible `PENDING` charges and create one `GuestPaymentRequest` containing immutable line-item snapshots.

Creation is server-authoritative and verifies that every selected charge:

- belongs to the requested reservation;
- is still `PENDING`;
- is denominated in `USD`;
- has not changed since the admin loaded the Financial view;
- has not already been attached to another request in a way that makes it ineligible.

The request total is calculated exclusively from persisted charge amounts. The browser does not submit an authoritative total.

Each request item freezes exactly the D.1/D.2 evidence contract: charge reference, category snapshot, guest-visible description snapshot, amount snapshot, currency snapshot and item creation timestamp. Internal notes and actor data remain on their owning admin/audit records and are not copied into guest request-item evidence.

After successful creation, included charges remain financially `PENDING`; active request membership is represented by immutable request-item state, exactly as frozen in D.1. No separate `REQUESTED` charge status is introduced.

### 2.3 Protected token material

D.3 generates the private request access token at request creation so later subphases do not have to mutate the immutable request identity.

The implementation:

- generates 256 bits of cryptographically secure random token material;
- persists only its SHA-256 hash for lookup/validation;
- persists a recoverable AES-256-GCM encrypted copy for controlled future resend/reuse;
- reuses the existing server-side encryption key primitive accepted in Final-B;
- uses a distinct authenticated-data purpose, `GUEST_PAYMENT_REQUEST`, so ancillary tokens cannot be replayed as calendar secrets;
- never returns the raw token in the D.3 API response;
- never renders the token, encrypted value or token hash into the admin DOM.

The existing Final-B `AIRBNB_IMPORT` and `TRP_EXPORT_TOKEN` AAD formats remain unchanged.

### 2.4 Request cancellation

A still-unpaid `PENDING` request can be cancelled from the admin workflow with optimistic-concurrency fencing.

Cancellation:

- changes the request to `CANCELLED`;
- does not delete the request or immutable items;
- leaves attached unpaid charges financially `PENDING`, making them eligible for a new request once the cancelled request is no longer active;
- never changes `PAID`, `REFUNDED`, `PARTIALLY_REFUNDED` or independently `CANCELLED` charges;
- refuses cancellation once the request has an associated Payment;
- creates no refund and performs no provider call.

---

## 3. Concurrency, Idempotency and Audit Rules

All multi-record ancillary mutations use `Prisma.TransactionIsolationLevel.Serializable` through a bounded D.3 retry helper aligned with the repository's established date-mutation retry pattern.

D.3 applies:

- `expectedUpdatedAt` optimistic fencing for charge update/cancel operations;
- per-charge expected timestamps when grouping charges into a payment request;
- a client-generated request identifier for payment-request idempotency;
- idempotent replay only when the existing request owns exactly the same charge set;
- an explicit conflict when one idempotency key is reused with different input;
- safe audit records for create/update/cancel/request-create/request-cancel actions;
- no plaintext access token, raw provider response, card data or secret in audit metadata.

The token is generated only after an idempotency replay has been ruled out, so a valid retry does not create inaccessible replacement token material.

---

## 4. Financial Isolation Preserved

Final-D.3 does **not** mutate or reinterpret stay money.

The following remain unchanged by every D.3 operation:

```text
Reservation.total
Reservation.subtotal
Reservation.cleaningFee
Reservation.taxes
Reservation.discounts
Reservation.pricingSnapshot
currentStayValue
standard cancellation-policy entitlement
remainingRefundableStayBalance
DATE_CHANGE / STAY_EXTENSION pricing evidence
```

No D.3 operation creates a `Payment` or a `Refund`.

Additional-charge money therefore remains outside the existing accommodation financial totals. D.5 intentionally integrates captured/refunded ancillary money through the dedicated Final-A summary fields without changing stay value.

---

## 5. Runtime and API Surface

### Admin read/create

```text
GET  /api/admin/reservations/:reservationId/additional-charges
POST /api/admin/reservations/:reservationId/additional-charges
```

### Admin charge mutation

```text
PATCH  /api/admin/additional-charges/:chargeId
DELETE /api/admin/additional-charges/:chargeId
```

### Payment-request creation/cancellation

```text
POST   /api/admin/reservations/:reservationId/guest-payment-requests
DELETE /api/admin/guest-payment-requests/:requestId
```

Mutation routes require:

- an authorized admin session;
- valid same-origin evidence;
- strict Zod payload validation;
- normalized domain errors rather than raw Prisma/crypto/provider errors.

Read and mutation responses are `no-store` through the existing admin API response helpers.

---

## 6. UI Boundary

The D.3 UI belongs to:

```text
Admin
  → Reservations
    → Reservation detail
      → Financial
        → Additional charges
```

The section keeps accommodation totals and ancillary money visually distinct.

The design uses the existing shadcn/Radix/Tailwind primitives:

- `Card`;
- `Button`;
- `Badge`;
- `Sheet`;
- `Select`;
- `AdminSnackbar`.

No `alert()`, `confirm()` or `prompt()` is introduced. Category selection and charge selection use project design-system controls rather than native browser select/checkbox interactions.

All visible D.3 copy is centralized in:

```text
messages/es.ts
messages/en.ts
```

---

## 7. Explicit D.3 Non-Goals

The following remain intentionally deferred:

### Final-D.4

- public/private guest payment-request page;
- raw-token URL resolution;
- safe admin Copy Link behavior;
- `PaymentPurpose.ADDITIONAL_CHARGE` Payment creation;
- `PaymentSubmissionSource.ADDITIONAL_CHARGE` submission attempts;
- Tilopay SDK/session/provider collection;
- server-side approval application to the request and charges.

### Final-D.5

- ancillary refund authorization/execution/reconciliation;
- `AdditionalChargeRefundAllocation` runtime writes;
- partial/full ancillary refund state transitions;
- Final-A financial-summary population for ancillary gross/captured/refunded amounts.

### Final-D.6

- `ADDITIONAL_CHARGE_PAYMENT_REQUIRED` email creation/delivery;
- manual resend of the protected payment-request link;
- protected operational-history integration for the full ancillary lifecycle.

### Final-D.7

- integrated Final-D regression gate;
- complete Local/Test acceptance matrix;
- Final-D documentation closure.

WhatsApp delivery remains deferred to Final-F. General PMS/folio/accounting behavior remains out of TRP Booking scope.

---

## 8. Files in the D.3 Delivery

Runtime/domain files introduced or modified by this subphase:

```text
app/api/admin/additional-charges/[chargeId]/route.ts
app/api/admin/guest-payment-requests/[requestId]/route.ts
app/api/admin/reservations/[reservationId]/additional-charges/route.ts
app/api/admin/reservations/[reservationId]/guest-payment-requests/route.ts
features/admin/components/admin-additional-charges-section.tsx
features/admin/components/admin-payment-submission-attempt-history.tsx
lib/admin/additional-charge-api.ts
lib/admin/additional-charges.ts
lib/admin/index.ts
lib/external-calendars/secret-crypto.ts
lib/payments/guest-payment-request-token.ts
messages/en.ts
messages/es.ts
types/admin-additional-charge.ts
```

Tracking/documentation files are reconciled separately in the same delivery.

D.3 does not change `prisma/schema.prisma` or the D.2 migration.

---

## 9. Accepted Local/Test Validation Gate

The following validation gate defined D.3 acceptance. The implementation and required Local/Test behavior were confirmed and Final-D.3 was explicitly accepted on 2026-08-31 at the accepted head recorded above.

### Static/regression gate

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run final-a:validate
npm run final-b:validate
npm run final-c:validate
npm run lint
npm run build
git diff --check
```

### Functional admin gate

```text
[x] open a reservation and verify Additional charges appears inside Financial
[x] create a positive USD charge and verify it remains separate from the stay total
[x] create charges using representative categories and localized ES/EN UI
[x] edit an eligible never-requested PENDING charge and verify the updated value is server-authoritative
[x] verify stale expectedUpdatedAt is rejected instead of overwriting concurrent work
[x] cancel an eligible unpaid PENDING charge and verify it is preserved as CANCELLED
[x] select at least two PENDING charges and create one grouped payment request
[x] verify request total equals the persisted selected charge amounts
[x] verify immutable request-item snapshots match the selected charges at creation time
[x] verify included charges remain PENDING while active request membership prevents duplicate active grouping
[x] verify the raw/encrypted/hash token values are absent from API responses and the DOM
[x] retry the same request id with the same charge set and verify no duplicate request is created
[x] reuse the same request id with a different charge set and verify a conflict is returned
[x] cancel a PENDING request and verify its still-PENDING charges become eligible for a new request again
[x] verify cancelled request/item history is preserved
[x] verify no Payment, Refund or EmailNotification is created by D.3 actions
[x] verify Reservation.total and accepted pricing evidence do not change
[x] verify Final-A / Final-B / Final-C regression gates remain green
```

---

## 10. Acceptance Boundary

Current state:

```text
Final-D — In progress
Final-D.1 — Completed and accepted
Final-D.2 — Completed and accepted at 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 — Completed and accepted on 2026-08-31 at 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 implementation base — 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 — Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection; initial implementation commit d2ad7687b8519a4fd0c083f72ca2bfec7f90ce83
Final-D.5 — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration
Final-D.5 record — docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history
Final-D.6 record — docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 — Next / Not started
Final-E — Not started
Phase 13 — Not started
```

Final-D.3 is completed and accepted on 2026-08-31 at `6a0d909fc325f4e8925677041be34c77c023c42b` after the validation/acceptance gate above was confirmed. Final-D.4 has since been completed and accepted on 2026-09-14 at `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c` from this accepted base. Final-D.5 has since been completed and accepted on 2026-09-17 at `06b3de23fbae23a77b58b432760abf12afd5a6c7`. Final-D.6 has since been completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`.
