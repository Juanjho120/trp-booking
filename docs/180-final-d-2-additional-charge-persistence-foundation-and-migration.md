# 180 — Final-D.2 Additional-Charge Persistence Foundation and Migration

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.2 — Persistence foundation and migration
Status: In progress — implementation prepared for Local/Test migration validation
Preparation date: 2026-08-31
Implementation base head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Previous subphase: Final-D.1 — Completed and accepted on 2026-08-31
Final-D.1 accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Authoritative strategy: docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md
Migration: prisma/migrations/20260831135000_final_d_2_additional_charge_persistence_foundation/migration.sql
Next planned subphase after acceptance: Final-D.3 — Admin charge management and payment-request creation
Phase 13: Not started
```

## Purpose

Final-D.2 introduces the durable persistence and typed domain foundation required by the accepted
Final-D.1 contract without activating ancillary-charge collection behavior.

After D.2 is applied:

```text
- no AdditionalCharge is created automatically
- no GuestPaymentRequest is created automatically
- no Payment is reclassified or created automatically
- no EmailNotification is created automatically
- Reservation.total and pricingSnapshot remain unchanged
- the Final-A stay-payment/refund pool remains unchanged
- the Final-C pricing engine remains unchanged
- the current Tilopay checkout has no ADDITIONAL_CHARGE runtime branch yet
```

D.3 owns protected admin charge/request creation. D.4 owns the private guest link and Tilopay
collection branch. D.5 owns ancillary refunds and financial-summary activation. D.6 owns email and
operational UX/history.

---

# 1. New Domain Enums

D.2 adds three new PostgreSQL/Prisma enum types.

## AdditionalChargeCategory

```text
CLEANING
DAMAGE
TRANSPORT
LATE_CHECKOUT
EXTRA_SERVICE
OTHER
```

These values are internal domain identifiers. Localized admin/guest labels remain a later UI/email
concern and must use the centralized ES/EN message catalogs.

## AdditionalChargeStatus

```text
PENDING
PAID
PARTIALLY_REFUNDED
REFUNDED
CANCELLED
```

There is intentionally no `PAYMENT_REQUESTED` status. Active/historical request membership is
represented by `GuestPaymentRequestItem` rows.

## GuestPaymentRequestStatus

```text
PENDING
PAID
EXPIRED
CANCELLED
```

There is intentionally no `SENT` status. Delivery state remains owned by `EmailNotification`.

---

# 2. Existing Enum Extensions

The migration adds only the values required by the frozen D.1 contract:

```text
PaymentPurpose.ADDITIONAL_CHARGE
PaymentSubmissionSource.ADDITIONAL_CHARGE
RefundAuthorizationType.ADDITIONAL_CHARGE
EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED
```

Existing rows retain their existing enum values. The migration performs no UPDATE or backfill.

`ADDITIONAL_CHARGE_PAYMENT_REQUIRED` reserves the dedicated guest notification identity for D.6;
D.2 does not create or send that notification.

---

# 3. AdditionalCharge Persistence

Prisma model/table:

```text
AdditionalCharge
additional_charges
```

Persisted fields:

```text
id
reservationId
category
description                guest-visible immutable description after historical request use
internalNote                optional admin-only note
amount                      DECIMAL(10,2)
currency                    USD
status
createdByAdminId
cancelledAt
createdAt
updatedAt
```

Relations:

```text
Reservation -> AdditionalCharge[]
User -> createdAdditionalCharges
AdditionalCharge -> GuestPaymentRequestItem[]
AdditionalCharge -> AdditionalChargeRefundAllocation[]
```

Database checks enforce:

```text
description is not blank
amount > 0
currency = USD
```

The database does not attempt to encode the complete mutation lifecycle. D.3/D.5 must enforce the
accepted state machine transactionally because whether a PENDING charge was historically requested
requires relation-state inspection.

---

# 4. GuestPaymentRequest Persistence

Prisma model/table:

```text
GuestPaymentRequest
guest_payment_requests
```

Persisted fields:

```text
id
reservationId
status
totalAmount                 DECIMAL(10,2)
currency                    USD
accessTokenHash             unique SHA-256 hex lookup value
accessTokenEncrypted        server-side encrypted recoverable token envelope
expiresAt
createdByAdminId
clientRequestId             unique operation idempotency key
paidAt
cancelledAt
createdAt
updatedAt
```

Relations:

```text
Reservation -> GuestPaymentRequest[]
User -> createdGuestPaymentRequests
GuestPaymentRequest -> GuestPaymentRequestItem[]
GuestPaymentRequest -> optional one-to-one Payment
GuestPaymentRequest -> EmailNotification[]
```

Database checks enforce:

```text
totalAmount > 0
currency = USD
accessTokenHash length = 64
accessTokenEncrypted is not blank
clientRequestId is not blank
expiresAt > createdAt
```

D.2 stores no token and generates no token. D.3 will own secure generation, SHA-256 hashing,
encryption and transactional request creation.

---

# 5. Immutable GuestPaymentRequestItem Evidence

Prisma model/table:

```text
GuestPaymentRequestItem
guest_payment_request_items
```

Each row links one request to one source charge and freezes guest-visible evidence:

```text
paymentRequestId
additionalChargeId
categorySnapshot
descriptionSnapshot
amountSnapshot
currencySnapshot
createdAt
```

Database invariants:

```text
one source charge may appear only once inside one request
snapshot description is not blank
snapshot amount > 0
snapshot currency = USD
```

A charge may still appear in a later historical request after a prior request is EXPIRED/CANCELLED;
therefore D.2 deliberately does not make `additionalChargeId` globally unique. D.3 must enforce the
single-active-request rule in a Serializable transaction.

---

# 6. Payment Relation and Financial Isolation

`Payment` gains:

```text
guestPaymentRequestId String? @unique
purpose may now be ADDITIONAL_CHARGE
```

The nullable unique FK preserves every historical Payment while reserving exactly one logical
Payment per GuestPaymentRequest.

D.2 does not create an ancillary Payment and does not alter existing provider references, amounts,
statuses or purposes.

The existing Final-A financial-summary query remains unchanged and continues selecting only:

```text
INITIAL_RESERVATION
LIFECYCLE_ADJUSTMENT
```

Therefore merely applying this migration cannot add ancillary money to:

```text
Reservation.total
currentStayValue
capturedStayPayments
remainingRefundableStayBalance
standard cancellation-policy base
```

D.5 remains responsible for activating the already-reserved ancillary summary fields separately.

---

# 7. Ancillary Refund-Allocation Persistence

Prisma model/table:

```text
AdditionalChargeRefundAllocation
additional_charge_refund_allocations
```

Persisted evidence:

```text
refundId
additionalChargeId
allocatedAmount
createdAt
```

A Refund may allocate to one or more charges, but one Refund cannot contain duplicate rows for the
same charge.

Database checks enforce:

```text
allocatedAmount > 0
```

D.2 does not create ancillary Refunds. D.5 must enforce that allocations belong to the exact
ADDITIONAL_CHARGE Payment Request, reserve only eligible charge balance and sum exactly to the
provider-level Refund amount.

---

# 8. EmailNotification Relation

`EmailNotification` gains one nullable relation:

```text
guestPaymentRequestId
```

Historical notification rows remain null. This relation is prospective evidence for D.6 so request
rendering/resend/history does not have to infer ownership from free-form metadata.

D.2 adds the enum value and relation only. It does not create a notification intent, template,
provider call or visible copy.

---

# 9. TypeScript Domain Foundation

D.2 adds:

```text
types/additional-charge.ts
```

It freezes reusable internal constants/types for:

```text
USD ancillary currency
168-hour / 7-day request expiry
accepted charge categories
accepted charge statuses
accepted request statuses
immutable request item/request snapshot shapes in integer cents
```

These are internal domain types, not localized display copy and not a public credential format.

---

# 10. Migration Safety

Migration:

```text
prisma/migrations/20260831135000_final_d_2_additional_charge_persistence_foundation/migration.sql
```

Properties:

```text
- one new additive migration; no historical migration is modified
- no UPDATE of Reservation, Payment, Refund or EmailNotification rows
- no INSERT of charge/request/payment/refund/email data
- no ancillary seed data
- no Reservation.total mutation
- no pricingSnapshot mutation
- no Payment purpose backfill
- no Refund authorization backfill
- existing Payment/EmailNotification relations remain nullable
- new ownership/history FKs use RESTRICT where hard deletion would destroy financial evidence
- EmailNotification request FK uses SET NULL consistently with existing optional notification links
- no provider/environment/scheduler/Production changes
```

The four new business tables begin empty.

---

# 11. Runtime Boundary After Migration

D.2 intentionally does not modify:

```text
Tilopay SDK session branching
Tilopay redirect/consult/OrderHash processing
reservation confirmation
date-change/stay-extension completion
Final-A financial summary calculations
refund authorization/reconciliation runtime
admin Reservation Financial UI
public/private guest payment-request route
email templates/orchestration
messages/es.ts
messages/en.ts
cron registry
Production infrastructure
```

Having the new enum/table capability in Prisma must not activate behavior before the owning
subphase.

---

# 12. Local/Test Validation and Rollout Order

Local and Hosted Test intentionally share the developer-owned Supabase database. Apply this
migration once to that shared database after copying the complete D.2 package.

Recommended gate:

```text
1. Copy the complete D.2 package into the repository.
2. Run Prisma format, generation and validation.
3. Confirm migration status before deployment.
4. Apply the one pending D.2 migration to the shared Local/Test database.
5. Confirm migration status is clean afterward.
6. Verify all four new tables begin empty.
7. Verify existing Payment/EmailNotification request links remain null.
8. Verify no existing Payment/Refund/EmailNotification row was reclassified.
9. Run Final-A, Final-B and Final-C permanent regression gates.
10. Run lint/build/diff validation.
11. Commit only after every gate passes.
```

Commands:

```bash
npm run db:format
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:migrate:status
npm run final-a:validate
npm run final-b:validate
npm run final-c:validate
npm run lint
npm run build
git diff --check
```

Expected database verification queries after migration:

```sql
SELECT COUNT(*) AS additional_charge_count
FROM trp_booking.additional_charges;

SELECT COUNT(*) AS payment_request_count
FROM trp_booking.guest_payment_requests;

SELECT COUNT(*) AS payment_request_item_count
FROM trp_booking.guest_payment_request_items;

SELECT COUNT(*) AS ancillary_refund_allocation_count
FROM trp_booking.additional_charge_refund_allocations;

SELECT COUNT(*) AS linked_existing_payments
FROM trp_booking.payments
WHERE guest_payment_request_id IS NOT NULL;

SELECT COUNT(*) AS linked_existing_notifications
FROM trp_booking.email_notifications
WHERE guest_payment_request_id IS NOT NULL;

SELECT COUNT(*) AS ancillary_payments
FROM trp_booking.payments
WHERE purpose = 'ADDITIONAL_CHARGE';

SELECT COUNT(*) AS ancillary_refunds
FROM trp_booking.refunds
WHERE authorization_type = 'ADDITIONAL_CHARGE';
```

For D.2 acceptance every count should be `0`. D.2 intentionally supplies no test/business data.

---

# 13. D.2 Acceptance Matrix

Final-D.2 remains **In progress** until the owner validates the migration and technical gates.

```text
[ ] Prisma schema formats without unexpected changes
[ ] Prisma Client generation passes
[ ] Prisma schema validation passes
[ ] D.2 migration is the only pending migration before deployment
[ ] migration deploy succeeds on the shared Local/Test database
[ ] migration status reports no pending migrations afterward
[ ] additional_charges exists and begins empty
[ ] guest_payment_requests exists and begins empty
[ ] guest_payment_request_items exists and begins empty
[ ] additional_charge_refund_allocations exists and begins empty
[ ] database rejects blank charge/request-item descriptions
[ ] database rejects zero/negative charge, request, item and allocation amounts
[ ] database rejects non-USD charge/request/item currency
[ ] request access-token hash and idempotency uniqueness exist
[ ] one GuestPaymentRequest can own at most one Payment
[ ] one request cannot snapshot the same charge twice
[ ] one Refund cannot allocate twice to the same charge
[ ] historical Payments retain their existing purpose/status/amount/provider evidence
[ ] historical Refunds retain their existing authorization/status/amount evidence
[ ] historical EmailNotification rows remain valid with null request relation
[ ] Reservation.total and pricingSnapshot remain unchanged
[ ] no runtime ancillary charge/request/payment/email behavior is activated
[ ] Final-A regression gate passes
[ ] Final-B regression gate passes
[ ] Final-C regression gate passes
[ ] lint passes
[ ] build passes
[ ] git diff --check passes
[ ] Test remains TRP_ENVIRONMENT=test with zero Vercel cron registrations
[ ] Phase 13 remains Not started
```

After these checks pass and the owner accepts the result, D.2 may be marked Completed and accepted.
Only then may Final-D.3 begin.

---

# 14. Current Decision

```text
Final-D — In progress
Final-D.1 — Completed and accepted on 2026-08-31 at 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 — In progress; implementation prepared for Local/Test migration validation
Final-D.3 — Not started
Final-E — Not started
Phase 13 — Not started
```
