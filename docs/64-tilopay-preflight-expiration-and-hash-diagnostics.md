# 64 — Tilopay Preflight, Expiration Guard, and OrderHash Diagnostics

## Status

Prepared during Phase 9 sandbox testing.

## Context

Manual testing found three related issues:

```text
1. A guest could prepare a Tilopay SDK session, let the pending reservation expire, and still press Pay.
2. The payment callback could still confirm an EXPIRED reservation after Tilopay approved the transaction.
3. Tilopay /consult may return orderNumber with a commerce prefix, for example TPC028599-TRP-..., while TRP Booking stores TRP-... as Payment.providerReference.
```

## Fixes

### 1. Server-side preflight before `Tilopay.startPayment()`

A new endpoint was added:

```text
POST /api/payments/tilopay/preflight
```

It validates, immediately before calling `Tilopay.startPayment()`:

```text
- Reservation still exists.
- Reservation.status is still PENDING_PAYMENT.
- Reservation.expiresAt is still in the future.
- Availability is still valid.
- The current quote still matches the stored reservation totals.
- The pending Payment belongs to the reservation.
- The pending Payment amount/currency still matches the current reservation total.
```

If any validation fails, the frontend does not call Tilopay.

### 2. Prevent `EXPIRED -> CONFIRMED`

`confirmReservationAfterApprovedPayment()` no longer confirms EXPIRED reservations.

It now confirms only when:

```text
Reservation.status = PENDING_PAYMENT
Reservation.expiresAt > now
Payment.status = APPROVED
```

If Tilopay approves a payment after the local reservation expired, the payment remains auditable and the reservation is not automatically confirmed.

### 3. OrderHash diagnostics

OrderHash verification now records diagnostic metadata without logging secrets or expected hashes:

```text
validation.orderHash
validation.orderHashMatchedVariant
validation.orderHashAttemptedVariants
```

Candidate variants include:

```text
payment_provider_reference
redirect_order_number
consult_order_number
```

This helps identify which external order id format Tilopay uses in sandbox without exposing API keys, passwords, card data, or generated hashes.

### 4. Tilopay /consult orderNumber prefix

The consult comparison now accepts both:

```text
TRP-<paymentId>
TPC028599-TRP-<paymentId>
```

This keeps strict matching while accepting the commerce-prefixed order number returned by Tilopay.

## Security notes

Sandbox may still allow OrderHash mismatch when consult validation succeeds, but production remains strict.

Production behavior:

```text
OrderHash invalid = Payment FAILED = Reservation not confirmed
```

## Validation

```bash
npm run build
```

Manual tests:

```text
1. Happy path:
   PENDING_PAYMENT active -> preflight OK -> Tilopay approved -> Payment APPROVED -> Reservation CONFIRMED.

2. Expired before Pay:
   Prepare SDK -> let hold expire -> run local expiration endpoint -> click Pay.
   Expected: preflight rejects; Tilopay does not start.

3. Expired before callback:
   Payment APPROVED but reservation already EXPIRED.
   Expected: Payment remains auditable; Reservation is not CONFIRMED.

4. Quote changed before Pay:
   Prepare SDK -> change amount/disponibility -> click Pay.
   Expected: preflight rejects; Tilopay does not start.

5. Consult order prefix:
   /consult orderNumber can be TPC...-TRP-...
   Expected: no TILOPAY_CONSULT_MISMATCH solely because of the prefix.
```
