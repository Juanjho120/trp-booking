# 83 — Reservation and Payment Detail Views

## Phase

```text
Phase: Phase 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.5 Reservation and payment detail views
Status: Implementation prepared; pending local validation and commit
Base commit: c5b15197bba6d2fce84a15649944ebd013a0fdfc
```

## Goal

Add protected, read-only detail views for direct reservations and payment attempts without changing reservation state, payment state, availability, pricing, email delivery, or PMS boundaries.

The existing searchable and paginated list routes remain the operational entry points:

```text
/admin/reservations
/admin/payments
```

Each list now links to its corresponding detail route:

```text
/admin/reservations/[reservationId]
/admin/payments/[paymentId]
```

## Reservation detail

The reservation detail loader reads the existing reservation, accommodation, and payment-attempt records server-side.

The protected page shows:

```text
- Reservation ID and localized reservation status
- Accommodation and guest identity
- Guest email, optional phone, and optional country
- Check-in, check-out, guest count, and optional arrival-time estimate
- Subtotal, cleaning fee, taxes, discounts, total, and currency
- Hold expiration when present
- Reservation creation timestamp
- All payment attempts ordered from newest to oldest
- Payment status, amount, provider order reference, and creation timestamp
- Navigation to each payment detail
```

No reservation mutation is introduced.

## Payment detail

The payment detail loader reads the existing payment, parent reservation, and related Tilopay SDK client-event records server-side.

The protected page shows:

```text
- Payment ID and localized payment status
- Amount and currency
- Safe order and transaction references
- Payment creation timestamp
- Safe diagnostic summary extracted from Payment.rawPayload
- Parent reservation summary and navigation to its detail
- Related SDK client events ordered from newest to oldest
- Event type, environment, safe SDK message, and timestamp
```

The UI never renders `Payment.rawPayload` or `PaymentClientEvent.sdkPayload` as raw JSON.

## Safe diagnostic boundary

`lib/admin/payment-diagnostics.ts` centralizes the same allowlisted diagnostic extraction used by the existing admin payment review.

Only these bounded fields may reach the detail UI:

```text
providerCode
providerMessage
authorization
providerOrder
tilopayTransaction
orderHashStatus
```

Each extracted value is normalized to a string and truncated to 180 characters.

The detail views must never expose:

```text
- Card number
- CVV
- Expiration date
- Tokenized card data
- Raw provider payloads
- Raw SDK payloads
- Private Tilopay credentials
```

## Read-only boundary

Subphase 9.11.5 intentionally does not add:

```text
- Manual reservation confirmation
- Reservation cancellation
- Refund or partial-refund processing
- Guest date changes
- Stay extensions
- Payment status overrides
- Calendar mutations
- Email delivery
- PMS behavior
```

Payment-driven confirmation remains unchanged:

```text
Validated APPROVED payment
-> idempotent reservation confirmation service
-> Reservation.status = CONFIRMED
```

## Database impact

```text
No Prisma schema change.
No migration.
No seed change.
```

The implementation only reads existing records from:

```text
reservations
payments
payment_client_events
properties
```

## Files

```text
app/admin/reservations/[reservationId]/page.tsx
app/admin/payments/[paymentId]/page.tsx
features/admin/components/admin-reservation-detail-page.tsx
features/admin/components/admin-payment-detail-page.tsx
features/admin/components/admin-reservations-page.tsx
features/admin/components/admin-payments-page.tsx
features/admin/index.ts
lib/admin/reservation-detail.ts
lib/admin/payment-detail.ts
lib/admin/payment-diagnostics.ts
lib/admin/index.ts
types/admin-reservation-detail.ts
types/admin-payment-detail.ts
docs/83-reservation-and-payment-detail-views.md
```

## Copy and localization

No new visible copy source is introduced.

The detail and list components reuse centralized bilingual values from:

```text
messages/es.ts
messages/en.ts
```

This preserves the project rule that public-facing and admin-facing copy must not be hardcoded in feature components.

## Validation

Run after copying the delivery files into the repository:

```text
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Manual validation:

```text
1. Sign in with an authorized admin account.
2. Open /admin/reservations and verify each result has a detail action.
3. Open a reservation detail and verify guest, stay, pricing, status, and payment attempts.
4. Follow a payment attempt from the reservation detail.
5. Open /admin/payments and verify payments and SDK events have a detail action.
6. Open a payment detail and verify safe diagnostics, parent reservation, and SDK events.
7. Follow the parent reservation link from the payment detail.
8. Switch between Spanish and English and verify visible copy and statuses update.
9. Verify unknown reservation and payment IDs render the protected not-found flow.
10. Verify no raw JSON, card data, mutation button, confirmation action, cancellation action, or refund action appears.
```

## Next subphase

After local acceptance and commit:

```text
9.11.6 — Phase 9.11 validation and documentation closure
```
